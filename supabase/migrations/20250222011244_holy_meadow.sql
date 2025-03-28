/*
  # Add drop off stop type

  1. Changes
    - Update type check constraint in leg_locations table to include 'drop_off'
    - Add terminal_id column to leg_locations table for drop off locations
    - Create terminals table for company terminal locations
    - Add RLS policies for terminals table

  2. Security
    - Enable RLS on terminals table
    - Add policy for authenticated users to read terminals
*/

-- Create terminals table
CREATE TABLE IF NOT EXISTS terminals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  street_address text NOT NULL,
  city_id uuid REFERENCES cities(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS on terminals
ALTER TABLE terminals ENABLE ROW LEVEL SECURITY;

-- Create terminals policies
CREATE POLICY "Users can read terminals"
  ON terminals
  FOR SELECT
  TO authenticated
  USING (true);

-- Add terminal_id to leg_locations
ALTER TABLE leg_locations
ADD COLUMN terminal_id uuid REFERENCES terminals(id);

-- Update type check constraint
ALTER TABLE leg_locations
DROP CONSTRAINT leg_locations_type_check,
ADD CONSTRAINT leg_locations_type_check 
  CHECK (type IN ('pickup', 'delivery', 'drop_off'));