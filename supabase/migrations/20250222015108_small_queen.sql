/*
  # Add manifest type and driver fields

  1. New Fields
    - Add manifest_type to manifests table
    - Add driver_id and vehicle_id to manifests table
    - Add driver_payment_type and driver_rate to manifests table
    - Add trailer_id to manifests table

  2. New Tables
    - Create drivers table
    - Create vehicles table
    - Create trailers table

  3. Security
    - Enable RLS on new tables
    - Add policies for authenticated users
*/

-- Create drivers table
CREATE TABLE IF NOT EXISTS drivers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  license_number text NOT NULL,
  phone text NOT NULL,
  email text,
  status text NOT NULL CHECK (status IN ('active', 'inactive')) DEFAULT 'active',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create vehicles table
CREATE TABLE IF NOT EXISTS vehicles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  number text NOT NULL UNIQUE,
  type text NOT NULL,
  make text NOT NULL,
  model text NOT NULL,
  year integer NOT NULL,
  vin text NOT NULL UNIQUE,
  status text NOT NULL CHECK (status IN ('active', 'inactive', 'maintenance')) DEFAULT 'active',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create trailers table
CREATE TABLE IF NOT EXISTS trailers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  number text NOT NULL UNIQUE,
  type text NOT NULL,
  length numeric NOT NULL,
  capacity numeric NOT NULL,
  status text NOT NULL CHECK (status IN ('active', 'inactive', 'maintenance')) DEFAULT 'active',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add new fields to manifests table
ALTER TABLE manifests
ADD COLUMN manifest_type text NOT NULL CHECK (manifest_type IN ('pickup', 'delivery', 'dropoff')) DEFAULT 'pickup',
ADD COLUMN order_type text NOT NULL CHECK (order_type IN ('ltl', 'ftl')) DEFAULT 'ftl',
ADD COLUMN driver_id uuid REFERENCES drivers(id),
ADD COLUMN vehicle_id uuid REFERENCES vehicles(id),
ADD COLUMN trailer_id uuid REFERENCES trailers(id),
ADD COLUMN driver_payment_type text CHECK (driver_payment_type IN ('hourly', 'mileage')),
ADD COLUMN driver_rate decimal(10,2);

-- Enable RLS
ALTER TABLE drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE trailers ENABLE ROW LEVEL SECURITY;

-- Create policies for drivers
CREATE POLICY "Allow authenticated read access to drivers"
  ON drivers
  FOR SELECT
  TO authenticated
  USING (true);

-- Create policies for vehicles
CREATE POLICY "Allow authenticated read access to vehicles"
  ON vehicles
  FOR SELECT
  TO authenticated
  USING (true);

-- Create policies for trailers
CREATE POLICY "Allow authenticated read access to trailers"
  ON trailers
  FOR SELECT
  TO authenticated
  USING (true);

-- Insert sample data
INSERT INTO drivers (name, license_number, phone, email, status)
VALUES 
  ('John Smith', 'DL123456', '555-0101', 'john.smith@example.com', 'active'),
  ('Jane Doe', 'DL789012', '555-0102', 'jane.doe@example.com', 'active'),
  ('Bob Wilson', 'DL345678', '555-0103', 'bob.wilson@example.com', 'active')
ON CONFLICT DO NOTHING;

INSERT INTO vehicles (number, type, make, model, year, vin, status)
VALUES 
  ('TRK001', 'Tractor', 'Freightliner', 'Cascadia', 2022, 'VIN123456789', 'active'),
  ('TRK002', 'Tractor', 'Peterbilt', '579', 2021, 'VIN987654321', 'active'),
  ('TRK003', 'Tractor', 'Kenworth', 'T680', 2023, 'VIN456789123', 'active')
ON CONFLICT DO NOTHING;

INSERT INTO trailers (number, type, length, capacity, status)
VALUES 
  ('TRL001', 'Dry Van', 53, 45000, 'active'),
  ('TRL002', 'Reefer', 53, 43000, 'active'),
  ('TRL003', 'Flatbed', 48, 48000, 'active')
ON CONFLICT DO NOTHING;