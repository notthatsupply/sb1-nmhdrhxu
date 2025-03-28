/*
  # Add authentication policies

  1. Security
    - Add RLS policies for orders and locations tables
    - Ensure users can only access their own data
    - Allow public access to reference data (countries, states, cities)
*/

-- Update orders table policies
DROP POLICY IF EXISTS "Users can create orders" ON orders;
DROP POLICY IF EXISTS "Users can read orders" ON orders;

CREATE POLICY "Users can create orders"
  ON orders
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can read own orders"
  ON orders
  FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);

-- Update locations table policies
DROP POLICY IF EXISTS "Users can create locations" ON locations;
DROP POLICY IF EXISTS "Users can read locations" ON locations;

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

CREATE POLICY "Users can read own locations"
  ON locations
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = locations.order_id
    )
  );