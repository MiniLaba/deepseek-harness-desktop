import { app, BrowserWindow, dialog } from 'electron'
import { spawn } from 'node:child_process'
import http from 'node:http'
import net from 'node:net'
import path from 'node:path'
import { mkdir } from 'node:fs/promises'

let mainWindow
let harnessProcess

/** Reserve a loopback port, then release it immediately before starting DSH. */
function getAvailablePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer()
    server.unref()
    server.once('error', reject)
    server.listen({ host: '127.0.0.1', port: 0 }, () => {
      const address = server.address()
      if (typeof address !== 'object' || address === null) {
        server.close(() => reject(new Error('Unable to allocate a local port.')))
        return
      }
      server.close(error => error ? reject(error) : resolve(address.port))
    })
  })
}

/** Wait until the locally bound web server can serve the application. */
function waitForServer(url, timeoutMs = 45_000) {
  const startedAt = Date.now()
  return new Promise((resolve, reject) => {
    const probe = () => {
      const request = http.get(url, response => {
        response.resume()
        if (response.statusCode && response.statusCode < 500) resolve()
        else retry()
      })
      request.setTimeout(2_000, () => request.destroy())
      request.on('error', retry)
    }
    const retry = () => {
      if (Date.now() - startedAt >= timeoutMs) {
        reject(new Error('DeepSeek Harness did not start within 45 seconds.'))
        return
      }
      setTimeout(probe, 350)
    }
    probe()
  })
}

function dshEntryPoint() {
  return path.join(app.getAppPath(), 'node_modules', '@deepseek-ai', 'dsh', 'lib', 'bin.js')
}

async function startHarness() {
  const port = await getAvailablePort()
  const url = `http://127.0.0.1:${port}`
  const dshHome = path.join(app.getPath('userData'), 'dsh')
  await mkdir(dshHome, { recursive: true })

  harnessProcess = spawn(process.execPath, ['--expose-internals', dshEntryPoint(), 'web', '--host', '127.0.0.1', '--port', String(port)], {
    cwd: dshHome,
    env: {
      ...process.env,
      DSH_HOME: dshHome,
      ELECTRON_RUN_AS_NODE: '1'
    },
    stdio: 'pipe',
    windowsHide: true
  })
  harnessProcess.stderr.on('data', chunk => console.error(`[dsh] ${chunk}`))
  harnessProcess.on('error', error => console.error('Unable to launch DeepSeek Harness:', error))
  harnessProcess.on('exit', code => {
    if (code && !app.isQuitting) console.error(`DeepSeek Harness stopped with exit code ${code}.`)
    harnessProcess = undefined
  })

  await waitForServer(url)
  return url
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 980,
    minHeight: 700,
    backgroundColor: '#101114',
    title: 'DeepSeek Harness',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  })
  mainWindow.removeMenu()
}

app.whenReady().then(async () => {
  createWindow()
  try {
    await mainWindow.loadURL(await startHarness())
  } catch (error) {
    console.error(error)
    await dialog.showMessageBox(mainWindow, {
      type: 'error',
      title: 'DeepSeek Harness could not start',
      message: error instanceof Error ? error.message : String(error),
      detail: 'Close the app and try again. If this continues, reinstall the latest release.'
    })
    app.quit()
  }
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('before-quit', () => {
  app.isQuitting = true
  harnessProcess?.kill()
})
