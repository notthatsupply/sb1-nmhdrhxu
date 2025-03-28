/*
  # Update manifest schema and policies

  1. Changes
    - Add contact fields to leg_locations table
    - Update RLS policies for manifests and order_legs

  2. Security
    - Allow public read access to manifests
    - Add policies for managing order legs
*/

-- Add contact fields to leg_locations
ALTER TABLE leg_locations
ADD COLUMN contact_name text,
ADD COLUMN contact_phone text;

-- Update manifest policies
DROP POLICY IF EXISTS "Users can create manifests" ON manifests;
DROP POLICY IF EXISTS "Users can read manifests" ON manifests;

CREATE POLICY "Allow public read access to manifests"
  ON manifests
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Users can create manifests"
  ON manifests
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update manifests"
  ON manifests
  FOR UPDATE
  TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- Update order_legs policies
DROP POLICY IF EXISTS "Users can create order legs" ON order_legs;
DROP POLICY IF EXISTS "Users can read order legs" ON order_legs;

CREATE POLICY "Allow public read access to order legs"
  ON order_legs
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Users can create order legs"
  ON order_legs
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_legs.order_id
    )
  );

CREATE POLICY "Users can update order legs"
  ON order_legs
  FOR UPDATE
  TO authenticated
  USING (
    auth.uid() IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_legs.order_id
    )
  )
  WITH CHECK (
    auth.uid() IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_legs.order_id
    )
  );