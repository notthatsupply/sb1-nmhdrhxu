/*
  # Create manifest history and audit logs tables
  
  1. New Tables
    - `manifest_history`
      - For tracking changes to manifests, including status changes and resource assignments
      - Supports audit trails and history views
      - Includes timestamps and user tracking
      
    - `audit_logs`
      - For general audit logging across the system
      - Stores previous and new data states in JSON fields
      - Supports filtering and searching audit history

  2. Security
    - Enable RLS on new tables
    - Add policies for authenticated users
*/

-- Create manifest_history table
CREATE TABLE IF NOT EXISTS public.manifest_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  manifest_id uuid REFERENCES public.manifests(id) ON DELETE CASCADE,
  manifest_number text NOT NULL,
  previous_status text,
  new_status text,
  driver_id uuid,
  driver_name text,
  vehicle_id uuid,
  vehicle_number text,
  changed_at timestamptz NOT NULL DEFAULT now(),
  changed_by text,
  notes text
);

-- Enable RLS on manifest_history
ALTER TABLE public.manifest_history ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Allow authenticated read access to manifest history"
  ON public.manifest_history
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated create manifest history"
  ON public.manifest_history
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

-- Create audit_logs table
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES public.orders(id) ON DELETE CASCADE,
  action text NOT NULL,
  table_name text,
  record_id uuid,
  previous_data jsonb,
  new_data jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by text
);

-- Enable RLS on audit_logs
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Allow authenticated read access to audit logs"
  ON public.audit_logs
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated create audit logs"
  ON public.audit_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_manifest_history_manifest_id ON public.manifest_history(manifest_id);
CREATE INDEX IF NOT EXISTS idx_manifest_history_changed_at ON public.manifest_history(changed_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_order_id ON public.audit_logs(order_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at);