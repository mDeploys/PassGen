import { useState } from 'react'
import './Onboarding.css'
import AppFooter from './AppFooter'
import { useI18n } from '../services/i18n'

interface OnboardingProps {
  onComplete: () => void
}

function Onboarding({ onComplete }: OnboardingProps) {
  const [step, setStep] = useState(1)
  const { t } = useI18n()

  const nextStep = () => {
    if (step < 3) {
      setStep(step + 1)
    } else {
      onComplete()
    }
  }

  const prevStep = () => {
    if (step > 1) {
      setStep(step - 1)
    }
  }

  return (
    <div className="onboarding">
      <div className="onboarding-container">
        <img src="./logo.png" alt="PassGen Logo" className="onboarding-logo" />
        <div className="progress-bar">
          <div className={`progress-step ${step >= 1 ? 'active' : ''}`}>1</div>
          <div className={`progress-line ${step >= 2 ? 'active' : ''}`}></div>
          <div className={`progress-step ${step >= 2 ? 'active' : ''}`}>2</div>
          <div className={`progress-line ${step >= 3 ? 'active' : ''}`}></div>
          <div className={`progress-step ${step >= 3 ? 'active' : ''}`}>3</div>
        </div>

        {step === 1 && (
          <div className="onboarding-step">
            <h1><span className="step-icon">👋</span> {t('Welcome to PassGen!')}</h1>
            <p className="step-description">
              {t('Your secure password manager and generator')}
            </p>
            <div className="feature-list">
              <div className="feature-item">
                <span className="feature-icon">🔐</span>
                <div>
                  <strong>{t('Generate Strong Passwords')}</strong>
                  <p>{t('Create secure, random passwords with customizable options')}</p>
                </div>
              </div>
              <div className="feature-item">
                <span className="feature-icon">☁️</span>
                <div>
                  <strong>{t('Cloud Sync')}</strong>
                  <p>{t('Store encrypted vaults in Google Drive or S3-compatible storage')}</p>
                </div>
              </div>
              <div className="feature-item">
                <span className="feature-icon">🔒</span>
                <div>
                  <strong>{t('Military-Grade Encryption')}</strong>
                  <p>{t('All passwords encrypted with AES-256 before storage')}</p>
                </div>
              </div>
              <div className="feature-item">
                <span className="feature-icon">🚫</span>
                <div>
                  <strong>{t('Zero-Knowledge')}</strong>
                  <p>{t('Only you can decrypt your passwords. We never see them.')}</p>
                </div>
              </div>
              <div className="feature-item">
                <span className="feature-icon">🔍</span>
                <div>
                  <strong>{t('Search & Organize')}</strong>
                  <p>{t('Quickly find passwords by name, username, or URL')}</p>
                </div>
              </div>
              <div className="feature-item">
                <span className="feature-icon">📋</span>
                <div>
                  <strong>{t('Own Your Storage')}</strong>
                  <p>{t('Store your passwords on your own storage. Never shared anywhere else.')}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="onboarding-step">
            <h1><span className="step-icon">🛡️</span> {t('How It Works')}</h1>
            <p className="step-description">
              {t('Your privacy and security, explained')}
            </p>
            <div className="info-cards">
              <div className="info-card">
                <h3>1️⃣ {t('Choose Storage')}</h3>
                <p>
                  {t('Select where to store your encrypted passwords:')}
                  <br />• <strong>{t('Local')}</strong> - {t('Only on your device')}
                  <br />• <strong>Google Drive</strong> - {t('Sync across devices')}
                  <br />• <strong>{t('S3-Compatible')}</strong> - {t('AWS, R2, Wasabi, Spaces, MinIO')}
                  <br />• <strong>{t('Dropbox/OneDrive')}</strong> - {t('Coming soon')}
                </p>
              </div>
              <div className="info-card">
                <h3>2️⃣ {t('Set Master Password')}</h3>
                <p>
                  {t('Create a strong master password that encrypts all your data.')}
                  <br /><br />
                  <strong>⚠️ {t('Important:')}</strong> {t('This password cannot be recovered! Make it memorable and keep it safe.')}
                </p>
              </div>
              <div className="info-card">
                <h3>3️⃣ {t('Start Using')}</h3>
                <p>
                  {t('Generate passwords, save them securely, and access them anytime.')}
                  <br /><br />
                  {t('Everything is encrypted on your device before going to the cloud.')}
                </p>
              </div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="onboarding-step">
            <h1><span className="step-icon">⚡</span> {t('Quick Setup Tips')}</h1>
            <p className="step-description">
              {t('Get the most out of PassGen')}
            </p>
            <div className="tips-list">
              <div className="tip-item">
                <span className="tip-number">💡</span>
                <div>
                  <strong>{t('Master Password Best Practices')}</strong>
                  <ul>
                    <li>{t('Use at least 12-16 characters')}</li>
                    <li>{t('Mix uppercase, lowercase, numbers, and symbols')}</li>
                    <li>{t('Make it memorable but unique')}</li>
                    <li>{t('Consider using a passphrase (e.g., "Coffee&Music@Dawn2025!")')}</li>
                  </ul>
                </div>
              </div>
              <div className="tip-item">
                <span className="tip-number">🔑</span>
                <div>
                  <strong>{t('Cloud Storage Credentials')}</strong>
                  <ul>
                    <li>{t('For Google Drive: Connect once in-app to authorize access')}</li>
                    <li>{t('For S3-compatible: Create access keys and a bucket')}</li>
                    <li>{t('Supports AWS, DigitalOcean Spaces, Wasabi, Cloudflare R2, and MinIO')}</li>
                    <li>{t('Or start with Local storage and add cloud sync later')}</li>
                  </ul>
                </div>
              </div>
              <div className="tip-item">
                <span className="tip-number">🎯</span>
                <div>
                  <strong>{t('Getting Started')}</strong>
                  <ul>
                    <li>{t("Start simple with local storage if you're unsure")}</li>
                    <li>{t('You can always change storage providers later')}</li>
                    <li>{t('Your master password stays the same across providers')}</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="onboarding-actions">
          {step > 1 && (
            <button onClick={prevStep} className="btn-secondary">
              ← {t('Back')}
            </button>
          )}
          <button onClick={nextStep} className="btn-primary">
            {step === 3 ? t("Let's Get Started! 🚀") : t('Next →')}
          </button>
        </div>

        <div className="step-indicator">
          {t('Step {{step}} of 3', { step })}
        </div>
      </div>
      <AppFooter />
    </div>
  )
}

export default Onboarding
