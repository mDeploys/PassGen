import './UpgradeModal.css'
import { useI18n } from '../services/i18n'

interface TermsModalProps {
  open: boolean
  onClose: () => void
}

export default function TermsModal({ open, onClose }: TermsModalProps) {
  const { t } = useI18n()
  if (!open) return null
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e)=>e.stopPropagation()}>
        <h2>{t('Terms of Service')}</h2>
        <p className="modal-sub">{t('Please read these basics before using PassGen.')}</p>
        <ul className="benefits">
          <li>{t('Zero-knowledge: Your master password never leaves your device.')}</li>
          <li>{t('Local-first: Data is encrypted on-device before any storage.')}</li>
          <li>{t('Free plan: up to 4 password entries.')}</li>
          <li>{t('Premium plan: unlimited entries and cloud providers.')}</li>
          <li>{t('You are responsible for keeping your master password safe. It cannot be recovered.')}</li>
        </ul>
        <div className="actions">
          <button className="btn-secondary" onClick={onClose}>{t('Close')}</button>
        </div>
      </div>
    </div>
  )
}
