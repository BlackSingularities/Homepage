import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import fs from 'node:fs/promises'
import http from 'node:http'
import net from 'node:net'
import os from 'node:os'
import path from 'node:path'

/**
 * Zrzuty stron do miniatur w „Przydatnych linkach”.
 *
 * Headless Chromium uruchamiany z wiersza poleceń (`--screenshot`), bez
 * bibliotek w rodzaju Puppeteera. Cały ruch przeglądarki idzie przez lokalny
 * serwer pośredniczący, który przepuszcza wyłącznie połączenia do publicznych
 * adresów IP – strona nie zajrzy do sieci kontenerów ani na localhost, nawet
 * przekierowaniem czy obrazkiem. Zrzuty robimy po jednym naraz.
 */

const WIDTH = 1280
const HEIGHT = 800
const TIMEOUT = 40_000

const CANDIDATES = [
  process.env.SCREENSHOT_BROWSER,
  '/usr/bin/chromium-browser',
  '/usr/bin/chromium',
  '/usr/bin/google-chrome',
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
]

export const browserPath = () => CANDIDATES.find(candidate => candidate && existsSync(candidate)) || ''

/** Pośrednik HTTP/CONNECT; `resolve(host)` zwraca sprawdzony publiczny adres IP albo rzuca wyjątek. */
function startGuardProxy(resolve) {
  const server = http.createServer(async (req, res) => {
    try {
      const target = new URL(req.url)
      if (target.protocol !== 'http:' || !['', '80'].includes(target.port)) throw new Error('port')
      const address = await resolve(target.hostname)
      const headers = { ...req.headers, host: target.host }
      delete headers['proxy-connection']
      const upstream = http.request({ host: address, port: 80, method: req.method, path: `${target.pathname}${target.search}`, headers, setHost: false }, response => {
        res.writeHead(response.statusCode || 502, response.headers)
        response.pipe(res)
      })
      upstream.setTimeout(TIMEOUT, () => upstream.destroy())
      upstream.on('error', () => res.destroy())
      req.pipe(upstream)
    } catch {
      res.writeHead(403).end()
    }
  })
  server.on('connect', async (req, socket, head) => {
    socket.on('error', () => {})
    try {
      const match = /^(\[[^\]]+\]|[^:]+):(\d+)$/.exec(req.url || '')
      if (!match || match[2] !== '443') throw new Error('port')
      const address = await resolve(match[1].replace(/^\[|\]$/g, ''))
      const upstream = net.connect(443, address, () => {
        socket.write('HTTP/1.1 200 Connection Established\r\n\r\n')
        if (head?.length) upstream.write(head)
        upstream.pipe(socket)
        socket.pipe(upstream)
      })
      upstream.setTimeout(TIMEOUT, () => upstream.destroy())
      upstream.on('error', () => socket.destroy())
      socket.on('close', () => upstream.destroy())
    } catch {
      socket.end('HTTP/1.1 403 Forbidden\r\n\r\n')
    }
  })
  return new Promise((done, fail) => {
    server.once('error', fail)
    server.listen(0, '127.0.0.1', () => done(server))
  })
}

function run(binary, args) {
  return new Promise((done, fail) => {
    const child = spawn(binary, args, { stdio: ['ignore', 'ignore', 'pipe'], windowsHide: true })
    let stderr = ''
    child.stderr.on('data', chunk => { stderr = (stderr + chunk).slice(-2000) })
    const timer = setTimeout(() => child.kill('SIGKILL'), TIMEOUT)
    child.on('error', error => { clearTimeout(timer); fail(error) })
    child.on('close', code => { clearTimeout(timer); code === 0 ? done() : fail(new Error(`Przeglądarka zakończyła się kodem ${code}. ${stderr.trim().split('\n').at(-1) || ''}`.trim())) })
  })
}

let queue = Promise.resolve()

/** Zwraca PNG (bufor) z widokiem 1280×800 strony pod adresem `url`. */
export function captureScreenshot(url, { resolve }) {
  const job = queue.then(async () => {
    const binary = browserPath()
    if (!binary) throw new Error('Na serwerze nie ma przeglądarki do zrzutów (Chromium).')
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'link-shot-'))
    const proxy = await startGuardProxy(resolve)
    try {
      const output = path.join(dir, 'shot.png')
      await run(binary, [
        '--headless=new',
        '--no-sandbox',
        '--use-angle=swiftshader',
        '--enable-unsafe-swiftshader',
        '--disable-dev-shm-usage',
        '--disable-extensions',
        '--disable-sync',
        '--disable-background-networking',
        '--disable-component-update',
        '--disable-default-apps',
        '--disable-features=Translate,MediaRouter,OptimizationHints,InterestFeedContentSuggestions',
        '--force-webrtc-ip-handling-policy=disable_non_proxied_udp',
        '--no-first-run',
        '--no-default-browser-check',
        '--mute-audio',
        '--hide-scrollbars',
        '--force-color-profile=srgb',
        '--force-device-scale-factor=1',
        '--lang=pl-PL',
        `--user-data-dir=${path.join(dir, 'profile')}`,
        `--proxy-server=http://127.0.0.1:${proxy.address().port}`,
        '--proxy-bypass-list=<-loopback>',
        `--window-size=${WIDTH},${HEIGHT}`,
        '--virtual-time-budget=9000',
        '--run-all-compositor-stages-before-draw',
        `--screenshot=${output}`,
        url,
      ])
      // Bez pliku = przeglądarka nie wczytała strony (np. adres zablokowany przez pośrednika).
      return await fs.readFile(output).catch(() => { throw new Error('Strona nie dała się wczytać w przeglądarce.') })
    } finally {
      proxy.close()
      proxy.closeAllConnections?.()
      await fs.rm(dir, { recursive: true, force: true, maxRetries: 3, retryDelay: 300 }).catch(() => {})
    }
  })
  queue = job.catch(() => {})
  return job
}
