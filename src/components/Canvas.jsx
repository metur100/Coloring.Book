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

  // Zoom
  const [scaleState, setScaleState] = useState(1)
  const scaleRef = useRef(1)

  const [minScaleState, setMinScaleState] = useState(1)
  const minScaleRef = useRef(1)

  // Pointer tracking
  const pointers = useRef(new Map())

  // Gesture bookkeeping
  const gesture = useRef({
    isPinching: false,
    startDist: 0,
    startScale: 1,
    anchorCx: 0,
    anchorCy: 0,
  })

  // Hand tool (drag to pan)
  const isPanning = useRef(false)
  const panStart = useRef({ x: 0, y: 0, left: 0, top: 0 })

  const rafId = useRef(0)

  const clamp = (v, a, b) => Math.max(a, Math.min(b, v))
  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y)

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

  // ── Fit scale ──────────────────────────────────────────────────
  const computeMinScale = useCallback(() => {
    const vp = viewportRef.current
    const bg = bgRef.current
    if (!vp || !bg || !bg.width || !bg.height) return 1
    const vw = vp.clientWidth
    const vh = vp.clientHeight
    const s = Math.min(vw / bg.width, vh / bg.height)
    return Math.min(1, s)
  }, [])

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

      requestAnimationFrame(() => {
        const ms = computeMinScale()
        minScaleRef.current = ms
        setMinScaleState(ms)

        scaleRef.current = ms
        setScaleState(ms)

        vp.scrollLeft = 0
        vp.scrollTop = 0
      })
    }

    img.onerror = (e) => {
      console.error('Background image failed to load', e)
      setReady(true)
    }

    img.src = image.src
  }, [image, computeMinScale])

  // Recompute minScale on resize/orientation
  useEffect(() => {
    const onResize = () => {
      const ms = computeMinScale()
      minScaleRef.current = ms
      setMinScaleState(ms)

      const next = Math.max(ms, scaleRef.current)
      scaleRef.current = next
      setScaleState(next)
    }

    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [computeMinScale])

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

  // ── Coordinate conversion pointer → content coords ──────────────
  const pointerToContent = (clientX, clientY) => {
    const vp = viewportRef.current
    if (!vp) return { cx: 0, cy: 0 }

    const rect = vp.getBoundingClientRect()
    const vx = clientX - rect.left
    const vy = clientY - rect.top

    const sx = vx + vp.scrollLeft
    const sy = vy + vp.scrollTop

    const s = scaleRef.current || 1
    return { cx: sx / s, cy: sy / s }
  }

  // ── Pointer events (draw/hand/pinch) ───────────────────────────
  useEffect(() => {
    const vp = viewportRef.current
    const ov = ovRef.current
    if (!vp || !ov) return

    const getTwo = () => {
      const vals = [...pointers.current.values()]
      return [vals[0], vals[1]]
    }

    const cancelRAF = () => {
      if (rafId.current) cancelAnimationFrame(rafId.current)
      rafId.current = 0
    }

    const applyZoomAnchored = (nextScale, midClientX, midClientY) => {
      const vpRect = vp.getBoundingClientRect()
      const midVx = midClientX - vpRect.left
      const midVy = midClientY - vpRect.top

      const anchorCx = gesture.current.anchorCx
      const anchorCy = gesture.current.anchorCy

      const targetScrollLeft = anchorCx * nextScale - midVx
      const targetScrollTop = anchorCy * nextScale - midVy

      scaleRef.current = nextScale
      setScaleState(nextScale)

      cancelRAF()
      rafId.current = requestAnimationFrame(() => {
        vp.scrollLeft = targetScrollLeft
        vp.scrollTop = targetScrollTop
      })
    }

    let drawing = false
    let last = { cx: 0, cy: 0 }
    const penRgb = () => hexToRgba(color)

    const onPointerDown = (e) => {
      pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })

      if (pointers.current.size === 2) {
        const [p1, p2] = getTwo()
        gesture.current.isPinching = true
        gesture.current.startDist = dist(p1, p2)
        gesture.current.startScale = scaleRef.current

        const midX = (p1.x + p2.x) / 2
        const midY = (p1.y + p2.y) / 2
        const { cx, cy } = pointerToContent(midX, midY)
        gesture.current.anchorCx = cx
        gesture.current.anchorCy = cy

        drawing = false
        isPanning.current = false
        return
      }

      if (tool === 'hand') {
        isPanning.current = true
        panStart.current = { x: e.clientX, y: e.clientY, left: vp.scrollLeft, top: vp.scrollTop }
        vp.setPointerCapture?.(e.pointerId)
        return
      }

      if (tool === 'fill') {
        pushHistory()
        const { cx, cy } = pointerToContent(e.clientX, e.clientY)
        doFill(cx, cy)
        return
      }

      // pen/eraser
      pushHistory()
      drawing = true
      const { cx, cy } = pointerToContent(e.clientX, e.clientY)
      last = { cx, cy }
      vp.setPointerCapture?.(e.pointerId)
    }

    const onPointerMove = (e) => {
      if (!pointers.current.has(e.pointerId)) return
      pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })

      if (gesture.current.isPinching && pointers.current.size === 2) {
        e.preventDefault()
        const [p1, p2] = getTwo()
        const d = dist(p1, p2)
        const factor = d / (gesture.current.startDist || d)

        const raw = gesture.current.startScale * factor
        const next = clamp(raw, minScaleRef.current, 4)

        const midX = (p1.x + p2.x) / 2
        const midY = (p1.y + p2.y) / 2

        applyZoomAnchored(next, midX, midY)
        return
      }

      if (tool === 'hand' && isPanning.current) {
        e.preventDefault()
        const dx = e.clientX - panStart.current.x
        const dy = e.clientY - panStart.current.y
        vp.scrollLeft = panStart.current.left - dx
        vp.scrollTop = panStart.current.top - dy
        return
      }

      if (!drawing) return
      e.preventDefault()

      const ctx = ov.getContext('2d')
      const { cx, cy } = pointerToContent(e.clientX, e.clientY)

      // FUN brush style
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      ctx.globalCompositeOperation = 'source-over'

      if (tool === 'eraser') {
        ctx.shadowBlur = 0
        ctx.globalAlpha = 1
        ctx.lineWidth = brushSize * 3
        ctx.strokeStyle = '#ffffff'
      } else {
        ctx.globalAlpha = FUN.alpha
        ctx.lineWidth = brushSize
        ctx.strokeStyle = color

        // glow!
        ctx.shadowColor = color
        ctx.shadowBlur = FUN.glow
      }

      ctx.beginPath()
      ctx.moveTo(last.cx, last.cy)
      ctx.lineTo(cx, cy)
      ctx.stroke()

      // sparkles sometimes (pen only)
      if (tool === 'pen' && Math.random() < FUN.sparkleChance) {
        sprinkleSparkles(ctx, cx, cy, penRgb())
      }

      last = { cx, cy }
      scheduleSave()
    }

    const onPointerUp = (e) => {
      pointers.current.delete(e.pointerId)

      if (pointers.current.size < 2) {
        gesture.current.isPinching = false
        gesture.current.startDist = 0
      }

      if (tool === 'hand') isPanning.current = false

      if (drawing) {
        drawing = false
        flushSave()
      }
    }

    const onPointerCancel = () => {
      pointers.current.clear()
      gesture.current.isPinching = false
      drawing = false
      isPanning.current = false
      flushSave()
    }

    vp.addEventListener('pointerdown', onPointerDown, { passive: false })
    vp.addEventListener('pointermove', onPointerMove, { passive: false })
    vp.addEventListener('pointerup', onPointerUp)
    vp.addEventListener('pointercancel', onPointerCancel)

    return () => {
      cancelRAF()
      vp.removeEventListener('pointerdown', onPointerDown)
      vp.removeEventListener('pointermove', onPointerMove)
      vp.removeEventListener('pointerup', onPointerUp)
      vp.removeEventListener('pointercancel', onPointerCancel)
    }
  }, [tool, color, brushSize, doFill, flushSave, scheduleSave, sprinkleSparkles, FUN])

  return (
    <div
      ref={viewportRef}
      className={styles.viewport}
      aria-busy={!ready}
      style={{ cursor: tool === 'hand' ? 'grab' : 'default' }}
    >
      <div ref={stageRef} className={styles.stage} style={{ transform: `scale(${scaleState})` }}>
        <canvas ref={bgRef} className={styles.canvas} />
        <canvas
          ref={ovRef}
          className={`${styles.canvas} ${styles.overlay}`}
          style={{
            cursor:
              tool === 'hand'
                ? 'grab'
                : tool === 'eraser'
                  ? 'cell'
                  : 'crosshair',
          }}
        />
      </div>
    </div>
  )
})

export default Canvas
