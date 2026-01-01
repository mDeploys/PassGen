-- Supabase SQL Schema for PassGen Activation Dashboard

-- Create activation_requests table
CREATE TABLE IF NOT EXISTS activation_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  install_id TEXT NOT NULL,
  user_email TEXT NOT NULL,
  payment_method TEXT CHECK (payment_method IN ('paypal', 'crypto')) NOT NULL,
  payment_amount DECIMAL(10,2) NOT NULL,
  payment_currency TEXT DEFAULT 'USD' NOT NULL,
  status TEXT CHECK (status IN ('pending', 'approved', 'rejected', 'activated')) DEFAULT 'pending' NOT NULL,
  activation_code TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  activated_at TIMESTAMP WITH TIME ZONE
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_activation_requests_install_id ON activation_requests(install_id);
CREATE INDEX IF NOT EXISTS idx_activation_requests_user_email ON activation_requests(user_email);
CREATE INDEX IF NOT EXISTS idx_activation_requests_status ON activation_requests(status);
CREATE INDEX IF NOT EXISTS idx_activation_requests_created_at ON activation_requests(created_at DESC);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_activation_requests_updated_at
    BEFORE UPDATE ON activation_requests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS)
ALTER TABLE activation_requests ENABLE ROW LEVEL SECURITY;

-- Create policies for the activation_requests table
-- For now, allow all operations (you can restrict this later with authentication)
CREATE POLICY "Allow all operations on activation_requests" ON activation_requests
    FOR ALL USING (true);

-- Create a view for dashboard statistics
CREATE OR REPLACE VIEW dashboard_stats AS
SELECT
  COUNT(*) as total_requests,
  COUNT(*) FILTER (WHERE status = 'pending') as pending_requests,
  COUNT(*) FILTER (WHERE status = 'activated') as activated_requests,
  COALESCE(SUM(payment_amount) FILTER (WHERE status IN ('approved', 'activated')), 0) as total_revenue
FROM activation_requests;