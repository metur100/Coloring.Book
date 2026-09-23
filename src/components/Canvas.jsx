import {
  forwardRef,
  useRef,
  useImperativeHandle,
  useEffect,
  useCallback,
  useState,
  useMemo,
} from 'react'
import { floodFill, hexToRgba } from '../utils/floodFill.js'
import { loadProgress, saveProgress, throttle } from '../utils/storage.js'
import styles from './Canvas.module.css'

const Canvas = forwardRef(function Canvas({ tool, color, brushSize, image }, ref) {
  const viewportRef = useRef(null)
  const stageRef = useRef(null)

  const bgRef = useRef(null)
  const ovRef = useRef(null)

  const history = useRef([])

  const [ready, setReady] = useState(false)

  // View transform: content point (cx, cy) is shown at (x + cx*s, y + cy*s) in the viewport
  const view = useRef({ x: 0, y: 0, s: 1 })
  const fitScaleRef = useRef(1)
  const [zoomedIn, setZoomedIn] = useState(false)

  // Active pointers (id → viewport-relative position)
  const pointers = useRef(new Map())

  // Gesture state: 'idle' | 'pending' (tap or drag, undecided) | 'draw' | 'pan' | 'pinch'
  const gesture = useRef({
    mode: 'idle',
    startX: 0,
    startY: 0,
    viewX: 0,
    viewY: 0,
    startDist: 0,
    startScale: 1,
    anchorCx: 0,
    anchorCy: 0,
    strokeStart: 0,
    last: { cx: 0, cy: 0 },
  })

  const rafId = useRef(0)

  const clamp = (v, a, b) => Math.max(a, Math.min(b, v))
  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y)

  // A finger that moves less than this is a tap, not a drag
  const TAP_SLOP = 12
  // A stroke this young is treated as accidental when a second finger lands
  const ACCIDENTAL_STROKE_MS = 300
  const MAX_ZOOM = 6

  // ── FUN EFFECTS settings ───────────────────────────────────────
  const FUN = useMemo(() => {
    const glow = clamp(brushSize * 0.9, 6, 26)
    const alpha = 0.95
    const sparkleChance = 0.22 // 0..1 per segment
    const sparkleSizeMin = 1
    const sparkleSizeMax = clamp(brushSize * 0.22, 2, 8)
    return { glow, alpha, sparkleChance, sparkleSizeMin, sparkleSizeMax }
  }, [brushSize])

  const sprinkleSparkles = useCallback((ctx, x, y, rgba) => {
    // A few tiny dots around the path point
    // rgba like [r,g,b,255]
    const count = 1 + Math.floor(Math.random() * 3) // 1..3
    for (let i = 0; i < count; i++) {
      const ang = Math.random() * Math.PI * 2
      const rad = 2 + Math.random() * 8
      const sx = x + Math.cos(ang) * rad
      const sy = y + Math.sin(ang) * rad
      const r = FUN.sparkleSizeMin + Math.random() * (FUN.sparkleSizeMax - FUN.sparkleSizeMin)

      ctx.save()
      ctx.globalCompositeOperation = 'lighter'
      ctx.globalAlpha = 0.55
      ctx.fillStyle = `rgba(${rgba[0]},${rgba[1]},${rgba[2]},1)`
      ctx.shadowColor = `rgba(${rgba[0]},${rgba[1]},${rgba[2]},1)`
      ctx.shadowBlur = FUN.glow
      ctx.beginPath()
      ctx.arc(sx, sy, r, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()
    }
  }, [FUN])

  // ── Saving ─────────────────────────────────────────────────────
  const lastSavedHashRef = useRef('')

  const makeOverlayDataURL = useCallback(() => {
    const ov = ovRef.current
    if (!ov) return null
    try {
      return ov.toDataURL('image/png')
    } catch {
      return null
    }
  }, [])

  const flushSave = useCallback(async () => {
    const dataURL = makeOverlayDataURL()
    if (!dataURL) return

    const hash = String(dataURL.length)
    if (hash === lastSavedHashRef.current) return
    lastSavedHashRef.current = hash

    await saveProgress(image.id, dataURL)
  }, [image.id, makeOverlayDataURL])

  const scheduleSave = useMemo(() => throttle(() => flushSave(), 600), [flushSave])

  useEffect(() => {
    return () => {
      flushSave()
    }
  }, [flushSave])

  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === 'hidden') flushSave()
    }
    window.addEventListener('pagehide', flushSave)
    document.addEventListener('visibilitychange', onVis)
    window.addEventListener('beforeunload', flushSave)

    return () => {
      window.removeEventListener('pagehide', flushSave)
      document.removeEventListener('visibilitychange', onVis)
      window.removeEventListener('beforeunload', flushSave)
    }
  }, [flushSave])

  // ── History ────────────────────────────────────────────────────
  const pushHistory = () => {
    const ov = ovRef.current
    if (!ov) return
    history.current.push(ov.getContext('2d').getImageData(0, 0, ov.width, ov.height))
    if (history.current.length > 50) history.current.shift()
  }

  // ── View (pan/zoom) ────────────────────────────────────────────
  const computeFitScale = useCallback(() => {
    const vp = viewportRef.current
    const bg = bgRef.current
    if (!vp || !bg || !bg.width || !bg.height) return 1
    const pad = 12
    const vw = Math.max(1, vp.clientWidth - pad * 2)
    const vh = Math.max(1, vp.clientHeight - pad * 2)
    return Math.min(vw / bg.width, vh / bg.height)
  }, [])

  // Keep the picture on screen: centered when smaller than the viewport,
  // otherwise edges can't be dragged further in than a small margin.
  const clampView = useCallback((v) => {
    const vp = viewportRef.current
    const bg = bgRef.current
    if (!vp || !bg) return v
    const vw = vp.clientWidth
    const vh = vp.clientHeight
    const w = bg.width * v.s
    const h = bg.height * v.s
    const margin = 24
    const x = w <= vw ? (vw - w) / 2 : clamp(v.x, vw - w - margin, margin)
    const y = h <= vh ? (vh - h) / 2 : clamp(v.y, vh - h - margin, margin)
    return { x, y, s: v.s }
  }, [])

  const applyView = useCallback(
    (next) => {
      const v = clampView(next)
      view.current = v
      const stage = stageRef.current
      if (stage) stage.style.transform = `translate3d(${v.x}px, ${v.y}px, 0) scale(${v.s})`
      setZoomedIn(v.s > fitScaleRef.current * 1.05)
    },
    [clampView]
  )

  const fitView = useCallback(() => {
    const fit = computeFitScale()
    fitScaleRef.current = fit
    applyView({ x: 0, y: 0, s: fit })
  }, [computeFitScale, applyView])

  // Zoom to scale `s` keeping viewport point (vx, vy) fixed
  const zoomAt = useCallback(
    (s, vx, vy) => {
      const v = view.current
      const next = clamp(s, fitScaleRef.current, fitScaleRef.current * MAX_ZOOM)
      const cx = (vx - v.x) / v.s
      const cy = (vy - v.y) / v.s
      applyView({ x: vx - cx * next, y: vy - cy * next, s: next })
    },
    [applyView]
  )

  // ── Load image + restore progress ──────────────────────────────
  useEffect(() => {
    const bg = bgRef.current
    const ov = ovRef.current
    const vp = viewportRef.current
    if (!bg || !ov || !vp) return

    setReady(false)
    lastSavedHashRef.current = ''

    const img = new Image()
    img.decoding = 'async'

    img.onload = async () => {
      const maxW = 2200
      const s = Math.min(1, maxW / img.naturalWidth)

      bg.width = Math.round(img.naturalWidth * s)
      bg.height = Math.round(img.naturalHeight * s)
      ov.width = bg.width
      ov.height = bg.height

      bg.getContext('2d').drawImage(img, 0, 0, bg.width, bg.height)

      const saved = await loadProgress(image.id)
      const ovCtx = ov.getContext('2d')

      if (saved) {
        const prev = new Image()
        prev.decoding = 'async'
        prev.onload = () => {
          ovCtx.drawImage(prev, 0, 0)
          setReady(true)
        }
        prev.onerror = () => {
          ovCtx.fillStyle = '#ffffff'
          ovCtx.fillRect(0, 0, ov.width, ov.height)
          setReady(true)
        }
        prev.src = saved
      } else {
        ovCtx.fillStyle = '#ffffff'
        ovCtx.fillRect(0, 0, ov.width, ov.height)
        setReady(true)
      }

      history.current = []

      fitView()
    }

    img.onerror = (e) => {
      console.error('Background image failed to load', e)
      setReady(true)
    }

    img.src = image.src
  }, [image, fitView])

  // Re-fit on resize / orientation change
  useEffect(() => {
    const vp = viewportRef.current
    if (!vp) return
    const onResize = () => {
      const wasFit = view.current.s <= fitScaleRef.current * 1.05
      const fit = computeFitScale()
      fitScaleRef.current = fit
      if (wasFit) applyView({ x: 0, y: 0, s: fit })
      else applyView({ ...view.current, s: clamp(view.current.s, fit, fit * MAX_ZOOM) })
    }
    const ro = new ResizeObserver(onResize)
    ro.observe(vp)
    return () => ro.disconnect()
  }, [computeFitScale, applyView])

  // ── Exposed methods ────────────────────────────────────────────
  const undo = useCallback(() => {
    const ov = ovRef.current
    if (!ov || !history.current.length) return
    ov.getContext('2d').putImageData(history.current.pop(), 0, 0)
    flushSave()
  }, [flushSave])

  const clear = useCallback(() => {
    const ov = ovRef.current
    if (!ov) return
    pushHistory()
    const ctx = ov.getContext('2d')
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, ov.width, ov.height)
    flushSave()
  }, [flushSave])

  const save = useCallback(() => {
    const bg = bgRef.current
    const ov = ovRef.current
    if (!bg || !ov) return

    flushSave()

    const out = document.createElement('canvas')
    out.width = bg.width
    out.height = bg.height

    const ctx = out.getContext('2d')
    ctx.drawImage(bg, 0, 0)
    ctx.globalCompositeOperation = 'multiply'
    ctx.drawImage(ov, 0, 0)

    const a = document.createElement('a')
    a.download = `${image.name.replace(/\.[^.]+$/, '')}-colored.png`
    a.href = out.toDataURL('image/png')
    a.click()
  }, [image.name, flushSave])

  useImperativeHandle(ref, () => ({ undo, clear, save, flushSave }))

  // ── Fill (with a fun "pop") ────────────────────────────────────
  const doFill = useCallback(
    (x, y) => {
      const bg = bgRef.current
      const ov = ovRef.current
      if (!bg || !ov) return

      const tmp = document.createElement('canvas')
      tmp.width = bg.width
      tmp.height = bg.height
      const tCtx = tmp.getContext('2d')
      tCtx.drawImage(bg, 0, 0)
      tCtx.globalCompositeOperation = 'multiply'
      tCtx.drawImage(ov, 0, 0)
      tCtx.globalCompositeOperation = 'source-over'

      const ix = Math.floor(x)
      const iy = Math.floor(y)
      if (ix < 0 || ix >= tmp.width || iy < 0 || iy >= tmp.height) return

      const imgData = tCtx.getImageData(0, 0, tmp.width, tmp.height)
      floodFill(imgData, ix, iy, hexToRgba(color))

      const ovCtx = ov.getContext('2d')
      const ovData = ovCtx.getImageData(0, 0, ov.width, ov.height)
      const [fR, fG, fB] = hexToRgba(color)

      for (let i = 0; i < imgData.data.length; i += 4) {
        if (imgData.data[i] === fR && imgData.data[i + 1] === fG && imgData.data[i + 2] === fB) {
          ovData.data[i] = fR
          ovData.data[i + 1] = fG
          ovData.data[i + 2] = fB
          ovData.data[i + 3] = 255
        }
      }

      ovCtx.putImageData(ovData, 0, 0)

      // Fun: little flash / pop animation
      ov.classList.remove(styles.pop)
      // force reflow
      void ov.offsetWidth
      ov.classList.add(styles.pop)

      flushSave()
    },
    [color, flushSave]
  )

  // ── Pointer events ─────────────────────────────────────────────
  // One finger: pen/eraser draw, fill taps (and drags to move), hand moves.
  // Two fingers: move + zoom at the same time, with any tool.
  useEffect(() => {
    const vp = viewportRef.current
    const ov = ovRef.current
    if (!vp || !ov) return

    const g = gesture.current

    const toViewport = (e) => {
      const rect = vp.getBoundingClientRect()
      return { x: e.clientX - rect.left, y: e.clientY - rect.top }
    }

    const toContent = (p) => {
      const v = view.current
      return { cx: (p.x - v.x) / v.s, cy: (p.y - v.y) / v.s }
    }

    const setStyle = (ctx) => {
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      ctx.globalCompositeOperation = 'source-over'
      if (tool === 'eraser') {
        ctx.shadowBlur = 0
        ctx.globalAlpha = 1
        ctx.lineWidth = brushSize * 3
        ctx.strokeStyle = '#ffffff'
        ctx.fillStyle = '#ffffff'
      } else {
        ctx.globalAlpha = FUN.alpha
        ctx.lineWidth = brushSize
        ctx.strokeStyle = color
        ctx.fillStyle = color
        ctx.shadowColor = color
        ctx.shadowBlur = FUN.glow
      }
    }

    const drawDot = ({ cx, cy }) => {
      const ctx = ov.getContext('2d')
      setStyle(ctx)
      ctx.beginPath()
      ctx.arc(cx, cy, ctx.lineWidth / 2, 0, Math.PI * 2)
      ctx.fill()
    }

    const drawSegment = (to) => {
      const ctx = ov.getContext('2d')
      setStyle(ctx)
      ctx.beginPath()
      ctx.moveTo(g.last.cx, g.last.cy)
      ctx.lineTo(to.cx, to.cy)
      ctx.stroke()
      if (tool === 'pen' && Math.random() < FUN.sparkleChance) {
        sprinkleSparkles(ctx, to.cx, to.cy, hexToRgba(color))
      }
      g.last = to
    }

    const startPan = (p) => {
      g.mode = 'pan'
      g.startX = p.x
      g.startY = p.y
      g.viewX = view.current.x
      g.viewY = view.current.y
    }

    const startPinch = () => {
      const [p1, p2] = [...pointers.current.values()]
      const mid = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 }
      const { cx, cy } = toContent(mid)
      g.mode = 'pinch'
      g.startDist = dist(p1, p2) || 1
      g.startScale = view.current.s
      g.anchorCx = cx
      g.anchorCy = cy
    }

    const endStroke = () => {
      if (g.mode === 'draw') flushSave()
    }

    const onPointerDown = (e) => {
      e.preventDefault()
      const p = toViewport(e)
      pointers.current.set(e.pointerId, p)
      vp.setPointerCapture?.(e.pointerId)

      if (pointers.current.size === 2) {
        // Second finger: a stroke that just started was almost surely the
        // first finger of a pinch, so take it back.
        if (g.mode === 'draw') {
          if (performance.now() - g.strokeStart < ACCIDENTAL_STROKE_MS && history.current.length) {
            ov.getContext('2d').putImageData(history.current.pop(), 0, 0)
          } else {
            flushSave()
          }
        }
        startPinch()
        return
      }
      if (pointers.current.size > 2) return

      // Right/middle mouse button always moves the picture
      if (e.pointerType === 'mouse' && e.button !== 0) {
        startPan(p)
        return
      }

      if (tool === 'hand') {
        startPan(p)
        return
      }

      if (tool === 'fill') {
        // Decide on move/up: a tap fills, a drag moves the picture
        g.mode = 'pending'
        g.startX = p.x
        g.startY = p.y
        g.viewX = view.current.x
        g.viewY = view.current.y
        return
      }

      // pen / eraser
      pushHistory()
      g.mode = 'draw'
      g.strokeStart = performance.now()
      g.last = toContent(p)
      drawDot(g.last)
      scheduleSave()
    }

    const onPointerMove = (e) => {
      if (!pointers.current.has(e.pointerId)) return
      e.preventDefault()
      const p = toViewport(e)
      pointers.current.set(e.pointerId, p)

      if (g.mode === 'pinch') {
        if (pointers.current.size < 2) return
        const [p1, p2] = [...pointers.current.values()]
        const mid = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 }
        const s = clamp(
          g.startScale * (dist(p1, p2) / g.startDist),
          fitScaleRef.current,
          fitScaleRef.current * MAX_ZOOM
        )
        // Keep the content point that started under the fingers under them
        applyView({ x: mid.x - g.anchorCx * s, y: mid.y - g.anchorCy * s, s })
        return
      }

      if (g.mode === 'pending') {
        if (Math.hypot(p.x - g.startX, p.y - g.startY) < TAP_SLOP) return
        g.mode = 'pan'
      }

      if (g.mode === 'pan') {
        cancelAnimationFrame(rafId.current)
        rafId.current = requestAnimationFrame(() => {
          applyView({
            x: g.viewX + (p.x - g.startX),
            y: g.viewY + (p.y - g.startY),
            s: view.current.s,
          })
        })
        return
      }

      if (g.mode === 'draw') {
        const events = e.getCoalescedEvents?.() ?? [e]
        for (const ce of events.length ? events : [e]) drawSegment(toContent(toViewport(ce)))
        scheduleSave()
      }
    }

    const onPointerUp = (e) => {
      if (!pointers.current.has(e.pointerId)) return
      pointers.current.delete(e.pointerId)
      const remaining = pointers.current.size

      if (g.mode === 'pinch') {
        // Lifting one finger of a pinch keeps moving with the other one
        if (remaining === 1) startPan([...pointers.current.values()][0])
        else if (remaining === 0) g.mode = 'idle'
        return
      }

      if (remaining > 0) return

      if (g.mode === 'pending' && e.type === 'pointerup') {
        pushHistory()
        const { cx, cy } = toContent({ x: g.startX, y: g.startY })
        doFill(cx, cy)
      }

      endStroke()
      g.mode = 'idle'
    }

    const onWheel = (e) => {
      e.preventDefault()
      const p = toViewport(e)
      zoomAt(view.current.s * Math.exp(-e.deltaY * 0.0015), p.x, p.y)
    }

    const onContextMenu = (e) => e.preventDefault()

    vp.addEventListener('pointerdown', onPointerDown, { passive: false })
    vp.addEventListener('pointermove', onPointerMove, { passive: false })
    vp.addEventListener('pointerup', onPointerUp)
    vp.addEventListener('pointercancel', onPointerUp)
    vp.addEventListener('wheel', onWheel, { passive: false })
    vp.addEventListener('contextmenu', onContextMenu)

    return () => {
      cancelAnimationFrame(rafId.current)
      vp.removeEventListener('pointerdown', onPointerDown)
      vp.removeEventListener('pointermove', onPointerMove)
      vp.removeEventListener('pointerup', onPointerUp)
      vp.removeEventListener('pointercancel', onPointerUp)
      vp.removeEventListener('wheel', onWheel)
      vp.removeEventListener('contextmenu', onContextMenu)
    }
  }, [tool, color, brushSize, doFill, flushSave, scheduleSave, sprinkleSparkles, FUN, applyView, zoomAt])

  return (
    <div
      ref={viewportRef}
      className={styles.viewport}
      aria-busy={!ready}
      style={{ cursor: tool === 'hand' || tool === 'fill' ? 'grab' : 'crosshair' }}
    >
      <div ref={stageRef} className={styles.stage}>
        <canvas ref={bgRef} className={styles.canvas} />
        <canvas ref={ovRef} className={`${styles.canvas} ${styles.overlay}`} />
      </div>

      {zoomedIn && (
        <button
          type="button"
          className={styles.fitBtn}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={fitView}
          aria-label="Show the whole picture"
          title="Show the whole picture"
        >
          🖼️
        </button>
      )}
    </div>
  )
})

export default Canvas
