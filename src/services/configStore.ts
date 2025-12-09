// Simple localStorage-based config store
// No Node.js dependencies - safe for renderer process
import CryptoJS from 'crypto-js'

export interface StorageConfig {
  provider: 'local' | 'google-drive' | 's3' | 'digitalocean';
  googleDrive?: {
    clientId: string;
    clientSecret: string;
    tokens?: any;
  };
  s3?: {
    accessKeyId: string;
    secretAccessKey: string;
    region: string;
    bucket: string;
  };
  digitalocean?: {
    accessKeyId: string;
    secretAccessKey: string;
    region: string;
    bucket: string;
  };
}

export class ConfigStore {
  getInstallId(): string {
    let id = localStorage.getItem('passgen-install-id')
    if (!id) {
      // Generate simple UUID v4-ish
      const rnd = (len: number) => Array.from(crypto?.getRandomValues?.(new Uint8Array(len)) || new Array(len).fill(0).map(()=>Math.random()*256), (b:any)=>('00'+(b|0).toString(16)).slice(-2)).join('')
      id = `${rnd(4)}-${rnd(2)}-${rnd(2)}-${rnd(2)}-${rnd(6)}`
      localStorage.setItem('passgen-install-id', id)
    }
    return id
  }

  getUserEmail(): string {
    return localStorage.getItem('passgen-user-email') || ''
  }

  setUserEmail(email: string): void {
    localStorage.setItem('passgen-user-email', email)
  }

  private getSellerSecret(): string {
    // Prefer runtime-configurable secret so you can avoid hardcoding
    return (
      (window as any)?.PASSGEN_SELLER_SECRET ||
      localStorage.getItem('passgen-seller-secret') ||
      (import.meta as any)?.env?.VITE_SELLER_SECRET ||
      'W1IcMo9/5Kw7Mu+kFsXgoep4bcKzfvofElTnvra7PD8=' // fallback
    )
  }

  // Dev-only helpers to inspect/override the effective secret without rebuilding
  getSellerSecretForDebug(): string {
    return this.getSellerSecret()
  }

  setSellerSecretForDebug(secret: string): void {
    if (secret && typeof secret === 'string') {
      localStorage.setItem('passgen-seller-secret', secret)
    }
  }

  computeActivationCode(email?: string): string {
    const installId = this.getInstallId()
    const secret = this.getSellerSecret()
    const data = `${installId}|${(email || this.getUserEmail() || '').trim().toLowerCase()}|${secret}`
    const digest = CryptoJS.SHA256(data).toString()
    return digest.substring(0, 10).toUpperCase()
  }

  verifyActivationCode(code: string, email?: string): boolean {
    return this.computeActivationCode(email) === code.trim().toUpperCase()
  }
  isPremium(): boolean {
    return localStorage.getItem('passgen-premium') === 'true'
  }

  setPremium(value: boolean): void {
    localStorage.setItem('passgen-premium', value ? 'true' : 'false')
    window.dispatchEvent(new Event('premium-changed'))
  }

  getStorageConfig(): StorageConfig | null {
    const stored = localStorage.getItem('passgen-storage-config');
    return stored ? JSON.parse(stored) : null;
  }

  setStorageConfig(config: StorageConfig): void {
    localStorage.setItem('passgen-storage-config', JSON.stringify(config));
  }

  getMasterPasswordHash(): string | null {
    return localStorage.getItem('passgen-master-hash');
  }

  setMasterPasswordHash(hash: string): void {
    localStorage.setItem('passgen-master-hash', hash);
  }

  getPasskeyCredential(): { credentialId: string; publicKey: string } | null {
    const data = localStorage.getItem('passgen-passkey-credential');
    return data ? JSON.parse(data) : null;
  }

  setPasskeyCredential(credentialId: string, publicKey: string): void {
    localStorage.setItem('passgen-passkey-credential', JSON.stringify({ credentialId, publicKey }));
  }

  clearPasskeyCredential(): void {
    localStorage.removeItem('passgen-passkey-credential');
  }

  clear(): void {
    localStorage.removeItem('passgen-storage-config');
    localStorage.removeItem('passgen-master-hash');
    localStorage.removeItem('passgen-passkey-credential');
    // Remove both legacy and current keys just in case
    localStorage.removeItem('passgen-onboarding-complete');
    localStorage.removeItem('passgen-onboarding-completed');
    localStorage.removeItem('passgen-premium');
  }

  getGoogleDriveTokens(): any {
    const config = this.getStorageConfig();
    return config?.googleDrive?.tokens;
  }

  setGoogleDriveTokens(tokens: any): void {
    const config = this.getStorageConfig();
    if (config && config.googleDrive) {
      config.googleDrive.tokens = tokens;
      this.setStorageConfig(config);
    }
  }
}
