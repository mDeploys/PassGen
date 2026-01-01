import { useEffect, useState } from 'react'
import { supabase, ActivationRequest, DashboardStats } from '../services/supabase'
import './Dashboard.css'

export default function Dashboard() {
  const [requests, setRequests] = useState<ActivationRequest[]>([])
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedRequest, setSelectedRequest] = useState<ActivationRequest | null>(null)
  const [activationCode, setActivationCode] = useState('')
  const [notes, setNotes] = useState('')

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      // Load requests
      const { data: requestsData, error: requestsError } = await supabase
        .from('activation_requests')
        .select('*')
        .order('created_at', { ascending: false })

      if (requestsError) throw requestsError
      setRequests(requestsData || [])

      // Load stats
      const { data: statsData, error: statsError } = await supabase
        .from('dashboard_stats')
        .select('*')
        .single()

      if (statsError) throw statsError
      setStats(statsData)
    } catch (error) {
      console.error('Error loading dashboard data:', error)
      alert('Failed to load dashboard data')
    } finally {
      setLoading(false)
    }
  }

  const updateRequestStatus = async (id: string, status: ActivationRequest['status'], activationCode?: string, notes?: string) => {
    try {
      const updateData: any = {
        status,
        updated_at: new Date().toISOString()
      }

      if (activationCode) updateData.activation_code = activationCode
      if (notes !== undefined) updateData.notes = notes
      if (status === 'activated') updateData.activated_at = new Date().toISOString()

      const { error } = await supabase
        .from('activation_requests')
        .update(updateData)
        .eq('id', id)

      if (error) throw error

      // Reload data
      await loadData()
      setSelectedRequest(null)
      setActivationCode('')
      setNotes('')
    } catch (error) {
      console.error('Error updating request:', error)
      alert('Failed to update request')
    }
  }

  const generateActivationCode = (installId: string, email: string) => {
    // Use the same logic as the app
    const secret = 'W1IcMo9/5Kw7Mu+kFsXgoep4bcKzfvofElTnvra7PD8=' // Should match the app's secret
    const data = `${installId}|${email.trim().toLowerCase()}|${secret}`
    const crypto = require('crypto')
    const digest = crypto.createHash('sha256').update(data).digest('hex')
    return digest.substring(0, 10).toUpperCase()
  }

  const handleActivate = (request: ActivationRequest) => {
    const code = generateActivationCode(request.install_id, request.user_email)
    setActivationCode(code)
    setSelectedRequest(request)
    setNotes(request.notes || '')
  }

  const sendActivationEmail = async (request: ActivationRequest, code: string) => {
    try {
      // Send activation email to user
      const { Resend } = await import('resend')
      const resend = new Resend('re_YsfANSBh_5fjT7VUaiB6XhfnubudpcbkA') // Your API key

      const htmlBody = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">PassGen Premium Activated! 🎉</h2>
          <p>Your premium subscription has been activated successfully.</p>
          <div style="background: #f0f9ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin: 0 0 10px; color: #0369a1;">Your Activation Code:</h3>
            <div style="font-size: 24px; font-weight: bold; color: #0284c7; letter-spacing: 2px;">${code}</div>
          </div>
          <p><strong>Instructions:</strong></p>
          <ol>
            <li>Open your PassGen app</li>
            <li>Go to Upgrade → Enter this code: <code>${code}</code></li>
            <li>Click "Activate" to unlock premium features</li>
          </ol>
          <p>Enjoy unlimited passwords and cloud sync for the next 6 months!</p>
          <p style="color: #666; font-size: 14px;">If you have any issues, reply to this email.</p>
        </div>
      `

      await resend.emails.send({
        from: 'PassGen <activation@mdeploy.dev>',
        to: [request.user_email],
        subject: 'Your PassGen Premium Activation Code',
        html: htmlBody,
        reply_to: 'activation@mdeploy.dev'
      })

      alert('Activation email sent successfully!')
    } catch (error) {
      console.error('Error sending activation email:', error)
      alert('Failed to send activation email')
    }
  }

  if (loading) {
    return <div className="dashboard-loading">Loading dashboard...</div>
  }

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <h1>PassGen Activation Dashboard</h1>
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-value">{stats?.total_requests || 0}</div>
            <div className="stat-label">Total Requests</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{stats?.pending_requests || 0}</div>
            <div className="stat-label">Pending</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{stats?.activated_requests || 0}</div>
            <div className="stat-label">Activated</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">${stats?.total_revenue || 0}</div>
            <div className="stat-label">Revenue</div>
          </div>
        </div>
      </header>

      <div className="dashboard-content">
        <div className="requests-table">
          <h2>Activation Requests</h2>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Email</th>
                <th>Install ID</th>
                <th>Payment</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((request) => (
                <tr key={request.id}>
                  <td>{new Date(request.created_at).toLocaleDateString()}</td>
                  <td>{request.user_email}</td>
                  <td><code>{request.install_id}</code></td>
                  <td>{request.payment_method} (${request.payment_amount})</td>
                  <td>
                    <span className={`status status-${request.status}`}>
                      {request.status}
                    </span>
                  </td>
                  <td>
                    {request.status === 'pending' && (
                      <button
                        className="btn-activate"
                        onClick={() => handleActivate(request)}
                      >
                        Activate
                      </button>
                    )}
                    {request.status === 'activated' && request.activation_code && (
                      <span className="activated-code">{request.activation_code}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {selectedRequest && (
          <div className="activation-modal">
            <div className="modal-content">
              <h3>Activate Request</h3>
              <div className="request-details">
                <p><strong>Email:</strong> {selectedRequest.user_email}</p>
                <p><strong>Install ID:</strong> {selectedRequest.install_id}</p>
                <p><strong>Payment:</strong> {selectedRequest.payment_method} (${selectedRequest.payment_amount})</p>
              </div>

              <div className="activation-form">
                <label>
                  Activation Code:
                  <input
                    type="text"
                    value={activationCode}
                    onChange={(e) => setActivationCode(e.target.value)}
                    placeholder="Generated code"
                  />
                </label>

                <label>
                  Notes:
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Optional notes..."
                  />
                </label>
              </div>

              <div className="modal-actions">
                <button
                  className="btn-primary"
                  onClick={async () => {
                    await updateRequestStatus(selectedRequest.id, 'activated', activationCode, notes)
                    await sendActivationEmail(selectedRequest, activationCode)
                  }}
                >
                  Send Activation Email
                </button>
                <button
                  className="btn-secondary"
                  onClick={() => updateRequestStatus(selectedRequest.id, 'approved', activationCode, notes)}
                >
                  Mark Approved (No Email)
                </button>
                <button
                  className="btn-secondary"
                  onClick={() => updateRequestStatus(selectedRequest.id, 'rejected', undefined, notes)}
                >
                  Reject
                </button>
                <button
                  className="btn-ghost"
                  onClick={() => setSelectedRequest(null)}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}