/*
  # Add support for order legs and manifests

  This migration adds support for splitting orders into multiple legs, each with their own
  pickup and delivery locations.

  1. New Tables
    - `order_legs`: Stores individual legs of a split order
      - `id` (uuid, primary key)
      - `order_id` (references orders)
      - `sequence_number` (integer)
      - `status` (text)
      - `created_at` (timestamp)
      
    - `leg_locations`: Stores locations for each leg
      - `id` (uuid, primary key) 
      - `leg_id` (references order_legs)
      - `type` (pickup/delivery)
      - `name` (text)
      - `street_address` (text)
      - `city_id` (references cities)
      - `date` (timestamp)
      - `time` (time)
      - `special_instructions` (text)
      - `sequence_number` (integer)

  2. Security
    - Enable RLS on new tables
    - Add policies for authenticated users
*/

-- Create order_legs table
CREATE TABLE order_legs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES orders(id) ON DELETE CASCADE,
  sequence_number integer NOT NULL,
  status text NOT NULL CHECK (status IN ('pending', 'assigned', 'in_progress', 'completed', 'cancelled')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT order_legs_order_id_sequence_number_key UNIQUE (order_id, sequence_number)
);

-- Create leg_locations table
CREATE TABLE leg_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  leg_id uuid REFERENCES order_legs(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('pickup', 'delivery')),
  name text NOT NULL,
  street_address text NOT NULL,
  city_id uuid REFERENCES cities(id),
  date timestamptz NOT NULL,
  time time NOT NULL,
  special_instructions text,
  sequence_number integer NOT NULL,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT leg_locations_leg_id_type_sequence_number_key UNIQUE (leg_id, type, sequence_number)
);

-- Enable RLS
ALTER TABLE order_legs ENABLE ROW LEVEL SECURITY;
ALTER TABLE leg_locations ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can create order legs"
  ON order_legs
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_legs.order_id
    )
  );

CREATE POLICY "Users can read order legs"
  ON order_legs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_legs.order_id
    )
  );

CREATE POLICY "Users can create leg locations"
  ON leg_locations
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM order_legs
      WHERE order_legs.id = leg_locations.leg_id
    )
  );

CREATE POLICY "Users can read leg locations"
  ON leg_locations
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM order_legs
      WHERE order_legs.id = leg_locations.leg_id
    )
  );

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_order_legs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER trigger_update_order_legs_updated_at
  BEFORE UPDATE ON order_legs
  FOR EACH ROW
  EXECUTE FUNCTION update_order_legs_updated_at();