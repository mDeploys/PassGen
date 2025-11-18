import { app, BrowserWindow, ipcMain, shell, Menu, dialog, clipboard } from 'electron'
// Load environment variables from .env if present (development convenience)
try {
  // Dynamically require without adding type dep; ignore if not installed
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const dotenv = require('dotenv')
  dotenv.config()
} catch {}
import * as path from 'path'

let mainWindow: BrowserWindow | null = null;

function resolveIconPath() {
  try {
    if (app.isPackaged) {
      // In production, files are under resources. We copy icon.png into dist at build time.
      return path.join(__dirname, '../dist/icon.png')
    }
    // In dev, load from public
    return path.join(process.cwd(), 'public', 'icon.png')
  } catch {
    return undefined as unknown as string
  }
}

function setApplicationMenu() {
  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: 'File',
      submenu: [
        {
          label: 'Upgrade to Premium',
          click: () => {
            mainWindow?.webContents.executeJavaScript(`window.dispatchEvent(new Event('open-upgrade'))`)
          }
        },
        { type: 'separator' },
        { role: 'quit' }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'zoom' },
        { role: 'close' }
      ]
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'Check for Updates',
          click: () => {
            mainWindow?.webContents.executeJavaScript(`
              (async () => {
                try {
                  const res = await fetch('https://api.github.com/repos/Jalal-Nasser/PassGen-Releases/releases/latest');
                  const data = await res.json();
                  const latest = data.tag_name?.replace(/^v/, '');
                  const url = data.html_url;
                  const current = '1.0.3';
                  if (latest && latest !== current) {
                    if (confirm('New version ' + latest + ' available! Go to download page?')) {
                      window.open(url, '_blank');
                    }
                  } else {
                    alert('You have the latest version.');
                  }
                } catch(e) {
                  alert('Update check failed: ' + e.message);
                }
              })()
            `).catch(() => {})
          }
        },
        {
          label: 'About PassGen',
          click: () => {
            const version = app.getVersion()
            dialog.showMessageBox({
              type: 'info',
              title: 'About PassGen',
              message: `PassGen\nVersion ${version}`,
              detail: 'A secure password generator and vault.\nDeveloper: JalalNasser\nPremium: $3.99/mo for cloud sync and unlimited items.',
              buttons: ['OK', 'Downloads', 'Report Issue'],
              defaultId: 0,
              cancelId: 0
            }).then(({ response }) => {
              if (response === 1) shell.openExternal('https://github.com/Jalal-Nasser/PassGen-Releases/releases')
              if (response === 2) shell.openExternal('https://github.com/Jalal-Nasser/PassGen-Releases/issues')
            })
          }
        },
        { type: 'separator' },
        {
          label: 'Terms (EULA)',
          click: () => shell.openExternal('https://github.com/Jalal-Nasser/PassGen-Releases/blob/main/LICENSE.txt')
        }
      ]
    }
  ]
  const menu = Menu.buildFromTemplate(template)
  Menu.setApplicationMenu(menu)
}

function createWindow() {
  // Prevent multiple windows
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.focus();
    return;
  }

  mainWindow = new BrowserWindow({
    width: 900,
    height: 680,
    minWidth: 800,
    minHeight: 600,
    icon: resolveIconPath(),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true
    }
  })
  mainWindow.center()

  // In development, use the Vite dev server
  const isDev = process.env.NODE_ENV === 'development' || process.env.VITE_DEV_SERVER_URL
  
  if (isDev) {
    const devServerUrl = process.env.VITE_DEV_SERVER_URL || 'http://localhost:5173'
    mainWindow.loadURL(devServerUrl)
    // Don't open dev tools automatically
  } else {
    // Production: load from dist folder
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  })
}

// Window control IPC handlers
ipcMain.on('window:minimize', () => {
  if (mainWindow) mainWindow.minimize()
})

ipcMain.on('window:maximize', () => {
  if (mainWindow) {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize()
    } else {
      mainWindow.maximize()
    }
  }
})

ipcMain.on('window:close', () => {
  if (mainWindow) mainWindow.close()
})

// Prevent multiple instances
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.whenReady().then(() => {
    createWindow()
    setApplicationMenu()

    app.on('activate', function () {
      if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })
  })
}

app.on('window-all-closed', () => {
  app.quit();
})

// Handle payment activation email request
ipcMain.handle('payment:requestActivation', async (_event, payload: { email: string; requestId: string }) => {
  // Safe default so end-users can request activation via mailto without any env vars
  const defaultSeller = 'git@mdeploy.dev'
  const seller = process.env.SELLER_EMAIL || defaultSeller
  const smtpUser = process.env.ZOHO_USER || ''
  const smtpPass = process.env.ZOHO_PASS || ''
  const smtpHost = process.env.ZOHO_HOST || 'smtp.zoho.com'
  const smtpPort = Number(process.env.ZOHO_PORT || 465)
  // If port is 587 use STARTTLS (secure=false), if 465 use SSL (secure=true), otherwise use env toggle
  const smtpSecure = smtpPort === 465 ? true : (smtpPort === 587 ? false : String(process.env.ZOHO_SECURE || 'true') === 'true')

  const subject = `PassGen Premium Activation Request – ${payload.requestId}`
  const body = `A user clicked "I've paid" in PassGen\n\nInstall/Request ID: ${payload.requestId}\nUser Email: ${payload.email || '(not provided)'}\nPlan: Premium $3.99/mo\nTime: ${new Date().toISOString()}\n\nPlease verify payment on PayPal and send activation code.`

  // Try SMTP via nodemailer, fallback to mailto if not configured or fails
  try {
    if (seller && smtpUser && smtpPass) {
      const nodemailerMod = await import('nodemailer')
      const nodemailer = (nodemailerMod as any).default || (nodemailerMod as any)
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpSecure,
        auth: { user: smtpUser, pass: smtpPass }
      })
      await transporter.verify().catch(()=>{})
      await transporter.sendMail({ from: seller || smtpUser, to: seller, subject, text: body })
      return { success: true }
    }
    throw new Error('SMTP not configured')
  } catch (err) {
    if (seller) {
      const mailto = `mailto:${encodeURIComponent(seller)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
      shell.openExternal(mailto)
      return { success: false, error: 'SMTP not configured; opened mail client.' }
    }
    return { success: false, error: 'Seller email not configured' }
  }
})

// Clipboard IPC fallbacks
ipcMain.handle('clipboard:writeText', async (_event, text: string) => {
  try {
    clipboard.writeText(String(text ?? ''))
    return true
  } catch {
    return false
  }
})

ipcMain.handle('clipboard:readText', async () => {
  try {
    return clipboard.readText()
  } catch {
    return ''
  }
})
