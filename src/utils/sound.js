// src/utils/sound.js
// Tiny synthesizer for playful sound effects (Web Audio API, no audio files).

const MUTE_KEY = 'coloring-book:muted'

let ctx = null
let master = null
let muted = false
const listeners = new Set()

try {
  muted = localStorage.getItem(MUTE_KEY) === '1'
} catch {
  // storage blocked: keep sound on
}

function audio() {
  if (muted) return null
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext
    if (!AC) return null
    ctx = new AC()
    master = ctx.createGain()
    master.gain.value = 0.7
    master.connect(ctx.destination)
  }
  if (ctx.state === 'suspended') ctx.resume()
  return ctx
}

// Browsers only allow audio after a user gesture; wake it on the first touch
if (typeof window !== 'undefined') {
  const unlock = () => {
    audio()
    window.removeEventListener('pointerdown', unlock)
  }
  window.addEventListener('pointerdown', unlock)
}

function tone({ freq, to, type = 'sine', dur = 0.15, vol = 0.2, delay = 0, attack = 0.008 }) {
  const a = audio()
  if (!a) return
  const t = a.currentTime + delay
  const osc = a.createOscillator()
  const gain = a.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(freq, t)
  if (to) osc.frequency.exponentialRampToValueAtTime(to, t + dur)
  gain.gain.setValueAtTime(0.0001, t)
  gain.gain.exponentialRampToValueAtTime(vol, t + attack)
  gain.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  osc.connect(gain).connect(master)
  osc.start(t)
  osc.stop(t + dur + 0.05)
}

let noiseBuffer = null
function noise({ dur = 0.2, vol = 0.15, freq = 1200, to, q = 1, filter = 'bandpass', delay = 0 }) {
  const a = audio()
  if (!a) return
  if (!noiseBuffer) {
    noiseBuffer = a.createBuffer(1, a.sampleRate, a.sampleRate)
    const d = noiseBuffer.getChannelData(0)
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1
  }
  const t = a.currentTime + delay
  const src = a.createBufferSource()
  src.buffer = noiseBuffer
  const f = a.createBiquadFilter()
  f.type = filter
  f.Q.value = q
  f.frequency.setValueAtTime(freq, t)
  if (to) f.frequency.exponentialRampToValueAtTime(to, t + dur)
  const gain = a.createGain()
  gain.gain.setValueAtTime(0.0001, t)
  gain.gain.exponentialRampToValueAtTime(vol, t + 0.01)
  gain.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  src.connect(f).connect(gain).connect(master)
  src.start(t, Math.random() * 0.5)
  src.stop(t + dur + 0.05)
}

// Major pentatonic notes: any order of them sounds nice
const PENTA = [523.25, 587.33, 659.25, 783.99, 880, 1046.5, 1174.66, 1318.51, 1567.98, 1760, 2093]

let lastScribble = 0

export const sfx = {
  tap() {
    tone({ freq: 660, to: 990, type: 'triangle', dur: 0.08, vol: 0.18 })
  },

  tool() {
    tone({ freq: 400, to: 800, type: 'square', dur: 0.07, vol: 0.06 })
    tone({ freq: 800, to: 1200, type: 'triangle', dur: 0.1, vol: 0.15, delay: 0.05 })
  },

  // Every color plays its own musical note
  color(index = 0) {
    const f = PENTA[index % PENTA.length]
    tone({ freq: f, type: 'triangle', dur: 0.25, vol: 0.22 })
    tone({ freq: f * 2, type: 'sine', dur: 0.18, vol: 0.06, delay: 0.02 })
  },

  // Bubbly "bloop" with a sprinkle of sparkles
  fill() {
    tone({ freq: 220, to: 880, type: 'sine', dur: 0.16, vol: 0.3 })
    tone({ freq: 440, to: 1320, type: 'triangle', dur: 0.12, vol: 0.12, delay: 0.06 })
    for (let i = 0; i < 4; i++) {
      const f = PENTA[4 + Math.floor(Math.random() * 7)]
      tone({ freq: f, type: 'sine', dur: 0.12, vol: 0.07, delay: 0.12 + i * 0.05 })
    }
  },

  // Soft crayon scratch, rate-limited while the finger moves
  draw() {
    const now = performance.now()
    if (now - lastScribble < 90) return
    lastScribble = now
    noise({ dur: 0.07, vol: 0.05, freq: 2500 + Math.random() * 2500, q: 2 })
  },

  erase() {
    const now = performance.now()
    if (now - lastScribble < 110) return
    lastScribble = now
    noise({ dur: 0.1, vol: 0.06, freq: 700 + Math.random() * 400, q: 0.8 })
  },

  undo() {
    tone({ freq: 900, to: 300, type: 'triangle', dur: 0.2, vol: 0.2 })
    tone({ freq: 600, to: 200, type: 'sine', dur: 0.18, vol: 0.1, delay: 0.06 })
  },

  clear() {
    noise({ dur: 0.6, vol: 0.22, freq: 300, to: 4000, q: 0.7 })
    tone({ freq: 1200, to: 150, type: 'triangle', dur: 0.5, vol: 0.12 })
  },

  // Little victory fanfare
  save() {
    const notes = [523.25, 659.25, 783.99, 1046.5]
    notes.forEach((f, i) => tone({ freq: f, type: 'triangle', dur: 0.22, vol: 0.2, delay: i * 0.1 }))
    tone({ freq: 1046.5, type: 'square', dur: 0.5, vol: 0.05, delay: 0.4 })
    tone({ freq: 1567.98, type: 'sine', dur: 0.6, vol: 0.12, delay: 0.4 })
    for (let i = 0; i < 6; i++) {
      tone({ freq: PENTA[5 + (i % 6)], type: 'sine', dur: 0.1, vol: 0.06, delay: 0.55 + i * 0.06 })
    }
  },

  open() {
    ;[523.25, 659.25, 783.99].forEach((f, i) =>
      tone({ freq: f, type: 'triangle', dur: 0.14, vol: 0.18, delay: i * 0.07 })
    )
  },

  back() {
    tone({ freq: 700, to: 450, type: 'triangle', dur: 0.12, vol: 0.18 })
    tone({ freq: 450, to: 300, type: 'triangle', dur: 0.12, vol: 0.14, delay: 0.09 })
  },

  upload() {
    ;[0, 1, 2].forEach((i) => tone({ freq: 300 + i * 200, to: 900 + i * 300, type: 'sine', dur: 0.1, vol: 0.2, delay: i * 0.09 }))
  },

  // Cartoon "boing"
  delete() {
    tone({ freq: 300, to: 80, type: 'sawtooth', dur: 0.35, vol: 0.08 })
    tone({ freq: 180, to: 60, type: 'sine', dur: 0.4, vol: 0.25 })
  },

  zoom() {
    tone({ freq: 300, to: 1200, type: 'sine', dur: 0.2, vol: 0.15 })
  },
}

export function isMuted() {
  return muted
}

export function setMuted(value) {
  muted = value
  try {
    localStorage.setItem(MUTE_KEY, value ? '1' : '0')
  } catch {
    // ignore
  }
  if (muted && ctx) ctx.suspend()
  listeners.forEach((fn) => fn(muted))
}

export function onMuteChange(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}
