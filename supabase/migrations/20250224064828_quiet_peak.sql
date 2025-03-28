/*
  # Add Split Points Support

  1. New Tables
    - `split_points`
      - For tracking locations where orders are split
      - Supports GPS coordinates, physical locations, and terminal references
      - Includes validation constraints for different location types

  2. Changes
    - Add split point reference to order_legs
    - Add split reason tracking
    - Add indexes for performance

  3. Security
    - Enable RLS on split_points
    - Add policies for authenticated users
*/

-- Create split_points table
CREATE TABLE IF NOT EXISTS public.split_points (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type text NOT NULL CHECK (type IN ('gps', 'location', 'terminal')),
  latitude numeric,
  longitude numeric,
  street_address text,
  city_id uuid REFERENCES public.cities(id),
  terminal_id uuid REFERENCES public.terminals(id),
  created_at timestamptz DEFAULT now(),
  CONSTRAINT split_points_location_check CHECK (
    (type = 'gps' AND latitude IS NOT NULL AND longitude IS NOT NULL) OR
    (type = 'location' AND street_address IS NOT NULL AND city_id IS NOT NULL) OR
    (type = 'terminal' AND terminal_id IS NOT NULL)
  )
);

-- Enable RLS
ALTER TABLE public.split_points ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Allow authenticated read access to split points"
  ON public.split_points
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated create split points"
  ON public.split_points
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

-- Add split point reference to order_legs
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'order_legs' 
    AND column_name = 'split_point_id'
  ) THEN
    ALTER TABLE public.order_legs
    ADD COLUMN split_point_id uuid REFERENCES public.split_points(id),
    ADD COLUMN split_reason text;
  END IF;
END $$;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_order_legs_split_point_id 
ON public.order_legs(split_point_id);