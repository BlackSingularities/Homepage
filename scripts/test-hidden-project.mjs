import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import fs from 'node:fs/promises'
import net from 'node:net'
import os from 'node:os'
import path from 'node:path'

const root = path.resolve(import.meta.dirname, '..')
const dataDir = await fs.mkdtemp(path.join(os.tmpdir(), 'homepage-hidden-project-'))
let server
let serverOutput = ''

function run(file, env = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [file], {
      cwd: root,
      env: { ...process.env, ...env },
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    let stderr = ''
    child.stderr.on('data', chunk => { stderr += chunk })
    child.on('error', reject)
    child.on('exit', code => code === 0 ? resolve() : reject(new Error(stderr || `${file} exited with ${code}`)))
  })
}

async function freePort() {
  const listener = net.createServer()
  await new Promise((resolve, reject) => listener.once('error', reject).listen(0, '127.0.0.1', resolve))
  const { port } = listener.address()
  await new Promise(resolve => listener.close(resolve))
  return port
}

async function waitForHealth(url) {
  for (let attempt = 0; attempt < 150; attempt += 1) {
    try {
      const response = await fetch(url)
      if (response.ok) return
    } catch {}
    await new Promise(resolve => setTimeout(resolve, 100))
  }
  throw new Error(`Test API did not become healthy\n${serverOutput}`)
}

try {
  const defaults = JSON.parse(await fs.readFile(path.join(root, 'server/content.default.json'), 'utf8'))
  for (const item of defaults.work.items) delete item.hidden
  await fs.writeFile(path.join(dataDir, 'content.json'), `${JSON.stringify(defaults, null, 2)}\n`)

  const migration = path.join(root, 'server/migrate-hide-podrozownik-v6.mjs')
  await run(migration, { DATA_DIR: dataDir })
  await run(migration, { DATA_DIR: dataDir })

  const migrated = JSON.parse(await fs.readFile(path.join(dataDir, 'content.json'), 'utf8'))
  const privateProject = migrated.work.items.find(item => item.id === 'prj-podrozownik')
  assert.equal(privateProject?.hidden, true)

  const port = await freePort()
  server = spawn(process.execPath, ['server/index.mjs'], {
    cwd: root,
    env: {
      ...process.env,
      DATA_DIR: dataDir,
      PORT: String(port),
      SETTINGS_ENCRYPTION_KEY: 'hidden-project-test-only',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  server.stdout.on('data', chunk => { serverOutput += chunk })
  server.stderr.on('data', chunk => { serverOutput += chunk })
  await waitForHealth(`http://127.0.0.1:${port}/health`)

  const response = await fetch(`http://127.0.0.1:${port}/api/content`)
  assert.equal(response.ok, true)
  const publicData = await response.json()
  const leaked = publicData.content.work.items.filter(item => (
    item.id === 'prj-podrozownik' || item.href === '/travels' || item.name === 'Podróżownik'
  ))
  assert.equal(leaked.length, 0)
  console.log('hidden project migration and public API filtering: OK')
} finally {
  server?.kill()
  await fs.rm(dataDir, { recursive: true, force: true })
}
