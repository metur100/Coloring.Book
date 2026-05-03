import { forwardRef, useRef, useImperativeHandle, useEffect, useCallback, useState } from 'react'
import { floodFill, hexToRgba } from '../utils/floodFill.js'
import { loadProgress, saveProgress } from '../utils/storage.js'
import styles from './Canvas.module.css'

const Canvas = forwardRef(function Canvas({ tool, color, brushSize, image }, ref) {
  const viewportRef = useRef(null)
  const stageRef = useRef(null)

  const bgRef = useRef(null)
  const ovRef = useRef(null)

  const history = useRef([])

  const [ready, setReady] = useState(false)

  // Zoom: keep both state (for render) and ref (for stable math)
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
    // anchor point in "content coordinates" (unscaled stage px)
    anchorCx: 0,
    anchorCy: 0,
    // pointer midpoint in viewport client coords (relative to viewport)
    startMidVx: 0,
    startMidVy: 0,
  })

  // Hand tool (drag to pan)
  const isPanning = useRef(false)
  const panStart = useRef({ x: 0, y: 0, left: 0, top: 0 })

  const rafId = useRef(0)

  const clamp = (v, a, b) => Math.max(a, Math.min(b, v))
  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y)

  // ── Saving (immediate + debounce backup) ───────────────────────
  const saveTimer = useRef(null)

  const flushSave = useCallback(() => {
    clearTimeout(saveTimer.current)
    const ov = ovRef.current
    if (!ov) return
    try { saveProgress(image.id, ov.toDataURL()) } catch {}
  }, [image.id])

  const scheduleSave = useCallback(() => {
    clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => flushSave(), 500)
  }, [flushSave])

  useEffect(() => () => flushSave(), [flushSave])

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

    const img = new Image()
    img.onload = () => {
      const maxW = 2200
      const s = Math.min(1, maxW / img.naturalWidth)

      bg.width = Math.round(img.naturalWidth * s)
      bg.height = Math.round(img.naturalHeight * s)
      ov.width = bg.width
      ov.height = bg.height

      bg.getContext('2d').drawImage(img, 0, 0, bg.width, bg.height)

      const saved = loadProgress(image.id)
      const ovCtx = ov.getContext('2d')

      if (saved) {
        const prev = new Image()
        prev.onload = () => { ovCtx.drawImage(prev, 0, 0); setReady(true) }
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

    img.src = image.src
  }, [image, computeMinScale])

  // Recompute minScale on resize/orientation
  useEffect(() => {
    const onResize = () => {
      const ms = computeMinScale()
      minScaleRef.current = ms
      setMinScaleState(ms)

      // keep current scale >= minScale
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

  // ── Fill ───────────────────────────────────────────────────────
  const doFill = useCallback((x, y) => {
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
    flushSave()
  }, [color, flushSave])

  // ── Coordinate conversion for pointer → content coords ──────────
  const pointerToContent = (clientX, clientY) => {
    const vp = viewportRef.current
    if (!vp) return { cx: 0, cy: 0, vx: 0, vy: 0 }

    const rect = vp.getBoundingClientRect()
    const vx = clientX - rect.left
    const vy = clientY - rect.top

    // viewport scroll space coords
    const sx = vx + vp.scrollLeft
    const sy = vy + vp.scrollTop

    const s = scaleRef.current || 1
    // content coords (unscaled)
    return { cx: sx / s, cy: sy / s, vx, vy }
  }

  // ── Drawing / Hand / Pinch via POINTER EVENTS only ─────────────
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

      // desired scroll so that anchor (content coord) maps back under the midpoint
      const targetScrollLeft = anchorCx * nextScale - midVx
      const targetScrollTop = anchorCy * nextScale - midVy

      scaleRef.current = nextScale
      setScaleState(nextScale)

      // batch DOM writes to next frame to prevent shake
      cancelRAF()
      rafId.current = requestAnimationFrame(() => {
        vp.scrollLeft = targetScrollLeft
        vp.scrollTop = targetScrollTop
      })
    }

    // local drawing state
    let drawing = false
    let last = { cx: 0, cy: 0 }

    const onPointerDown = (e) => {
      // Keep pointer list for pinch
      pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })

      // If second pointer starts: begin pinch
      if (pointers.current.size === 2) {
        const [p1, p2] = getTwo()
        gesture.current.isPinching = true
        gesture.current.startDist = dist(p1, p2)
        gesture.current.startScale = scaleRef.current

        // anchor = current midpoint in content coords
        const midX = (p1.x + p2.x) / 2
        const midY = (p1.y + p2.y) / 2
        const { cx, cy } = pointerToContent(midX, midY)
        gesture.current.anchorCx = cx
        gesture.current.anchorCy = cy

        // stop drawing/panning when pinch begins
        drawing = false
        isPanning.current = false
        return
      }

      // Single pointer actions:
      if (tool === 'hand') {
        // start panning
        isPanning.current = true
        panStart.current = { x: e.clientX, y: e.clientY, left: vp.scrollLeft, top: vp.scrollTop }
        vp.setPointerCapture?.(e.pointerId)
        return
      }

      // draw/fill with overlay only for primary pointer
      if (tool === 'fill') {
        pushHistory()
        const { cx, cy } = pointerToContent(e.clientX, e.clientY)
        doFill(cx, cy)
        return
      }

      // pen/eraser draw
      pushHistory()
      drawing = true
      const { cx, cy } = pointerToContent(e.clientX, e.clientY)
      last = { cx, cy }
      vp.setPointerCapture?.(e.pointerId)
    }

    const onPointerMove = (e) => {
      if (!pointers.current.has(e.pointerId)) return
      pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })

      // Pinch zoom
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

      // Hand pan
      if (tool === 'hand' && isPanning.current) {
        e.preventDefault()
        const dx = e.clientX - panStart.current.x
        const dy = e.clientY - panStart.current.y
        vp.scrollLeft = panStart.current.left - dx
        vp.scrollTop = panStart.current.top - dy
        return
      }

      // Drawing
      if (!drawing) return
      e.preventDefault()

      const ctx = ov.getContext('2d')
      const { cx, cy } = pointerToContent(e.clientX, e.clientY)

      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      ctx.globalCompositeOperation = 'source-over'
      ctx.shadowBlur = 0

      ctx.lineWidth = tool === 'eraser' ? brushSize * 3 : brushSize
      ctx.strokeStyle = tool === 'eraser' ? '#ffffff' : color

      ctx.beginPath()
      ctx.moveTo(last.cx, last.cy)
      ctx.lineTo(cx, cy)
      ctx.stroke()

      last = { cx, cy }
      scheduleSave()
    }

    const onPointerUp = (e) => {
      pointers.current.delete(e.pointerId)

      if (pointers.current.size < 2) {
        gesture.current.isPinching = false
        gesture.current.startDist = 0
      }

      if (tool === 'hand') {
        isPanning.current = false
      }

      if (drawing) {
        drawing = false
        flushSave()
      }
    }

    const onPointerCancel = (e) => {
      pointers.current.delete(e.pointerId)
      gesture.current.isPinching = false
      drawing = false
      isPanning.current = false
      flushSave()
    }

    // Attach to VIEWPORT for pinch/hand; drawing still works because we convert coords properly
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
  }, [tool, color, brushSize, doFill, flushSave, scheduleSave])

  return (
    <div
      ref={viewportRef}
      className={styles.viewport}
      aria-busy={!ready}
      style={{ cursor: tool === 'hand' ? 'grab' : 'default' }}
    >
      <div
        ref={stageRef}
        className={styles.stage}
        style={{ transform: `scale(${scaleState})` }}
      >
        <canvas ref={bgRef} className={styles.canvas} />
        <canvas
          ref={ovRef}
          className={`${styles.canvas} ${styles.overlay}`}
          style={{ cursor: tool === 'hand' ? 'grab' : (tool === 'eraser' ? 'cell' : 'crosshair') }}
        />
      </div>
    </div>
  )
})

export default Canvas
