/// <reference types="vite/client" />

interface PaymentAPI {
	requestActivation: (payload: { email: string; requestId: string; paymentMethod?: 'paypal' | 'crypto' }) => Promise<{ success: boolean; error?: string }>
}

interface ClipboardAPI {
	writeText: (text: string) => void
}

declare interface Window {
	electron: {
		payment: PaymentAPI
		clipboard: ClipboardAPI
	}
}
