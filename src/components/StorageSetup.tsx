import { useState, useEffect } from 'react'
import type { StorageConfig, ProviderId } from '../services/storageTypes'
import { getPremiumTier, isProviderAllowed } from '../services/license'
import './StorageSetup.css'
import { useI18n } from '../services/i18n'

interface StorageSetupProps {
  open: boolean
  onClose: () => void
  onConfigured: (config: StorageConfig) => void
}

function StorageSetup({ open, onClose, onConfigured }: StorageSetupProps) {
  const [provider, setProvider] = useState<ProviderId>('local')
  const [step, setStep] = useState<'select' | 'config'>('select')
  const [showInfo, setShowInfo] = useState(true)
  const [tier, setTier] = useState(getPremiumTier())
  const { t } = useI18n()

  const [localFolder, setLocalFolder] = useState('')
  const [localBackupsEnabled, setLocalBackupsEnabled] = useState(true)
  const [localKeepLast, setLocalKeepLast] = useState(10)

  const [googleConnected, setGoogleConnected] = useState(false)
  const [googleEmail, setGoogleEmail] = useState('')
  const [googleBusy, setGoogleBusy] = useState(false)

  const [s3Config, setS3Config] = useState({
    endpoint: '',
    region: 'us-east-1',
    bucket: '',
    accessKeyId: '',
    secretAccessKey: '',
    pathPrefix: ''
  })
  const [s3Testing, setS3Testing] = useState(false)
  const [s3TestResult, setS3TestResult] = useState<string | null>(null)

  useEffect(() => {
    const handlePremiumChange = () => setTier(getPremiumTier())
    window.addEventListener('premium-changed', handlePremiumChange)
    return () => window.removeEventListener('premium-changed', handlePremiumChange)
  }, [])

  useEffect(() => {
    if (!open) return
    const loadStatus = async () => {
      const api = (window as any).electronAPI
      if (!api?.storageProviderStatus) return
      try {
        const status = await api.storageProviderStatus()
        if (status?.activeProviderId) {
          setProvider(status.activeProviderId as ProviderId)
        }
        if (status?.local) {
          setLocalFolder(status.local.vaultFolder || '')
          setLocalBackupsEnabled(status.local.backupsEnabled ?? true)
          setLocalKeepLast(status.local.keepLast ?? 10)
        }
        if (status?.googleDrive) {
          setGoogleConnected(!!status.googleDrive.connected)
          setGoogleEmail(status.googleDrive.email || '')
        }
      } catch (error) {
        console.warn('Failed to load provider status', error)
      }
    }
    loadStatus()
  }, [open])

  useEffect(() => {
    if (open) setStep('select')
  }, [open])

  const handleProviderSelect = (next: ProviderId) => {
    if (next === 'dropbox' || next === 'onedrive') return
    if (!isProviderAllowed(next, tier)) {
      window.dispatchEvent(new Event('open-upgrade'))
      return
    }
    setProvider(next)
  }

  const handleContinue = () => {
    if (!isProviderAllowed(provider, tier)) {
      window.dispatchEvent(new Event('open-upgrade'))
      return
    }
    if (provider === 'dropbox' || provider === 'onedrive') {
      return
    }
    setStep('config')
  }

  const handleSelectFolder = async () => {
    const api = (window as any).electronAPI
    if (!api?.storageSelectVaultFolder) return
    const result = await api.storageSelectVaultFolder()
    if (result?.success && result.folder) {
      setLocalFolder(result.folder)
    }
  }

  const handleGoogleConnect = async () => {
    const api = (window as any).electronAPI
    if (!api?.storageGoogleDriveConnect) return
    try {
      setGoogleBusy(true)
      const result = await api.storageGoogleDriveConnect()
      setGoogleConnected(true)
      setGoogleEmail(result.email || '')
    } catch (error) {
      alert('Google Drive connection failed: ' + (error as Error).message)
    } finally {
      setGoogleBusy(false)
    }
  }

  const handleGoogleDisconnect = async () => {
    const api = (window as any).electronAPI
    if (!api?.storageGoogleDriveDisconnect) return
    try {
      setGoogleBusy(true)
      await api.storageGoogleDriveDisconnect()
      setGoogleConnected(false)
      setGoogleEmail('')
    } finally {
      setGoogleBusy(false)
    }
  }

  const handleTestS3 = async () => {
    const api = (window as any).electronAPI
    if (!api?.storageTestS3) return
    if (!s3Config.bucket || !s3Config.accessKeyId || !s3Config.secretAccessKey || !s3Config.region) {
      setS3TestResult(t('Please fill in all required fields first.'))
      return
    }
    try {
      setS3Testing(true)
      const result = await api.storageTestS3(s3Config)
      setS3TestResult(result.ok ? t('Connection successful.') : t('Connection failed: {{message}}', { message: result.error || t('Unknown error') }))
    } catch (error) {
      setS3TestResult(t('Connection failed: {{message}}', { message: (error as Error).message }))
    } finally {
      setS3Testing(false)
    }
  }

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault()

    if (provider === 'google-drive' && !googleConnected) {
      alert(t('Connect your Google Drive account to continue.'))
      return
    }

    if (provider === 's3-compatible') {
      if (!s3Config.bucket || !s3Config.accessKeyId || !s3Config.secretAccessKey || !s3Config.region) {
        alert(t('Please complete all required S3 fields.'))
        return
      }
    }

    const config: StorageConfig = { provider }

    if (provider === 'local') {
      config.local = {
        vaultFolder: localFolder || undefined,
        backupsEnabled: localBackupsEnabled,
        keepLast: localKeepLast
      }
    }

    if (provider === 's3-compatible') {
      config.s3Compatible = {
        endpoint: s3Config.endpoint || undefined,
        region: s3Config.region,
        bucket: s3Config.bucket,
        accessKeyId: s3Config.accessKeyId,
        secretAccessKey: s3Config.secretAccessKey,
        pathPrefix: s3Config.pathPrefix || undefined
      }
    }

    onConfigured(config)
    onClose()
  }

  if (!open) return null

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal clean" onClick={(e) => e.stopPropagation()}>
        <div className="storage-setup">
          <h2>🔒 {t('Configure Storage')}</h2>
          <p className="subtitle">
            {step === 'select' ? t('Choose where to store your encrypted vault') : t('Set up your storage provider')}
          </p>

          {showInfo && step === 'select' && (
            <div className="info-banner">
              <div className="info-content">
                <strong>📌 {t('New to PassGen?')}</strong>
                <p>
                  {t('Start with Local Storage and enable cloud sync later. You can change providers anytime.')}
                </p>
              </div>
              <button onClick={() => setShowInfo(false)} className="close-info">×</button>
            </div>
          )}

          {step === 'select' && (
            <div className="provider-selection">
              <label className="provider-option" onClick={() => handleProviderSelect('local')}>
                <input
                  type="radio"
                  name="provider"
                  value="local"
                  checked={provider === 'local'}
                  onChange={() => handleProviderSelect('local')}
                />
                <span className="provider-icon">💾</span>
                <div className="provider-info">
                  <div className="provider-title">
                    <strong>{t('Local Storage')}</strong>
                    <span className="provider-badge default">{t('Default')}</span>
                  </div>
                  <span>{t('Store your encrypted vault on this device')}</span>
                </div>
              </label>

              <label className={`provider-option ${!isProviderAllowed('google-drive', tier) ? 'disabled' : ''}`} onClick={() => handleProviderSelect('google-drive')}>
                <input
                  type="radio"
                  name="provider"
                  value="google-drive"
                  checked={provider === 'google-drive'}
                  onChange={() => handleProviderSelect('google-drive')}
                  disabled={!isProviderAllowed('google-drive', tier)}
                />
                <img src="https://www.gstatic.com/images/branding/product/1x/drive_2020q4_48dp.png" alt="Google Drive" className="provider-icon" />
                <div className="provider-info">
                  <div className="provider-title">
                    <strong>Google Drive</strong>
                    <span className="provider-badge recommended">{t('Recommended')}</span>
                  </div>
                  <span>{t('Encrypted sync/backup with your Google account')}</span>
                </div>
              </label>

              <label className={`provider-option ${!isProviderAllowed('s3-compatible', tier) ? 'disabled' : ''}`} onClick={() => handleProviderSelect('s3-compatible')}>
                <input
                  type="radio"
                  name="provider"
                  value="s3-compatible"
                  checked={provider === 's3-compatible'}
                  onChange={() => handleProviderSelect('s3-compatible')}
                  disabled={!isProviderAllowed('s3-compatible', tier)}
                />
                <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/b/bc/Amazon-S3-Logo.svg/428px-Amazon-S3-Logo.svg.png" alt="S3 Compatible" className="provider-icon" />
                <div className="provider-info">
                  <div className="provider-title">
                    <strong>{t('S3-Compatible Storage')}</strong>
                    <span className="provider-badge advanced">{t('Advanced')}</span>
                  </div>
                  <span>{t('Use AWS, R2, Wasabi, Spaces, MinIO, or custom endpoints')}</span>
                </div>
              </label>

              <label className="provider-option disabled">
                <input type="radio" name="provider" value="dropbox" disabled />
                <span className="provider-icon">📦</span>
                <div className="provider-info">
                  <div className="provider-title">
                    <strong>{t('Dropbox')}</strong>
                    <span className="provider-badge soon">{t('Coming soon')}</span>
                  </div>
                  <span>{t('Encrypted Dropbox backup (Tier B)')}</span>
                </div>
              </label>

              <label className="provider-option disabled">
                <input type="radio" name="provider" value="onedrive" disabled />
                <span className="provider-icon">☁️</span>
                <div className="provider-info">
                  <div className="provider-title">
                    <strong>{t('OneDrive')}</strong>
                    <span className="provider-badge soon">{t('Coming soon')}</span>
                  </div>
                  <span>{t('Encrypted OneDrive backup (Tier B)')}</span>
                </div>
              </label>
            </div>
          )}

          {step === 'select' && (
            <button type="button" className="submit-btn" onClick={handleContinue}>
              {t('Continue')}
            </button>
          )}

          {step === 'config' && (
            <form onSubmit={handleSaveConfig} className="config-fields">
              {provider === 'local' && (
                <>
                  <h3>{t('Local Storage')}</h3>
                  <div className="form-group">
                    <label>{t('Vault Folder')}</label>
                    <div className="inline-row">
                      <input type="text" value={localFolder} placeholder={t('Choose a folder for your vault')} readOnly className="ltr-input" />
                      <button type="button" className="secondary-btn" onClick={handleSelectFolder}>{t('Browse')}</button>
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="checkbox-row">
                      <input
                        type="checkbox"
                        checked={localBackupsEnabled}
                        onChange={(e) => setLocalBackupsEnabled(e.target.checked)}
                      />
                      {t('Enable local version backups')}
                    </label>
                  </div>
                  <div className="form-group">
                    <label>{t('Keep last N versions')}</label>
                    <input
                      type="number"
                      min="1"
                      max="50"
                      value={localKeepLast}
                      onChange={(e) => setLocalKeepLast(Number(e.target.value) || 1)}
                      className="ltr-input"
                    />
                  </div>
                </>
              )}

              {provider === 'google-drive' && (
                <>
                  <h3>Google Drive</h3>
                  <div className="form-group">
                    <label>{t('Account')}</label>
                    <div className="inline-row">
                      <input
                        type="text"
                        value={googleEmail || t('Not connected')}
                        readOnly
                        aria-readonly="true"
                        className={`ltr-input ${googleConnected ? '' : 'readonly-input'}`}
                        title={googleConnected ? googleEmail : t('Click Connect to link your account')}
                      />
                      {googleConnected ? (
                        <button type="button" className="secondary-btn" onClick={handleGoogleDisconnect} disabled={googleBusy}>
                          {t('Disconnect')}
                        </button>
                      ) : (
                        <button type="button" className="secondary-btn" onClick={handleGoogleConnect} disabled={googleBusy}>
                          {googleBusy ? t('Connecting...') : t('Connect')}
                        </button>
                      )}
                    </div>
                    <p className="help-text subtle">{t('This field is read-only. Use Connect to link your account.')}</p>
                  </div>
                  <p className="help-text">{t('Google Drive stores only encrypted vault snapshots. No plaintext ever leaves this device.')}</p>
                </>
              )}

              {provider === 's3-compatible' && (
                <>
                  <h3>{t('S3-Compatible Storage')}</h3>
                  <div className="form-group">
                    <label>{t('Endpoint (optional)')}</label>
                    <input
                      type="text"
                      value={s3Config.endpoint}
                      onChange={(e) => setS3Config(prev => ({ ...prev, endpoint: e.target.value }))}
                      placeholder={t('https://s3.amazonaws.com or custom endpoint')}
                      className="ltr-input"
                    />
                  </div>
                  <div className="form-group">
                    <label>{t('Region')}</label>
                    <input
                      type="text"
                      value={s3Config.region}
                      onChange={(e) => setS3Config(prev => ({ ...prev, region: e.target.value }))}
                      placeholder="us-east-1"
                      required
                      className="ltr-input"
                    />
                  </div>
                  <div className="form-group">
                    <label>{t('Bucket')}</label>
                    <input
                      type="text"
                      value={s3Config.bucket}
                      onChange={(e) => setS3Config(prev => ({ ...prev, bucket: e.target.value }))}
                      placeholder="my-vault-bucket"
                      required
                      className="ltr-input"
                    />
                  </div>
                  <div className="form-group">
                    <label>{t('Access Key ID')}</label>
                    <input
                      type="text"
                      value={s3Config.accessKeyId}
                      onChange={(e) => setS3Config(prev => ({ ...prev, accessKeyId: e.target.value }))}
                      placeholder="AKIA..."
                      required
                      className="ltr-input"
                    />
                  </div>
                  <div className="form-group">
                    <label>{t('Secret Access Key')}</label>
                    <input
                      type="password"
                      value={s3Config.secretAccessKey}
                      onChange={(e) => setS3Config(prev => ({ ...prev, secretAccessKey: e.target.value }))}
                      placeholder="••••••••"
                      required
                      className="ltr-input"
                    />
                  </div>
                  <div className="form-group">
                    <label>{t('Path Prefix (optional)')}</label>
                    <input
                      type="text"
                      value={s3Config.pathPrefix}
                      onChange={(e) => setS3Config(prev => ({ ...prev, pathPrefix: e.target.value }))}
                      placeholder="passgen/"
                      className="ltr-input"
                    />
                  </div>
                  <div className="inline-row">
                    <button type="button" className="secondary-btn" onClick={handleTestS3} disabled={s3Testing}>
                      {s3Testing ? t('Testing...') : t('Test Connection')}
                    </button>
                    {s3TestResult && <span className="test-result">{s3TestResult}</span>}
                  </div>
                </>
              )}

              <div className="config-actions">
                <button type="button" className="secondary-btn" onClick={() => setStep('select')}>{t('Back')}</button>
                <button type="submit" className="submit-btn">{t('Save')}</button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}

export default StorageSetup
