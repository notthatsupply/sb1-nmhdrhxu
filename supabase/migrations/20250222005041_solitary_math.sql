/*
  # Fix order legs policies

  This migration ensures the order legs and locations tables have the correct policies
  by first dropping any existing policies and then recreating them.

  1. Policy Updates
    - Drop existing policies if they exist
    - Recreate policies for order legs and locations
    - Ensure proper access control for authenticated users
*/

-- Drop existing policies if they exist
DO $$ 
BEGIN
  -- Drop order_legs policies
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'order_legs' 
    AND policyname = 'Users can create order legs'
  ) THEN
    DROP POLICY "Users can create order legs" ON order_legs;
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'order_legs' 
    AND policyname = 'Users can read order legs'
  ) THEN
    DROP POLICY "Users can read order legs" ON order_legs;
  END IF;

  -- Drop leg_locations policies
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'leg_locations' 
    AND policyname = 'Users can create leg locations'
  ) THEN
    DROP POLICY "Users can create leg locations" ON leg_locations;
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'leg_locations' 
    AND policyname = 'Users can read leg locations'
  ) THEN
    DROP POLICY "Users can read leg locations" ON leg_locations;
  END IF;
END $$;

-- Create RLS policies for order_legs
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

-- Create RLS policies for leg_locations
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