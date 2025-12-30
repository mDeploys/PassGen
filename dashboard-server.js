#!/usr/bin/env node
// Simple dashboard server for PassGen activation management
const express = require('express')
const path = require('path')
const { createClient } = require('@supabase/supabase-js')

const app = express()
const PORT = process.env.PORT || 3001

// Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ylzxeyqlqvziwnradcmy.supabase.co',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlsenhleXFscXZ6aXducmFkY215Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU0NjIzMTAsImV4cCI6MjA4MTAzODMxMH0.e-0bhGJnlEC_hJ-DUiICu9KoZ0753bSp4QaIuamNG7o'
)

// Middleware
app.use(express.json())
app.use(express.static(path.join(__dirname, 'public')))

// API Routes
app.get('/api/requests', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('activation_requests')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error
    res.json(data)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

app.get('/api/stats', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('dashboard_stats')
      .select('*')
      .single()

    if (error) throw error
    res.json(data)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

app.put('/api/requests/:id', async (req, res) => {
  try {
    const { id } = req.params
    const { status, activation_code, notes } = req.body

    const updateData = {
      status,
      updated_at: new Date().toISOString()
    }

    if (activation_code) updateData.activation_code = activation_code
    if (notes !== undefined) updateData.notes = notes
    if (status === 'activated') updateData.activated_at = new Date().toISOString()

    const { data, error } = await supabase
      .from('activation_requests')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    res.json(data)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Generate activation code
app.post('/api/generate-code', (req, res) => {
  const { installId, email } = req.body
  const secret = 'W1IcMo9/5Kw7Mu+kFsXgoep4bcKzfvofElTnvra7PD8='
  const crypto = require('crypto')
  const data = `${installId}|${email.trim().toLowerCase()}|${secret}`
  const digest = crypto.createHash('sha256').update(data).digest('hex')
  const code = digest.substring(0, 10).toUpperCase()
  res.json({ code })
})

// Send activation email
app.post('/api/send-activation', async (req, res) => {
  try {
    const { email, code } = req.body
    const { Resend } = require('resend')
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
      to: [email],
      subject: 'Your PassGen Premium Activation Code',
      html: htmlBody,
      reply_to: 'activation@mdeploy.dev'
    })

    res.json({ success: true })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Serve dashboard
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'dashboard.html'))
})

app.listen(PORT, () => {
  console.log(`PassGen Dashboard server running on http://localhost:${PORT}`)
  console.log(`Dashboard available at: http://localhost:${PORT}`)
})