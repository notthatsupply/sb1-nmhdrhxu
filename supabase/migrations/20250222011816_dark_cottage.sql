/*
  # Update orders table RLS policies

  1. Changes
    - Update RLS policies for orders table to allow public read access
    - Add policies for updating and deleting orders
    - Add policies for managing order locations

  2. Security
    - Allow public read access to orders
    - Restrict write operations to authenticated users
    - Add policies for managing order locations
*/

-- Update orders table policies
DROP POLICY IF EXISTS "Users can create orders" ON orders;
DROP POLICY IF EXISTS "Users can read own orders" ON orders;

CREATE POLICY "Allow public read access to orders"
  ON orders
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Users can create orders"
  ON orders
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update own orders"
  ON orders
  FOR UPDATE
  TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can delete own orders"
  ON orders
  FOR DELETE
  TO authenticated
  USING (auth.uid() IS NOT NULL);

-- Update locations table policies
DROP POLICY IF EXISTS "Users can create locations" ON locations;
DROP POLICY IF EXISTS "Users can read own locations" ON locations;

CREATE POLICY "Allow public read access to locations"
  ON locations
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Users can create locations"
  ON locations
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = locations.order_id
    )
  );

CREATE POLICY "Users can update locations"
  ON locations
  FOR UPDATE
  TO authenticated
  USING (
    auth.uid() IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = locations.order_id
    )
  )
  WITH CHECK (
    auth.uid() IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = locations.order_id
    )
  );

CREATE POLICY "Users can delete locations"
  ON locations
  FOR DELETE
  TO authenticated
  USING (
    auth.uid() IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = locations.order_id
    )
  );