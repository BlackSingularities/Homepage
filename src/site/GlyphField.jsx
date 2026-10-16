import { useEffect, useRef } from 'react'

/**
 * Tło z „systemowych” znaków – ten sam układ, co w Arcadii: siatka losowych
 * liter i cyfr, przez którą powoli przepływają jaśniejsze, złote skupiska
 * (szum wartości w 2D). Kliknięcie w puste tło wypuszcza falę, która
 * rozjaśnia i przetasowuje znaki po drodze, a kursor podświetla otoczenie.
 *
 * Rysujemy przez `drawImage` z przygotowanego atlasu glifów – to wielokrotnie
 * szybsze niż `fillText` dla kilku tysięcy znaków na klatkę. Animacja chodzi
 * w ~30 fps, zatrzymuje się w ukrytej karcie, a przy `prefers-reduced-motion`
 * rysujemy tylko pojedyncze klatki po kliknięciu.
 */

const CHARS = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
const CELL_W = 11
const CELL_H = 15
const FONT_PX = 11
const FRAME_MS = 1000 / 30
const LEVELS = 10

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
 * Gęstość dymu w punkcie siatki.
 *
 * Najpierw zniekształcamy współrzędne drugim polem szumu (domain warping) –
 * to od tego biorą się kłęby i smugi zamiast równych plam. Dopiero tak
 * przesuniętą próbkę czytamy trzema oktawami: pierwsza daje bryłę, kolejne
 * strzępią jej brzegi. Całość powoli unosi się do góry, a drobne oktawy
 * płyną szybciej niż bryła, więc dym kłębi się w miejscu, a nie tylko jedzie.
 */
function smoke(nx, ny, t, seed) {
  const wx = valueNoise(nx * 0.55 + t * 0.021, ny * 0.55 - t * 0.055, seed + 31) - 0.5
  const wy = valueNoise(nx * 0.55 - t * 0.017, ny * 0.55 - t * 0.047, seed + 57) - 0.5
  const sx = nx + wx * 2.4
  const sy = ny - t * 0.09 + wy * 2.4
  return valueNoise(sx * 0.8, sy * 0.6, seed) * 0.56
    + valueNoise(sx * 1.9, sy * 1.5 - t * 0.13, seed + 7) * 0.3
    + valueNoise(sx * 4.1, sy * 3.2 - t * 0.21, seed + 11) * 0.14
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
    let dim = null
    let glow = null
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
      dim = buildAtlas('#a3998a', dpr)
      glow = buildAtlas('#e0b773', dpr)
    }

    const draw = now => {
      if (!dim || !glow) return
      const t = (now - start) / 1000
      ctx.setTransform(1, 0, 0, 1, 0, 0)
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

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
        // kolumny czytamy gęściej niż wiersze, więc kłęby są wyższe niż szersze
        const ny = row / 21
        for (let col = 0; col < cols; col += 1) {
          const idx = row * cols + col
          const px = col * CELL_W
          const nx = col / 26

          // Progi dobrane tak, żeby dym zapalał mniej więcej co szósty znak:
          // reszta ekranu zostaje ciemna i kłęby mają kształt, zamiast zlewać
          // się w jednolitą ścianę.
          let level = smoothstep(0.56, 0.72, smoke(nx, ny, t, seed))

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

          if (Math.random() < 0.002 + h * 0.045) glyphs[idx] = Math.floor(Math.random() * CHARS.length)

          // Kontrast robi różnica między warstwami: znaki poza dymem są ledwie
          // widoczne, rozświetlone – wyraźnie jasne. Dzięki temu dym ma kształt,
          // zamiast rozmywać się w równomierną szarość.
          const density = Math.min(1, h)
          const sx = glyphs[idx] * sw
          const base = 0.016 + hash(col, row, seed + 3) * 0.026
          ctx.globalAlpha = Math.min(1, base * (1 - density * 0.85) * intensity)
          ctx.drawImage(dim, sx, 0, sw, sh, px, py, CELL_W, CELL_H)
          if (density > 0.06) {
            const q = Math.min(LEVELS, Math.ceil(density * LEVELS)) / LEVELS
            ctx.globalAlpha = Math.min(0.92, Math.pow(q, 1.6) * 0.9 * intensity)
            ctx.drawImage(glow, sx, 0, sw, sh, px, py, CELL_W, CELL_H)
          }
        }
      }
      ctx.globalAlpha = 1
    }

    const loop = now => {
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
      if (document.hidden) cancelAnimationFrame(raf)
      else {
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
      if (!reduced) raf = requestAnimationFrame(loop)
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
    return () => {
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
