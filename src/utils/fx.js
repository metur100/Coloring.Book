// src/utils/fx.js
// Full-screen particle layer for playful visual effects (bursts, sparkles, confetti).
// Coordinates are client (screen) pixels, so any component can use it.

const RAINBOW = ['#ff595e', '#ffca3a', '#8ac926', '#1982c4', '#6a4c93', '#ff85c0', '#00c2d1']

let canvas = null
let ctx = null
let particles = []
let rings = []
let raf = 0
let dpr = 1

function ensureCanvas() {
  if (canvas) return true
  if (typeof document === 'undefined') return false
  canvas = document.createElement('canvas')
  Object.assign(canvas.style, {
    position: 'fixed',
    inset: '0',
    width: '100vw',
    height: '100vh',
    pointerEvents: 'none',
    zIndex: '9999',
  })
  document.body.appendChild(canvas)
  ctx = canvas.getContext('2d')
  const resize = () => {
    dpr = Math.min(window.devicePixelRatio || 1, 2)
    canvas.width = Math.round(window.innerWidth * dpr)
    canvas.height = Math.round(window.innerHeight * dpr)
  }
  resize()
  window.addEventListener('resize', resize)
  return true
}

function drawStar(c, r) {
  c.beginPath()
  for (let i = 0; i < 10; i++) {
    const rad = i % 2 === 0 ? r : r * 0.45
    const a = (Math.PI / 5) * i - Math.PI / 2
    c.lineTo(Math.cos(a) * rad, Math.sin(a) * rad)
  }
  c.closePath()
  c.fill()
}

function drawHeart(c, r) {
  c.beginPath()
  c.moveTo(0, r * 0.35)
  c.bezierCurveTo(-r * 1.1, -r * 0.4, -r * 0.45, -r * 1.1, 0, -r * 0.45)
  c.bezierCurveTo(r * 0.45, -r * 1.1, r * 1.1, -r * 0.4, 0, r * 0.35)
  c.fill()
}

function loop() {
  const W = canvas.width
  const H = canvas.height
  ctx.setTransform(1, 0, 0, 1, 0, 0)
  ctx.clearRect(0, 0, W, H)
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

  rings = rings.filter((r) => {
    r.life -= 1 / 30
    if (r.life <= 0) return false
    const k = 1 - r.life
    ctx.globalAlpha = r.life
    ctx.strokeStyle = r.color
    ctx.lineWidth = 8 * r.life
    ctx.beginPath()
    ctx.arc(r.x, r.y, 10 + k * r.max, 0, Math.PI * 2)
    ctx.stroke()
    return true
  })

  particles = particles.filter((p) => {
    p.life -= p.decay
    if (p.life <= 0 || p.y > window.innerHeight + 40) return false
    p.vx *= p.drag
    p.vy = p.vy * p.drag + p.gravity
    p.x += p.vx
    p.y += p.vy
    p.rot += p.spin

    ctx.save()
    ctx.globalAlpha = Math.min(1, p.life * 1.5)
    ctx.translate(p.x, p.y)
    ctx.rotate(p.rot)
    ctx.fillStyle = p.color
    const s = p.size * (p.shrink ? p.life : 1)
    if (p.shape === 'star') drawStar(ctx, s)
    else if (p.shape === 'heart') drawHeart(ctx, s)
    else if (p.shape === 'rect') {
      // Confetti flutters by squashing its width
      ctx.fillRect(-s, -s * 0.5 * Math.abs(Math.cos(p.rot * 2)), s * 2, s * Math.abs(Math.cos(p.rot * 2)))
    } else {
      ctx.beginPath()
      ctx.arc(0, 0, s, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.restore()
    return true
  })

  if (particles.length || rings.length) {
    raf = requestAnimationFrame(loop)
  } else {
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.clearRect(0, 0, W, H)
    raf = 0
  }
}

function start() {
  if (!raf) raf = requestAnimationFrame(loop)
}

function add(p) {
  particles.push({
    rot: Math.random() * Math.PI * 2,
    spin: (Math.random() - 0.5) * 0.3,
    drag: 0.96,
    gravity: 0.25,
    decay: 0.02,
    shrink: true,
    ...p,
  })
}

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)]

// Explosion of stars, hearts and dots in the given color (plus a few rainbow ones)
export function burst(x, y, color, count = 26) {
  if (!ensureCanvas()) return
  const colors = color ? [color, color, color, ...RAINBOW] : RAINBOW
  for (let i = 0; i < count; i++) {
    const a = Math.random() * Math.PI * 2
    const speed = 3 + Math.random() * 7
    add({
      x,
      y,
      vx: Math.cos(a) * speed,
      vy: Math.sin(a) * speed - 2,
      size: 5 + Math.random() * 8,
      color: pick(colors),
      shape: pick(['star', 'star', 'heart', 'dot']),
      decay: 0.015 + Math.random() * 0.015,
    })
  }
  rings.push({ x, y, color: color || '#fff', life: 1, max: 90 })
  start()
}

// A couple of tiny twinkles along a brush stroke
export function sparkle(x, y, color) {
  if (!ensureCanvas()) return
  for (let i = 0; i < 2; i++) {
    add({
      x: x + (Math.random() - 0.5) * 20,
      y: y + (Math.random() - 0.5) * 20,
      vx: (Math.random() - 0.5) * 2,
      vy: -1 - Math.random() * 2,
      size: 3 + Math.random() * 4,
      color: Math.random() < 0.6 ? color : '#fff6a8',
      shape: 'star',
      gravity: 0.05,
      decay: 0.035,
    })
  }
  start()
}

// Soap bubbles for the eraser
export function bubbles(x, y) {
  if (!ensureCanvas()) return
  add({
    x: x + (Math.random() - 0.5) * 24,
    y: y + (Math.random() - 0.5) * 24,
    vx: (Math.random() - 0.5) * 1.5,
    vy: -1.5 - Math.random() * 1.5,
    size: 4 + Math.random() * 6,
    color: pick(['#bde0fe', '#ffc8dd', '#cdb4db', '#caffbf']),
    shape: 'dot',
    gravity: -0.02,
    decay: 0.03,
    shrink: false,
  })
  start()
}

// Confetti rain over the whole screen
export function confetti(count = 140) {
  if (!ensureCanvas()) return
  const w = window.innerWidth
  for (let i = 0; i < count; i++) {
    add({
      x: Math.random() * w,
      y: -20 - Math.random() * window.innerHeight * 0.5,
      vx: (Math.random() - 0.5) * 4,
      vy: 2 + Math.random() * 4,
      size: 5 + Math.random() * 6,
      color: pick(RAINBOW),
      shape: pick(['rect', 'rect', 'star', 'heart']),
      gravity: 0.08,
      drag: 0.99,
      decay: 0.006,
      shrink: false,
    })
  }
  start()
}

// Burst centered on an element (e.g. the button that was tapped)
export function burstAt(el, color, count = 16) {
  if (!el) return
  const r = el.getBoundingClientRect()
  burst(r.left + r.width / 2, r.top + r.height / 2, color, count)
}
