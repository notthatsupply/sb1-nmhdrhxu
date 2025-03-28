/*
  # Add order number generation with safety checks

  1. Changes
    - Add order_number column to orders table
    - Create sequence for generating order numbers
    - Add function to generate order numbers in format TAP-YY-XXXXXX
    - Add trigger to automatically set order number on insert
    - Add safety checks to prevent errors

  2. Security
    - No changes to RLS policies needed
*/

-- Safety check for existing sequence
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_sequences WHERE schemaname = 'public' AND sequencename = 'order_number_seq') THEN
    CREATE SEQUENCE order_number_seq START WITH 1;
  END IF;
END $$;

-- Safety check for order_number column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'orders' 
    AND column_name = 'order_number'
  ) THEN
    ALTER TABLE orders ADD COLUMN order_number text;
  END IF;
END $$;

-- Make order_number NOT NULL with a default
ALTER TABLE orders 
  ALTER COLUMN order_number SET NOT NULL,
  ALTER COLUMN order_number SET DEFAULT '';

-- Add unique constraint if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'orders_order_number_key'
  ) THEN
    ALTER TABLE orders ADD CONSTRAINT orders_order_number_key UNIQUE (order_number);
  END IF;
END $$;

-- Drop existing function and trigger if they exist
DROP TRIGGER IF EXISTS trigger_set_order_number ON orders;
DROP FUNCTION IF EXISTS set_order_number();
DROP FUNCTION IF EXISTS generate_order_number();

-- Create function to generate order number
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS text AS $$
DECLARE
  year text;
  sequence_number text;
  result text;
BEGIN
  -- Get current year in YY format
  year := to_char(CURRENT_DATE, 'YY');
  
  -- Get next sequence number with leading zeros
  sequence_number := to_char(nextval('order_number_seq'), 'FM000000');
  
  -- Combine into final format
  result := 'TAP-' || year || '-' || sequence_number;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Create trigger function
CREATE OR REPLACE FUNCTION set_order_number()
RETURNS TRIGGER AS $$
BEGIN
  -- Only set order number if it's not already set
  IF NEW.order_number IS NULL OR NEW.order_number = '' THEN
    NEW.order_number := generate_order_number();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER trigger_set_order_number
  BEFORE INSERT ON orders
  FOR EACH ROW
  EXECUTE FUNCTION set_order_number();