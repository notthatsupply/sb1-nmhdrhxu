/*
  # Restructure orders table

  1. Changes
    - Add commodity and weight fields to orders table
    - Remove commodity and weight from locations table
    - Add PO/Reference number to orders table

  2. Security
    - Maintain existing RLS policies
*/

-- Add new columns to orders table
ALTER TABLE orders 
ADD COLUMN commodity text NOT NULL DEFAULT '',
ADD COLUMN weight numeric NOT NULL DEFAULT 0,
ADD COLUMN reference_number text;

-- Remove columns from locations table
ALTER TABLE locations
DROP COLUMN commodity,
DROP COLUMN weight,
DROP COLUMN reference_number;