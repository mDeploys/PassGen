import type { IncomingMessage, ServerResponse } from 'http'
import nacl from 'tweetnacl'
import { createClient } from '@supabase/supabase-js'

const DISCORD_PUBLIC_KEY = process.env.DISCORD_PUBLIC_KEY || ''
const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN || ''

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  ''

const RESEND_API_KEY = process.env.RESEND_API_KEY || ''
const RAW_FROM_EMAIL = process.env.FROM_EMAIL
const RAW_REPLY_TO_EMAIL = process.env.REPLY_TO_EMAIL || 'activation@mdeploy.dev'
const DEFAULT_FROM_EMAIL = 'PassGen <activation@mdeploy.dev>'
const FROM_EMAIL = normalizeFromAddress(RAW_FROM_EMAIL) || DEFAULT_FROM_EMAIL
const REPLY_TO_EMAIL = isValidEmail(RAW_REPLY_TO_EMAIL) ? RAW_REPLY_TO_EMAIL : undefined

const supabase = SUPABASE_URL && SUPABASE_KEY ? createClient(SUPABASE_URL, SUPABASE_KEY) : null

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  if (req.method !== 'POST') {
    res.statusCode = 405
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify({ error: 'Method not allowed' }))
    return
  }

  if (!DISCORD_PUBLIC_KEY || !supabase) {
    res.statusCode = 500
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify({ error: 'Missing server configuration' }))
    return
  }

  const signature = String(req.headers['x-signature-ed25519'] || '')
  const timestamp = String(req.headers['x-signature-timestamp'] || '')
  const rawBody = await readBody(req)

  if (!verifySignature(signature, timestamp, rawBody, DISCORD_PUBLIC_KEY)) {
    res.statusCode = 401
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify({ error: 'Invalid request signature' }))
    return
  }

  const payload = JSON.parse(rawBody)

  if (payload?.type === 1) {
    respondJson(res, { type: 1 })
    return
  }

  try {
    if (payload?.type === 3 && payload?.data?.custom_id?.startsWith('activate:')) {
      const response = await handleActivateButton(payload)
      respondJson(res, response)
      return
    }

    if (payload?.type === 2 && payload?.data?.name) {
      const response = await handleCommand(payload)
      respondJson(res, response)
      return
    }

    respondJson(res, { type: 4, data: { content: 'Unsupported interaction.', flags: 64 } })
  } catch (error: any) {
    console.error('Discord handler error:', error)
    respondJson(res, { type: 4, data: { content: `Error: ${error?.message || 'Unknown error'}`, flags: 64 } })
  }
}

async function handleCommand(payload: any) {
  const commandName = payload.data?.name

  if (commandName === 'activate') {
    const installId = String(getOption(payload, 'install_id') || '').trim()
    if (!installId) {
      return { type: 4, data: { content: 'Install ID is required.', flags: 64 } }
    }

    const { data: request, error } = await supabase!
      .from('activation_requests')
      .select('*')
      .eq('install_id', installId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) {
      throw new Error(`Lookup failed: ${error.message}`)
    }

    if (!request) {
      return { type: 4, data: { content: `No request found for install ID: ${installId}`, flags: 64 } }
    }

    if (request.status !== 'pending') {
      const codeHint = request.activation_code ? ` Activation code: ${request.activation_code}` : ''
      return { type: 4, data: { content: `Request status is ${request.status}.${codeHint}`, flags: 64 } }
    }

    const activationCode = await activateRequest(request)
    await sendActivationEmail(request.user_email, activationCode, request.install_id)
    await postPublicActivation(payload, request.user_email)

    return { type: 4, data: { content: `Activated. Code: ${activationCode}`, flags: 64 } }
  }

  if (commandName === 'pending') {
    const { data: requests, error } = await supabase!
      .from('activation_requests')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(10)

    if (error) {
      throw new Error(`Pending lookup failed: ${error.message}`)
    }

    if (!requests?.length) {
      return { type: 4, data: { content: 'No pending activation requests.', flags: 64 } }
    }

    const lines = requests.map((req: any, idx: number) => {
      return `${idx + 1}. ${req.user_email} (${req.install_id})`
    })
    return { type: 4, data: { content: lines.join('\n'), flags: 64 } }
  }

  if (commandName === 'stats') {
    const { data: stats, error } = await supabase!
      .from('dashboard_stats')
      .select('*')
      .single()

    if (error) {
      throw new Error(`Stats lookup failed: ${error.message}`)
    }

    const content = `Total: ${stats.total_requests || 0}\nPending: ${stats.pending_requests || 0}\nActivated: ${stats.activated_requests || 0}\nRevenue: $${stats.total_revenue || 0}`
    return { type: 4, data: { content, flags: 64 } }
  }

  return { type: 4, data: { content: 'Unknown command.', flags: 64 } }
}

async function handleActivateButton(payload: any) {
  const customId = payload.data?.custom_id || ''
  const requestId = customId.split(':')[1]

  if (!requestId) {
    return { type: 4, data: { content: 'Invalid activation button.', flags: 64 } }
  }

  const { data: request, error } = await supabase!
    .from('activation_requests')
    .select('*')
    .eq('id', requestId)
    .maybeSingle()

  if (error) {
    throw new Error(`Lookup failed: ${error.message}`)
  }

  if (!request) {
    return { type: 4, data: { content: 'Activation request not found.', flags: 64 } }
  }

  if (request.status !== 'pending') {
    const codeHint = request.activation_code ? ` Activation code: ${request.activation_code}` : ''
    await disableActivationButton(payload)
    return { type: 4, data: { content: `Request status is ${request.status}.${codeHint}`, flags: 64 } }
  }

  const activationCode = await activateRequest(request)
  await disableActivationButton(payload)
  await sendActivationEmail(request.user_email, activationCode, request.install_id)
  await postPublicActivation(payload, request.user_email)

  return { type: 4, data: { content: `Activated. Code: ${activationCode}`, flags: 64 } }
}

async function activateRequest(request: any) {
  const activationCode = generateActivationCode(request.install_id, request.user_email)
  const { error } = await supabase!
    .from('activation_requests')
    .update({
      status: 'activated',
      activation_code: activationCode,
      activated_at: new Date().toISOString()
    })
    .eq('id', request.id)

  if (error) {
    throw new Error(`Update failed: ${error.message}`)
  }

  return activationCode
}

async function disableActivationButton(payload: any) {
  if (!DISCORD_BOT_TOKEN) return
  const channelId = payload.channel_id
  const messageId = payload.message?.id
  if (!channelId || !messageId) return

  const components = [
    {
      type: 1,
      components: [
        {
          type: 2,
          style: 3,
          label: 'Activated',
          custom_id: payload.data?.custom_id || 'activate:done',
          disabled: true,
          emoji: { name: '✅' }
        }
      ]
    }
  ]

  await fetch(`https://discord.com/api/v10/channels/${channelId}/messages/${messageId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bot ${DISCORD_BOT_TOKEN}`
    },
    body: JSON.stringify({ components })
  })
}

async function postPublicActivation(payload: any, email: string) {
  if (!DISCORD_BOT_TOKEN) return
  const channelId = payload.channel_id
  if (!channelId) return

  const embed = {
    title: '🎉 License Activated!',
    color: 0x00ff00,
    description: `License for **${email}** has been activated!`,
    timestamp: new Date().toISOString()
  }

  await fetch(`https://discord.com/api/v10/channels/${channelId}/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bot ${DISCORD_BOT_TOKEN}`
    },
    body: JSON.stringify({ embeds: [embed] })
  })
}

async function sendActivationEmail(email: string, code: string, installId: string) {
  if (!RESEND_API_KEY) return
  try {
    const { Resend } = await import('resend')
    const resend = new Resend(RESEND_API_KEY)
    const htmlBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">PassGen Premium Activated! 🎉</h2>
        <p>Your premium subscription has been activated successfully.</p>
        <div style="background: #f0f9ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin: 0 0 10px; color: #0369a1;">Your Activation Code:</h3>
          <div style="font-size: 24px; font-weight: bold; color: #0284c7; letter-spacing: 2px;">${code}</div>
        </div>
        <p><strong>Install ID:</strong> ${installId}</p>
        <p><strong>Instructions:</strong></p>
        <ol>
          <li>Open your PassGen app</li>
          <li>Go to Upgrade → Enter this code: <code>${code}</code></li>
          <li>Click "Activate" to unlock premium features</li>
        </ol>
        <p>Enjoy unlimited passwords and cloud sync for the next 6 months!</p>
      </div>
    `
    await resend.emails.send({
      from: FROM_EMAIL,
      to: [email],
      subject: 'Your PassGen Premium Activation Code',
      html: htmlBody,
      reply_to: REPLY_TO_EMAIL
    })
  } catch (error) {
    console.warn('Resend email failed:', (error as any)?.message || error)
  }
}

function generateActivationCode(installId: string, email: string) {
  const secret =
    process.env.SELLER_SECRET ||
    process.env.VITE_SELLER_SECRET ||
    'W1IcMo9/5Kw7Mu+kFsXgoep4bcKzfvofElTnvra7PD8='
  const crypto = awaitImportCrypto()
  const data = `${installId}|${String(email || '').trim().toLowerCase()}|${secret}`
  const digest = crypto.createHash('sha256').update(data).digest('hex')
  return digest.substring(0, 10).toUpperCase()
}

function awaitImportCrypto() {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  return require('crypto')
}

function isValidEmail(value: string | undefined) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim())
}

function normalizeFromAddress(value: string | undefined) {
  const raw = String(value || '').trim()
  if (!raw) return null
  if (raw.includes('<') && raw.includes('>')) return raw
  const match = raw.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)
  if (!match) return null
  const email = match[0]
  const name = raw.replace(email, '').replace(/[<>]/g, '').trim()
  return `${name || 'PassGen'} <${email}>`
}

function getOption(payload: any, name: string) {
  const options = payload?.data?.options || []
  const match = options.find((opt: any) => opt?.name === name)
  return match?.value
}

function respondJson(res: ServerResponse, data: any) {
  res.statusCode = 200
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify(data))
}

async function readBody(req: IncomingMessage) {
  return new Promise<string>((resolve, reject) => {
    let data = ''
    req.on('data', chunk => {
      data += chunk
    })
    req.on('end', () => resolve(data))
    req.on('error', reject)
  })
}

function verifySignature(signature: string, timestamp: string, body: string, publicKey: string) {
  if (!signature || !timestamp || !body || !publicKey) return false
  try {
    const message = new TextEncoder().encode(timestamp + body)
    const sigBytes = hexToBytes(signature)
    const keyBytes = hexToBytes(publicKey)
    return nacl.sign.detached.verify(message, sigBytes, keyBytes)
  } catch (error) {
    console.warn('Signature verification failed:', (error as any)?.message || error)
    return false
  }
}

function hexToBytes(hex: string) {
  const bytes = new Uint8Array(hex.length / 2)
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.substr(i * 2, 2), 16)
  }
  return bytes
}
