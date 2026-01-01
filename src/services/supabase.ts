import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://ylzxeyqlqvziwnradcmy.supabase.co'
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlsenhleXFscXZ6aXducmFkY215Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU0NjIzMTAsImV4cCI6MjA4MTAzODMxMH0.e-0bhGJnlEC_hJ-DUiICu9KoZ0753bSp4QaIuamNG7o'

export const supabase = createClient(supabaseUrl, supabaseKey)

export interface ActivationRequest {
  id: string
  install_id: string
  user_email: string
  payment_method: 'paypal' | 'crypto'
  payment_amount: number
  payment_currency: string
  status: 'pending' | 'approved' | 'rejected' | 'activated'
  activation_code?: string
  notes?: string
  created_at: string
  updated_at: string
  activated_at?: string
}

export interface DashboardStats {
  total_requests: number
  pending_requests: number
  activated_requests: number
  total_revenue: number
}