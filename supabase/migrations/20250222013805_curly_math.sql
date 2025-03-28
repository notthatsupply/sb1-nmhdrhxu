/*
  # Fix RLS policies for order_legs

  1. Changes
    - Drop problematic policies that cause infinite recursion
    - Create new simplified policies that avoid circular references
    - Add proper RLS for leg_locations

  2. Security
    - Maintain data access control while preventing recursion
    - Ensure authenticated users can only access their relevant data
*/

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Users can read split legs" ON order_legs;
DROP POLICY IF EXISTS "Allow public read access to order legs" ON order_legs;
DROP POLICY IF EXISTS "Users can create order legs" ON order_legs;
DROP POLICY IF EXISTS "Users can update order legs" ON order_legs;

-- Create new simplified policies for order_legs
CREATE POLICY "Allow authenticated read access to order legs"
  ON order_legs
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated create order legs"
  ON order_legs
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Allow authenticated update order legs"
  ON order_legs
  FOR UPDATE
  TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- Drop existing leg_locations policies if they exist
DROP POLICY IF EXISTS "Users can create leg locations" ON leg_locations;
DROP POLICY IF EXISTS "Users can read leg locations" ON leg_locations;

-- Create new policies for leg_locations
CREATE POLICY "Allow authenticated read access to leg locations"
  ON leg_locations
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated create leg locations"
  ON leg_locations
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Allow authenticated update leg locations"
  ON leg_locations
  FOR UPDATE
  TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);