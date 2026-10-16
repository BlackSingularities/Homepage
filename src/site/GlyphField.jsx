import { useEffect, useRef } from 'react'

/**
 * Tło z „systemowych” znaków – ten sam układ, co w Arcadii: siatka losowych
 * liter i cyfr, przez którą unoszą się jaśniejsze, złote smugi dymu
 * (szum wartości w 3D, z czasem jako trzecim wymiarem). Kliknięcie w puste tło wypuszcza falę, która
 * rozjaśnia i przetasowuje znaki po drodze, a kursor podświetla otoczenie.
 *
 * Wydajność: ciemne, nieruchome znaki rysujemy raz do bufora i co klatkę
 * kopiujemy go jednym `drawImage`. Na bieżąco liczymy tylko szum na rzadszej
 * siatce i rysujemy jasne znaki w dymie (z atlasu glifów, nie `fillText`).
 * Animacja chodzi w ~30 fps, staje w ukrytej karcie i wtedy, gdy pierwszy
 * ekran jest przewinięty, a tło zasłania treść. Przy `prefers-reduced-motion`
 * rysujemy tylko pojedyncze klatki po kliknięciu.
 */

const CHARS = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
const CELL_W = 11
const CELL_H = 15
const FONT_PX = 11
const FRAME_MS = 1000 / 30
// Szum liczymy co drugą kolumnę i wiersz, a między punktami interpolujemy:
// dym jest i tak miękki, a obliczeń jest czterokrotnie mniej.
const STEP = 2

// deterministyczny hash siatki → [0, 1)
function hash(ix, iy, seed) {
  let h = (ix * 374761393 + iy * 668265263 + seed * 2147483647) | 0
  h = Math.imul(h ^ (h >>> 13), 1274126177)
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296
}

function valueNoise(x, y, seed) {
  const ix = Math.floor(x)
  const iy = Math.floor(y)
  const fx = x - ix
  const fy = y - iy
  const sx = fx * fx * (3 - 2 * fx)
  const sy = fy * fy * (3 - 2 * fy)
  const a = hash(ix, iy, seed)
  const b = hash(ix + 1, iy, seed)
  const c = hash(ix, iy + 1, seed)
  const d = hash(ix + 1, iy + 1, seed)
  return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy
}

/** Miękkie przejście między progami – bez niego dym ma twarde krawędzie. */
function smoothstep(edge0, edge1, value) {
  const t = Math.min(1, Math.max(0, (value - edge0) / (edge1 - edge0)))
  return t * t * (3 - 2 * t)
}

/**
 * Szum wartości w trzech wymiarach: trzecim jest czas. Kłęby nie tylko się
 * przesuwają, ale też powoli zmieniają kształt – rozwiewają się i zlewają.
 */
function valueNoise3(x, y, z, seed) {
  const iz = Math.floor(z)
  const fz = z - iz
  const sz = fz * fz * (3 - 2 * fz)
  const a = valueNoise(x, y, seed + iz * 101)
  const b = valueNoise(x, y, seed + (iz + 1) * 101)
  return a + (b - a) * sz
}

/**
 * Gęstość dymu w punkcie siatki. `nx`, `ny` to współrzędne szumu, `rise`
 * to wysokość na ekranie od 0 (dół) do 1 (góra).
 *
 * Próbkę czytamy z miejsca przesuniętego w dół o upływ czasu (`ny + t·k`),
 * więc wzór wędruje do góry – dym się unosi, a nie spada. Współrzędne
 * zniekształca drugie pole szumu (domain warping), a im wyżej, tym mocniej
 * smugi falują na boki i tym bardziej dym rzednie, jak nad źródłem.
 */
function smoke(nx, ny, rise, t, seed) {
  const z = t * 0.11
  const wx = valueNoise3(nx * 0.5, ny * 0.5 + t * 0.06, z, seed + 31) - 0.5
  const wy = valueNoise3(nx * 0.5, ny * 0.5 + t * 0.05, z, seed + 57) - 0.5
  const sway = Math.sin(ny * 0.7 + t * 0.35 + nx * 0.2) * 0.45 * rise
  const sx = nx + wx * (1.6 + rise * 2.2) + sway
  const sy = ny + t * 0.16 + wy * 1.8
  const d = valueNoise3(sx * 0.7, sy * 0.45, z, seed) * 0.55
    + valueNoise3(sx * 1.7, sy * 1.1 + t * 0.08, z * 1.6, seed + 7) * 0.3
    + valueNoise3(sx * 3.8, sy * 2.6 + t * 0.14, z * 2.3, seed + 11) * 0.15
  // u dołu dym jest gęsty, ku górze rozrzedza się i strzępi
  return d * (1.08 - rise * 0.32)
}

function buildAtlas(color, dpr) {
  const canvas = document.createElement('canvas')
  canvas.width = Math.ceil(CHARS.length * CELL_W * dpr)
  canvas.height = Math.ceil(CELL_H * dpr)
  const context = canvas.getContext('2d')
  if (!context) return canvas
  context.scale(dpr, dpr)
  const family = getComputedStyle(document.body).getPropertyValue('--font-mono').trim() || 'monospace'
  context.font = `500 ${FONT_PX}px ${family}, ui-monospace, monospace`
  context.textAlign = 'center'
  context.textBaseline = 'middle'
  context.fillStyle = color
  for (let i = 0; i < CHARS.length; i += 1) {
    context.fillText(CHARS[i], i * CELL_W + CELL_W / 2, CELL_H / 2 + 0.5)
  }
  return canvas
}

export default function GlyphField({ intensity = 1 }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return undefined

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const seed = Math.floor(Math.random() * 1000)
    let dpr = 1
    let cols = 0
    let rows = 0
    let width = 0
    let height = 0
    let glyphs = new Uint8Array(0)
    let heat = new Float32Array(0)
    let glow = null
    let dimLayer = null
    let fw = 0
    let fh = 0
    let field = new Float32Array(0)
    let paused = false
    const ripples = []
    const pointer = { x: -9999, y: -9999, active: false }
    let raf = 0
    let last = 0
    let start = performance.now()

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2)
      width = window.innerWidth
      height = window.innerHeight
      canvas.width = Math.round(width * dpr)
      canvas.height = Math.round(height * dpr)
      canvas.style.width = `${width}px`
      canvas.style.height = `${height}px`
      cols = Math.ceil(width / CELL_W) + 1
      rows = Math.ceil(height / CELL_H) + 1
      glyphs = new Uint8Array(cols * rows)
      for (let i = 0; i < glyphs.length; i += 1) glyphs[i] = Math.floor(Math.random() * CHARS.length)
      heat = new Float32Array(cols * rows)
      fw = Math.ceil(cols / STEP) + 1
      fh = Math.ceil(rows / STEP) + 1
      field = new Float32Array(fw * fh)
      const dim = buildAtlas('#a3998a', dpr)
      glow = buildAtlas('#e0b773', dpr)

      // nieruchoma warstwa ciemnych znaków – rysowana raz, nie co klatkę
      dimLayer = document.createElement('canvas')
      dimLayer.width = canvas.width
      dimLayer.height = canvas.height
      const layer = dimLayer.getContext('2d')
      if (!layer) return
      layer.setTransform(dpr, 0, 0, dpr, 0, 0)
      const sw = CELL_W * dpr
      const sh = CELL_H * dpr
      for (let row = 0; row < rows; row += 1) {
        for (let col = 0; col < cols; col += 1) {
          layer.globalAlpha = Math.min(1, (0.016 + hash(col, row, seed + 3) * 0.026) * intensity)
          layer.drawImage(dim, glyphs[row * cols + col] * sw, 0, sw, sh, col * CELL_W, row * CELL_H, CELL_W, CELL_H)
        }
      }
    }

    const draw = now => {
      if (!dimLayer || !glow) return
      const t = (now - start) / 1000
      ctx.setTransform(1, 0, 0, 1, 0, 0)
      ctx.globalAlpha = 1
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(dimLayer, 0, 0)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

      // Szeroki, miękki próg: brzegi dymu przechodzą w tło stopniowo,
      // a większość ekranu zostaje ciemna, więc smugi mają kształt.
      for (let fy = 0; fy < fh; fy += 1) {
        const row = fy * STEP
        // kolumny czytamy gęściej niż wiersze, więc smugi są wyższe niż szersze
        const ny = row / 24
        const rise = Math.max(0, 1 - row / rows)
        for (let fx = 0; fx < fw; fx += 1) {
          field[fy * fw + fx] = smoothstep(0.4, 0.72, smoke((fx * STEP) / 26, ny, rise, t, seed))
        }
      }

      // aktywne fale z kliknięć: promień rośnie liniowo, pierścień gaśnie z czasem
      for (let i = ripples.length - 1; i >= 0; i -= 1) if (now - ripples[i].t0 > 2600) ripples.splice(i, 1)
      const waves = ripples.map(ripple => {
        const age = (now - ripple.t0) / 1000
        return { x: ripple.x, y: ripple.y, r: age * 620, fade: Math.max(0, 1 - age / 2.6) }
      })

      const sw = CELL_W * dpr
      const sh = CELL_H * dpr
      for (let row = 0; row < rows; row += 1) {
        const py = row * CELL_H
        const fy = Math.floor(row / STEP)
        const ty = (row % STEP) / STEP
        for (let col = 0; col < cols; col += 1) {
          const idx = row * cols + col
          const px = col * CELL_W
          const fx = Math.floor(col / STEP)
          const tx = (col % STEP) / STEP
          const i0 = fy * fw + fx
          const top = field[i0] + (field[i0 + 1] - field[i0]) * tx
          const bottom = field[i0 + fw] + (field[i0 + fw + 1] - field[i0 + fw]) * tx
          let level = top + (bottom - top) * ty

          if (pointer.active) {
            const dx = px - pointer.x
            const dy = py - pointer.y
            const d2 = dx * dx + dy * dy
            if (d2 < 32400) level += (1 - Math.sqrt(d2) / 180) * 0.55
          }
          for (const wave of waves) {
            const dx = px - wave.x
            const dy = py - wave.y
            const distance = Math.sqrt(dx * dx + dy * dy)
            const band = Math.abs(distance - wave.r)
            if (band < 70) {
              const k = (1 - band / 70) * wave.fade
              level += k * 1.15
              if (k > 0.35 && Math.random() < 0.5) glyphs[idx] = Math.floor(Math.random() * CHARS.length)
            }
          }

          // ślad po fali stygnie powoli, dzięki czemu znaki „pamiętają” przejście
          const h = Math.max(level, heat[idx] * 0.955)
          heat[idx] = h

          // Poza dymem zostaje gotowa ciemna warstwa – nic tu nie rysujemy.
          const density = Math.min(1, h)
          if (density > 0.04) {
            // znaki w dymie podmieniają się rzadko – migotanie wyglądało jak deszcz
            if (Math.random() < h * 0.018) glyphs[idx] = Math.floor(Math.random() * CHARS.length)
            // ciemny znak spod spodu znika, żeby nie nakładał się na jasny
            ctx.clearRect(px, py, CELL_W, CELL_H)
            const sx = glyphs[idx] * sw
            ctx.globalAlpha = Math.min(0.85, Math.pow(density, 1.5) * 0.9 * intensity)
            ctx.drawImage(glow, sx, 0, sw, sh, px, py, CELL_W, CELL_H)
          }
        }
      }
      ctx.globalAlpha = 1
    }

    const loop = now => {
      if (paused) { raf = 0; return }
      raf = requestAnimationFrame(loop)
      if (now - last < FRAME_MS) return
      last = now
      draw(now)
    }

    // w trybie ograniczonego ruchu animujemy tylko tak długo, jak trwa fala
    let settleTimer = 0
    const animateBriefly = () => {
      if (!reduced) return
      cancelAnimationFrame(raf)
      window.clearTimeout(settleTimer)
      raf = requestAnimationFrame(loop)
      settleTimer = window.setTimeout(() => {
        cancelAnimationFrame(raf)
        draw(performance.now())
      }, 2700)
    }

    const isBackground = target => {
      if (!(target instanceof Element)) return true
      return !target.closest(
        "a, button, input, textarea, select, label, summary, [role='button'], [role='dialog'], [contenteditable], canvas:not(.glyph-field), video, .no-ripple",
      )
    }

    const onPointerDown = event => {
      if (event.button !== 0 || !isBackground(event.target)) return
      ripples.push({ x: event.clientX, y: event.clientY, t0: performance.now() })
      if (ripples.length > 6) ripples.shift()
      animateBriefly()
    }
    const onPointerMove = event => {
      if (event.pointerType !== 'mouse') return
      pointer.x = event.clientX
      pointer.y = event.clientY
      pointer.active = true
    }
    const onPointerLeave = () => { pointer.active = false }
    const onVisibility = () => {
      if (reduced) return
      if (document.hidden) { cancelAnimationFrame(raf); raf = 0 }
      else if (!paused) {
        last = 0
        raf = requestAnimationFrame(loop)
      }
    }
    // Pod pierwszym ekranem tło zasłania nieprzezroczysta treść, więc nie ma
    // sensu go animować – stoi, dopóki czytelnik nie wróci na górę.
    const onScroll = () => {
      const hidden = window.scrollY > window.innerHeight * 1.2
      if (hidden === paused) return
      paused = hidden
      if (!paused && !reduced && !document.hidden && !raf) {
        last = 0
        raf = requestAnimationFrame(loop)
      }
    }
    let resizeTimer = 0
    const onResize = () => {
      window.clearTimeout(resizeTimer)
      resizeTimer = window.setTimeout(() => { resize(); draw(performance.now()) }, 120)
    }

    const boot = () => {
      resize()
      start = performance.now()
      draw(start)
      paused = window.scrollY > window.innerHeight * 1.2
      if (!reduced && !paused) raf = requestAnimationFrame(loop)
    }
    // atlas korzysta z fontu mono, więc czekamy aż się wczyta (z bezpiecznym limitem)
    let cancelled = false
    Promise.race([
      document.fonts?.ready ?? Promise.resolve(),
      new Promise(resolve => setTimeout(resolve, 800)),
    ]).then(() => { if (!cancelled) boot() })

    window.addEventListener('pointerdown', onPointerDown)
    window.addEventListener('pointermove', onPointerMove, { passive: true })
    document.documentElement.addEventListener('pointerleave', onPointerLeave)
    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('resize', onResize)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      cancelled = true
      cancelAnimationFrame(raf)
      window.clearTimeout(settleTimer)
      window.clearTimeout(resizeTimer)
      window.removeEventListener('pointerdown', onPointerDown)
      window.removeEventListener('pointermove', onPointerMove)
      document.documentElement.removeEventListener('pointerleave', onPointerLeave)
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('resize', onResize)
    }
  }, [intensity])

  return (
    <div className="glyph-backdrop" aria-hidden="true">
      <canvas ref={canvasRef} className="glyph-field" />
    </div>
  )
}
