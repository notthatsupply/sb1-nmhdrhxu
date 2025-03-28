/*
  # Add Split Leg Support

  1. New Fields
    - Add parent_leg_id to order_legs to track split relationships
    - Add split_sequence to order_legs for ordering split segments
    - Add split_notes for documenting split rationale

  2. Security
    - Update RLS policies to handle split legs
*/

-- Add fields for split leg support
ALTER TABLE order_legs
ADD COLUMN parent_leg_id uuid REFERENCES order_legs(id),
ADD COLUMN split_sequence integer,
ADD COLUMN split_notes text;

-- Create index for faster lookups of split legs
CREATE INDEX idx_order_legs_parent_leg_id ON order_legs(parent_leg_id);

-- Function to validate split leg sequence
CREATE OR REPLACE FUNCTION validate_split_leg_sequence()
RETURNS TRIGGER AS $$
BEGIN
  -- Only validate if this is a split leg
  IF NEW.parent_leg_id IS NOT NULL THEN
    -- Check if split_sequence is set
    IF NEW.split_sequence IS NULL THEN
      RAISE EXCEPTION 'Split legs must have a sequence number';
    END IF;
    
    -- Check for duplicate sequence numbers within the same parent
    IF EXISTS (
      SELECT 1 FROM order_legs
      WHERE parent_leg_id = NEW.parent_leg_id
      AND split_sequence = NEW.split_sequence
      AND id != NEW.id
    ) THEN
      RAISE EXCEPTION 'Duplicate split sequence number for parent leg';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for split leg validation
CREATE TRIGGER trigger_validate_split_leg_sequence
  BEFORE INSERT OR UPDATE ON order_legs
  FOR EACH ROW
  EXECUTE FUNCTION validate_split_leg_sequence();

-- Update RLS policies
CREATE POLICY "Users can read split legs"
  ON order_legs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_legs.order_id
      OR orders.id = (
        SELECT order_id FROM order_legs parent
        WHERE parent.id = order_legs.parent_leg_id
      )
    )
  );