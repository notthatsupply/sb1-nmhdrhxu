/*
  # Create orders schema

  1. New Tables
    - `orders`
      - Primary order information including customer details and rates
    - `locations`
      - Stores both pickup and delivery locations
      - Links to orders table
    - `countries`
      - List of supported countries (US and Canada)
    - `states`
      - States/provinces for each country
    - `cities`
      - Cities for each state/province

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users
*/

-- Countries table
CREATE TABLE IF NOT EXISTS countries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  code text NOT NULL UNIQUE,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE countries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to countries"
  ON countries
  FOR SELECT
  TO public
  USING (true);

-- States table
CREATE TABLE IF NOT EXISTS states (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  country_id uuid REFERENCES countries(id) ON DELETE CASCADE,
  name text NOT NULL,
  code text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(country_id, code)
);

ALTER TABLE states ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to states"
  ON states
  FOR SELECT
  TO public
  USING (true);

-- Cities table
CREATE TABLE IF NOT EXISTS cities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  state_id uuid REFERENCES states(id) ON DELETE CASCADE,
  name text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(state_id, name)
);

ALTER TABLE cities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to cities"
  ON cities
  FOR SELECT
  TO public
  USING (true);

-- Orders table
CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_name text NOT NULL,
  customer_address text NOT NULL,
  contact_person text NOT NULL,
  phone_number text NOT NULL,
  load_tender_number text NOT NULL UNIQUE,
  rate decimal(10,2) NOT NULL,
  currency text NOT NULL CHECK (currency IN ('CAD', 'USD')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can create orders"
  ON orders
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can read orders"
  ON orders
  FOR SELECT
  TO authenticated
  USING (true);

-- Locations table
CREATE TABLE IF NOT EXISTS locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES orders(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('pickup', 'delivery')),
  name text NOT NULL,
  street_address text NOT NULL,
  city_id uuid REFERENCES cities(id),
  date timestamptz NOT NULL,
  time time NOT NULL,
  reference_number text,
  commodity text NOT NULL,
  weight numeric NOT NULL,
  special_instructions text,
  created_at timestamptz DEFAULT now(),
  sequence_number integer NOT NULL,
  UNIQUE(order_id, type, sequence_number)
);

ALTER TABLE locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can create locations"
  ON locations
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can read locations"
  ON locations
  FOR SELECT
  TO authenticated
  USING (true);

-- Insert countries
INSERT INTO countries (name, code) VALUES
  ('United States', 'US'),
  ('Canada', 'CA')
ON CONFLICT (code) DO NOTHING;

-- Insert US states
DO $$
DECLARE
  us_id uuid;
BEGIN
  SELECT id INTO us_id FROM countries WHERE code = 'US';
  
  INSERT INTO states (country_id, name, code) VALUES
    (us_id, 'Alabama', 'AL'),
    (us_id, 'Alaska', 'AK'),
    (us_id, 'Arizona', 'AZ'),
    (us_id, 'Arkansas', 'AR'),
    (us_id, 'California', 'CA'),
    (us_id, 'Colorado', 'CO'),
    (us_id, 'Connecticut', 'CT'),
    (us_id, 'Delaware', 'DE'),
    (us_id, 'Florida', 'FL'),
    (us_id, 'Georgia', 'GA'),
    (us_id, 'Hawaii', 'HI'),
    (us_id, 'Idaho', 'ID'),
    (us_id, 'Illinois', 'IL'),
    (us_id, 'Indiana', 'IN'),
    (us_id, 'Iowa', 'IA'),
    (us_id, 'Kansas', 'KS'),
    (us_id, 'Kentucky', 'KY'),
    (us_id, 'Louisiana', 'LA'),
    (us_id, 'Maine', 'ME'),
    (us_id, 'Maryland', 'MD'),
    (us_id, 'Massachusetts', 'MA'),
    (us_id, 'Michigan', 'MI'),
    (us_id, 'Minnesota', 'MN'),
    (us_id, 'Mississippi', 'MS'),
    (us_id, 'Missouri', 'MO'),
    (us_id, 'Montana', 'MT'),
    (us_id, 'Nebraska', 'NE'),
    (us_id, 'Nevada', 'NV'),
    (us_id, 'New Hampshire', 'NH'),
    (us_id, 'New Jersey', 'NJ'),
    (us_id, 'New Mexico', 'NM'),
    (us_id, 'New York', 'NY'),
    (us_id, 'North Carolina', 'NC'),
    (us_id, 'North Dakota', 'ND'),
    (us_id, 'Ohio', 'OH'),
    (us_id, 'Oklahoma', 'OK'),
    (us_id, 'Oregon', 'OR'),
    (us_id, 'Pennsylvania', 'PA'),
    (us_id, 'Rhode Island', 'RI'),
    (us_id, 'South Carolina', 'SC'),
    (us_id, 'South Dakota', 'SD'),
    (us_id, 'Tennessee', 'TN'),
    (us_id, 'Texas', 'TX'),
    (us_id, 'Utah', 'UT'),
    (us_id, 'Vermont', 'VT'),
    (us_id, 'Virginia', 'VA'),
    (us_id, 'Washington', 'WA'),
    (us_id, 'West Virginia', 'WV'),
    (us_id, 'Wisconsin', 'WI'),
    (us_id, 'Wyoming', 'WY')
  ON CONFLICT (country_id, code) DO NOTHING;
END $$;

-- Insert Canadian provinces
DO $$
DECLARE
  ca_id uuid;
BEGIN
  SELECT id INTO ca_id FROM countries WHERE code = 'CA';
  
  INSERT INTO states (country_id, name, code) VALUES
    (ca_id, 'Alberta', 'AB'),
    (ca_id, 'British Columbia', 'BC'),
    (ca_id, 'Manitoba', 'MB'),
    (ca_id, 'New Brunswick', 'NB'),
    (ca_id, 'Newfoundland and Labrador', 'NL'),
    (ca_id, 'Nova Scotia', 'NS'),
    (ca_id, 'Ontario', 'ON'),
    (ca_id, 'Prince Edward Island', 'PE'),
    (ca_id, 'Quebec', 'QC'),
    (ca_id, 'Saskatchewan', 'SK'),
    (ca_id, 'Northwest Territories', 'NT'),
    (ca_id, 'Nunavut', 'NU'),
    (ca_id, 'Yukon', 'YT')
  ON CONFLICT (country_id, code) DO NOTHING;
END $$;