import { useEffect, useState } from 'react'
import { ConfigStore } from '../services/configStore'
import { applyRemoteLicense } from '../services/license'
import { copyText } from '../services/clipboard'
import './UpgradeModal.css'
import { useI18n } from '../services/i18n'

interface UpgradeModalProps {
  open: boolean
  onClose: () => void
}

const PAYMENT_PAGE_BASE_URL = 'https://git.mdeploy.dev/passgen'

export default function UpgradeModal({ open, onClose }: UpgradeModalProps) {
  const store = new ConfigStore()
  const { t } = useI18n()
  const [installId, setInstallId] = useState<string>('')

  useEffect(() => {
    if (open) {
      setInstallId(store.getInstallId())
    }
  }, [open])

  const [licenseKey, setLicenseKey] = useState('')
  const [redeeming, setRedeeming] = useState(false)

  const redeemLicenseKey = async () => {
    if (!licenseKey) { alert(t('Enter license key')); return }
    try {
      setRedeeming(true)
      const api = (window as any).electronAPI
      if (!api?.licenseRedeem) {
        throw new Error('License backend is not available')
      }
      const result = await api.licenseRedeem({ licenseKey, deviceId: installId })
      applyRemoteLicense(result)
      if (result?.isPremium) {
        onClose()
        alert(t('Premium activated. Enjoy!'))
      } else {
        alert(t('Activation pending. Please contact support if it does not update soon.'))
      }
    } catch (e:any) {
      alert(t('License redeem failed: {{message}}', { message: e.message }))
    } finally {
      setRedeeming(false)
    }
  }

  const copyInstallId = async () => {
    try {
      const ok = await copyText(installId)
      if (!ok) alert(t('Failed to copy Install ID'))
    } catch {
      alert(t('Failed to copy Install ID'))
    }
  }

  const buildPaymentUrl = () => {
    const params = new URLSearchParams()
    if (installId) params.set('installId', installId)
    const query = params.toString()
    return `${PAYMENT_PAGE_BASE_URL}${query ? `?${query}` : ''}#pricing`
  }

  const openPaymentPage = async () => {
    const api = (window as any).electronAPI
    try {
      const paymentUrl = buildPaymentUrl()
      if (api?.openExternal) {
        await api.openExternal(paymentUrl)
      } else {
        window.open(paymentUrl, '_blank', 'noopener,noreferrer')
      }
    } catch (error: any) {
      alert(t('Failed to open payment page: {{message}}', { message: error?.message || 'Unknown error' }))
    }
  }

  if (!open) return null

  if (store.isPremium()) {
    return (
      <div className="modal-backdrop" onClick={onClose}>
        <div className="modal upgrade-modal" onClick={(e) => e.stopPropagation()}>
          <div className="upgrade-hero success">
            <div className="eyebrow">{t('Premium active')}</div>
            <h2>🎉 {t('You are already a Premium user!')}</h2>
            <p>{t('Enjoy unlimited passwords and cloud sync.')}</p>
            <button className="btn-primary" onClick={onClose}>{t('Close')}</button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal upgrade-modal" onClick={(e) => e.stopPropagation()}>
        <div className="upgrade-hero">
          <div className="eyebrow">{t('Secure upgrade')}</div>
          <h2>{t('Unlock Premium')}</h2>
          <p className="modal-sub">{t('Unlimited vault entries and cloud sync.')}</p>
        </div>

        <div className="activation-card">
          <div className="section-heading">
            <span className="pill">{t('Step 1')}</span>
            <div>
              <div className="section-title">{t('Install ID')}</div>
              <div className="section-sub">{t('Copy your Install ID, then pick a plan on the payment page.')}</div>
            </div>
          </div>
          <div className="activation-fields">
            <div className="email-capture subtle">
              <label>{t('Install ID (for support)')}</label>
              <div className="input-with-button">
                <input type="text" value={installId} readOnly className="ltr-input" />
                <button className="ghost-btn" onClick={copyInstallId}>{t('Copy')}</button>
              </div>
            </div>
          </div>
          <div className="activation-actions">
            <button className="btn-primary" onClick={openPaymentPage}>
              {t('Pick a Plan')}
            </button>
          </div>
        </div>

        <div className="activation-card">
          <div className="section-heading">
            <span className="pill accent">{t('Step 2')}</span>
            <div>
              <div className="section-title">{t('Enter license key')}</div>
              <div className="section-sub">{t('Paste the license key from your payment confirmation to unlock Premium.')}</div>
            </div>
          </div>
          <div className="activation-fields">
            <div className="email-capture">
              <label>{t('License Key')}</label>
              <input
                type="text"
                placeholder={t('Enter license key')}
                value={licenseKey}
                onChange={(e)=>setLicenseKey(e.target.value)}
                className="ltr-input"
              />
            </div>
          </div>
          <div className="activation-actions">
            <button className="btn-primary" onClick={redeemLicenseKey} disabled={redeeming}>
              {redeeming ? t('Redeeming...') : t('Redeem Key')}
            </button>
            <button className="btn-secondary ghost" onClick={onClose}>{t('Close')}</button>
          </div>
        </div>
      </div>
    </div>
  )
}
