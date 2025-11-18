// Quick test to verify activation code computation
const crypto = require('crypto')

const installId = '879d8494-2fe4-7fe1-a879-07f3fe3f9c26'
const email = 'jnasser1983@gmail.com'
const secret = 'PG-SEC-2025'

// Exact same logic as generator
const data = `${installId}|${email.trim().toLowerCase()}|${secret}`
console.log('Data string:', data)

const digest = crypto.createHash('sha256').update(data).digest('hex')
console.log('Full SHA-256:', digest)

const code = digest.substring(0, 10).toUpperCase()
console.log('Activation Code:', code)

// Also test with normalized email (what app does)
const normalizedEmail = email.trim().toLowerCase()
console.log('\nNormalized email:', normalizedEmail)
console.log('Expected code:', code)
