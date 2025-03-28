/*
  # Add manifests and carrier fields

  This migration adds support for manifests and carrier information.

  1. New Tables
    - `manifests`
      - `id` (uuid, primary key)
      - `number` (text, unique)
      - `carrier_id` (uuid)
      - `status` (text)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
  
  2. Updates
    - Add manifest_id to order_legs table
    - Add margin fields to order_legs
    - Add carrier fields to order_legs

  3. Security
    - Enable RLS on manifests table
    - Add policies for authenticated users
*/

-- Safety check for existing objects
DO $$ 
BEGIN
  -- Drop existing functions if they exist
  DROP FUNCTION IF EXISTS generate_manifest_number() CASCADE;
  DROP FUNCTION IF EXISTS set_manifest_number() CASCADE;
  DROP FUNCTION IF EXISTS update_manifests_updated_at() CASCADE;
END $$;

-- Create manifests table if it doesn't exist
CREATE TABLE IF NOT EXISTS manifests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  number text NOT NULL UNIQUE DEFAULT '',
  carrier_id uuid,
  status text NOT NULL CHECK (status IN ('pending', 'assigned', 'in_progress', 'completed', 'cancelled')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS on manifests
ALTER TABLE manifests ENABLE ROW LEVEL SECURITY;

-- Create manifest policies
CREATE POLICY "Users can create manifests"
  ON manifests
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can read manifests"
  ON manifests
  FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);

-- Add fields to order_legs if they don't exist
DO $$
BEGIN
  -- Add manifest_id if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'order_legs' AND column_name = 'manifest_id'
  ) THEN
    ALTER TABLE order_legs ADD COLUMN manifest_id uuid REFERENCES manifests(id);
  END IF;

  -- Add estimated_margin if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'order_legs' AND column_name = 'estimated_margin'
  ) THEN
    ALTER TABLE order_legs ADD COLUMN estimated_margin decimal(10,2);
  END IF;

  -- Add actual_margin if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'order_legs' AND column_name = 'actual_margin'
  ) THEN
    ALTER TABLE order_legs ADD COLUMN actual_margin decimal(10,2);
  END IF;

  -- Add carrier_rate if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'order_legs' AND column_name = 'carrier_rate'
  ) THEN
    ALTER TABLE order_legs ADD COLUMN carrier_rate decimal(10,2);
  END IF;

  -- Add carrier_currency if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'order_legs' AND column_name = 'carrier_currency'
  ) THEN
    ALTER TABLE order_legs ADD COLUMN carrier_currency text CHECK (carrier_currency IN ('CAD', 'USD'));
  END IF;

  -- Add carrier_id if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'order_legs' AND column_name = 'carrier_id'
  ) THEN
    ALTER TABLE order_legs ADD COLUMN carrier_id uuid;
  END IF;
END $$;

-- Create manifest updated_at trigger
CREATE OR REPLACE FUNCTION update_manifests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_manifests_updated_at
  BEFORE UPDATE ON manifests
  FOR EACH ROW
  EXECUTE FUNCTION update_manifests_updated_at();

-- Create manifest number sequence
CREATE SEQUENCE IF NOT EXISTS manifest_number_seq;

-- Function to generate manifest number
CREATE OR REPLACE FUNCTION generate_manifest_number()
RETURNS text AS $$
DECLARE
  year text;
  sequence_number text;
BEGIN
  year := to_char(CURRENT_DATE, 'YY');
  sequence_number := to_char(nextval('manifest_number_seq'), 'FM000000');
  RETURN 'MAN-' || year || '-' || sequence_number;
END;
$$ LANGUAGE plpgsql;

-- Function to set manifest number
CREATE OR REPLACE FUNCTION set_manifest_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.number IS NULL OR NEW.number = '' THEN
    NEW.number := generate_manifest_number();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for manifest number
CREATE TRIGGER trigger_set_manifest_number
  BEFORE INSERT ON manifests
  FOR EACH ROW
  EXECUTE FUNCTION set_manifest_number();