import { useEffect, useState } from 'react'
import { ConfigStore } from '../services/configStore'
import { copyText } from '../services/clipboard'
import './UpgradeModal.css'

interface UpgradeModalProps {
  open: boolean
  onClose: () => void
}

const PREMIUM_PRICE = '$15 / 6 months'
const CRYPTO_ADDRESS_USDT_BSC = '0x39A31EaE0026D10D801859aF75691119d2cD367C'
const CRYPTO_QR_URL = `https://api.qrserver.com/v1/create-qr-code/?size=340x340&data=${encodeURIComponent(CRYPTO_ADDRESS_USDT_BSC)}`
const PAYPAL_QR_PATH = 'qr.png' // Provided PayPal QR code asset (relative for packaged apps)

export default function UpgradeModal({ open, onClose }: UpgradeModalProps) {
  const store = new ConfigStore()
  const [installId, setInstallId] = useState<string>('')
  const showTestVerify = ((import.meta as any)?.env?.DEV as boolean) === true

  useEffect(() => {
    if (open) {
      setInstallId(store.getInstallId())
    }
  }, [open])

  const [userEmail, setUserEmail] = useState(store.getUserEmail())
  const [paymentMethod, setPaymentMethod] = useState<'paypal' | 'crypto'>('paypal')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)

  const requestActivation = async () => {
    if (sending) return
    setSending(true)
    const requestId = store.getInstallId()
    if (userEmail) {
      store.setUserEmail(userEmail)
    }
    try {
      const res = await window.electron.payment.requestActivation({ email: userEmail, requestId, paymentMethod })
      if (res.success) {
        setSent(true)
        alert('Activation request sent. You will be activated after verification.')
      } else {
        alert(res.error || 'Failed to send activation request.')
      }
    } catch (e:any) {
      alert('Failed to send activation request: ' + e.message)
    } finally {
      setSending(false)
    }
  }

  const [code, setCode] = useState('')
  const [testResult, setTestResult] = useState<string>('')
  const [devSecret, setDevSecret] = useState<string>(showTestVerify ? store.getSellerSecretForDebug() : '')
  const activateWithCode = () => {
    if (!code) { alert('Enter activation code'); return }
    if (!userEmail) { alert('Enter your email first'); return }
    if (store.verifyActivationCode(code, userEmail)) {
      store.setPremium(true)
      // Notify main process to update menu
      ;(window as any).electronAPI?.emit?.('premium:changed')
      onClose()
      alert('Premium activated. Enjoy!')
    } else {
      alert('Invalid activation code.')
    }
  }

  const copyInstallId = async () => {
    try {
      const ok = await copyText(installId)
      if (!ok) alert('Failed to copy Install ID')
    } catch {
      alert('Failed to copy Install ID')
    }
  }

  const copyCryptoAddress = async () => {
    try {
      const ok = await copyText(CRYPTO_ADDRESS_USDT_BSC)
      if (!ok) alert('Failed to copy address')
    } catch {
      alert('Failed to copy address')
    }
  }

  const testVerify = () => {
    if (!code || !userEmail) { setTestResult('Enter email and code'); return }
    const ok = store.verifyActivationCode(code, userEmail)
    setTestResult(ok ? '✓ Code matches (dev test)' : '✗ Code does not match')
  }

  const generateCode = async () => {
    if (!userEmail) { setTestResult('Enter email first'); return }
    const generated = store.computeActivationCode(userEmail)
    setCode(generated)
    try { await copyText(generated) } catch {}
    setTestResult(`✓ Generated & copied: ${generated}`)
  }

  if (!open) return null

  if (store.isPremium()) {
    return (
      <div className="modal-backdrop" onClick={onClose}>
        <div className="modal upgrade-modal" onClick={(e) => e.stopPropagation()}>
          <div className="upgrade-hero success">
            <div className="eyebrow">Premium active</div>
            <h2>🎉 You are already a Premium user!</h2>
            <p>Enjoy unlimited passwords and cloud sync.</p>
            <button className="btn-primary" onClick={onClose}>Close</button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal upgrade-modal" onClick={(e) => e.stopPropagation()}>
        <div className="upgrade-hero">
          <div className="eyebrow">Secure upgrade</div>
          <h2>Unlock Premium</h2>
          <p className="modal-sub">Unlimited vault entries and cloud sync for {PREMIUM_PRICE}</p>
          <div className="price-badge">
            <span>{PREMIUM_PRICE}</span>
            <small>6 months of sync + updates</small>
          </div>
        </div>

        <div className="payment-section">
          <div className="section-heading">
            <span className="pill">Step 1</span>
            <div>
              <div className="section-title">Pay using the QR that suits you</div>
              <div className="section-sub">Scan the QR with your phone to complete payment.</div>
            </div>
          </div>
          <div className="pay-grid modern">
            <div className="card pay-card glass paypal">
              <div className="pay-card__header">
                <div className="brand">
                  <img
                    src="https://www.paypalobjects.com/paypal-ui/logos/svg/paypal-wordmark-color.svg"
                    alt="PayPal"
                    className="brand-logo"
                  />
                  <span className="brand-sub">Scan with your PayPal app</span>
                </div>
                <span className="pill outline">Instant</span>
              </div>
              <div className="qr-wrap elevated">
                <img
                  src={PAYPAL_QR_PATH}
                  alt="PayPal QR"
                  onError={(e:any)=>{ e.currentTarget.style.opacity = 0.4 }}
                />
              </div>
              <div className="pay-note">
                Scan with your phone to pay.
              </div>
            </div>

            <div className="card pay-card glass crypto">
              <div className="pay-card__header">
                <div className="brand">
                  <div className="crypto-badge">USDT · BSC</div>
                  <span className="brand-sub">Send 15 USDT (BEP20)</span>
                </div>
                <button className="ghost-btn" onClick={copyCryptoAddress}>Copy address</button>
              </div>
              <div className="qr-wrap elevated">
                <img
                  src={CRYPTO_QR_URL}
                  alt="USDT BSC QR"
                />
              </div>
              <div className="pay-note">
                <div className="address-row">
                  <code>{CRYPTO_ADDRESS_USDT_BSC}</code>
                  <button className="ghost-btn" onClick={copyCryptoAddress}>Copy</button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="activation-card">
          <div className="section-heading">
            <span className="pill accent">Step 2</span>
            <div>
              <div className="section-title">Request activation after payment</div>
              <div className="section-sub">Share your email, then paste the code you get back to unlock Premium.</div>
            </div>
          </div>
          <div className="activation-fields">
            <div className="email-capture subtle">
              <label>Install ID (for support)</label>
              <div className="input-with-button">
                <input type="text" value={installId} readOnly />
                <button className="ghost-btn" onClick={copyInstallId}>Copy</button>
              </div>
            </div>
            <div className="email-capture">
              <label>Payment Method</label>
              <div className="payment-method-selector">
                <label className={`method-option ${paymentMethod === 'paypal' ? 'active' : ''}`}>
                  <input
                    type="radio"
                    value="paypal"
                    checked={paymentMethod === 'paypal'}
                    onChange={(e) => setPaymentMethod(e.target.value as 'paypal')}
                  />
                  <span>PayPal</span>
                </label>
                <label className={`method-option ${paymentMethod === 'crypto' ? 'active' : ''}`}>
                  <input
                    type="radio"
                    value="crypto"
                    checked={paymentMethod === 'crypto'}
                    onChange={(e) => setPaymentMethod(e.target.value as 'crypto')}
                  />
                  <span>Crypto (USDT)</span>
                </label>
              </div>
            </div>
            <div className="email-capture">
              <label>Your Email (for activation)</label>
              <input
                type="email"
                placeholder="you@example.com"
                value={userEmail}
                onChange={(e)=>setUserEmail(e.target.value)}
              />
            </div>
            <div className="email-capture">
              <label>Activation Code</label>
              <input
                type="text"
                placeholder="Enter code from seller"
                value={code}
                onChange={(e)=>setCode(e.target.value)}
              />
            </div>
          </div>
          <div className="activation-actions">
            <button className="btn-secondary" disabled={sending || sent} onClick={requestActivation}>
              {sent ? 'Request Sent' : sending ? 'Sending...' : 'Request Activation'}
            </button>
            <button className="btn-primary" onClick={activateWithCode}>Activate</button>
            {showTestVerify && (
              <>
                <button className="btn-secondary" onClick={testVerify}>Test Verify (dev)</button>
                <button className="btn-secondary" onClick={generateCode}>Generate Code (dev)</button>
              </>
            )}
            <button className="btn-secondary ghost" onClick={onClose}>Close</button>
          </div>
          {showTestVerify && testResult && (
            <div className="dev-hint">{testResult}</div>
          )}
          {showTestVerify && (
            <div className="dev-secret">
              <label>Seller Secret (dev only, stored locally)</label>
              <div className="input-with-button">
                <input
                  type="text"
                  placeholder="override secret for testing"
                  value={devSecret}
                  onChange={(e)=>setDevSecret(e.target.value)}
                />
                <button className="btn-secondary" onClick={()=>{ store.setSellerSecretForDebug(devSecret); setTestResult('Secret updated locally'); }}>Save</button>
              </div>
              <small>Used to compute codes during development/testing without rebuild.</small>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
