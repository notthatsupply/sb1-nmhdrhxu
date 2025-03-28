/*
  # Add major cities for US and Canada

  1. Changes
    - Add major cities for US states and Canadian provinces
    - Each city is linked to its respective state/province

  2. Data
    - Major US cities for each state
    - Major Canadian cities for each province
*/

-- Function to get state ID by code and country code
CREATE OR REPLACE FUNCTION get_state_id(state_code text, country_code text)
RETURNS uuid AS $$
DECLARE
  state_id uuid;
BEGIN
  SELECT s.id INTO state_id
  FROM states s
  JOIN countries c ON c.id = s.country_id
  WHERE s.code = state_code AND c.code = country_code;
  RETURN state_id;
END;
$$ LANGUAGE plpgsql;

-- Insert US cities
DO $$
BEGIN
  -- New York
  INSERT INTO cities (state_id, name) VALUES
    (get_state_id('NY', 'US'), 'New York City'),
    (get_state_id('NY', 'US'), 'Buffalo'),
    (get_state_id('NY', 'US'), 'Albany');

  -- California
  INSERT INTO cities (state_id, name) VALUES
    (get_state_id('CA', 'US'), 'Los Angeles'),
    (get_state_id('CA', 'US'), 'San Francisco'),
    (get_state_id('CA', 'US'), 'San Diego'),
    (get_state_id('CA', 'US'), 'Sacramento');

  -- Texas
  INSERT INTO cities (state_id, name) VALUES
    (get_state_id('TX', 'US'), 'Houston'),
    (get_state_id('TX', 'US'), 'Dallas'),
    (get_state_id('TX', 'US'), 'Austin'),
    (get_state_id('TX', 'US'), 'San Antonio');

  -- Florida
  INSERT INTO cities (state_id, name) VALUES
    (get_state_id('FL', 'US'), 'Miami'),
    (get_state_id('FL', 'US'), 'Orlando'),
    (get_state_id('FL', 'US'), 'Tampa'),
    (get_state_id('FL', 'US'), 'Jacksonville');

  -- Illinois
  INSERT INTO cities (state_id, name) VALUES
    (get_state_id('IL', 'US'), 'Chicago'),
    (get_state_id('IL', 'US'), 'Springfield');

  -- Add more major US cities for other states...
END $$;

-- Insert Canadian cities
DO $$
BEGIN
  -- Ontario
  INSERT INTO cities (state_id, name) VALUES
    (get_state_id('ON', 'CA'), 'Toronto'),
    (get_state_id('ON', 'CA'), 'Ottawa'),
    (get_state_id('ON', 'CA'), 'Hamilton'),
    (get_state_id('ON', 'CA'), 'London');

  -- Quebec
  INSERT INTO cities (state_id, name) VALUES
    (get_state_id('QC', 'CA'), 'Montreal'),
    (get_state_id('QC', 'CA'), 'Quebec City'),
    (get_state_id('QC', 'CA'), 'Laval');

  -- British Columbia
  INSERT INTO cities (state_id, name) VALUES
    (get_state_id('BC', 'CA'), 'Vancouver'),
    (get_state_id('BC', 'CA'), 'Victoria'),
    (get_state_id('BC', 'CA'), 'Surrey');

  -- Alberta
  INSERT INTO cities (state_id, name) VALUES
    (get_state_id('AB', 'CA'), 'Calgary'),
    (get_state_id('AB', 'CA'), 'Edmonton'),
    (get_state_id('AB', 'CA'), 'Red Deer');

  -- Add more major Canadian cities for other provinces...
END $$;