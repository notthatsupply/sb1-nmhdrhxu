/*
  # Add order number functionality
  
  1. Changes
    - Add order_number column to orders table
    - Add function to generate sequential order numbers
    - Add trigger to automatically generate order numbers
  
  2. Security
    - Maintain existing RLS policies
*/

-- Add order_number column
ALTER TABLE orders
ADD COLUMN order_number text NOT NULL UNIQUE DEFAULT '';

-- Create sequence for order numbers
CREATE SEQUENCE IF NOT EXISTS order_number_seq;

-- Function to generate order number
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS text AS $$
DECLARE
  year text;
  sequence_number text;
BEGIN
  year := to_char(CURRENT_DATE, 'YY');
  sequence_number := to_char(nextval('order_number_seq'), 'FM000000');
  RETURN 'TAP-' || year || '-' || sequence_number;
END;
$$ LANGUAGE plpgsql;

-- Trigger to set order number before insert
CREATE OR REPLACE FUNCTION set_order_number()
RETURNS TRIGGER AS $$
BEGIN
  NEW.order_number := generate_order_number();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_order_number
  BEFORE INSERT ON orders
  FOR EACH ROW
  EXECUTE FUNCTION set_order_number();