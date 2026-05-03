import { forwardRef, useRef, useImperativeHandle, useEffect, useCallback, useState } from 'react'
import { floodFill, hexToRgba } from '../utils/floodFill.js'
import { loadProgress, saveProgress } from '../utils/storage.js'
import styles from './Canvas.module.css'

const Canvas = forwardRef(function Canvas({ tool, color, brushSize, image }, ref) {
  const viewportRef = useRef(null)

  const bgRef = useRef(null)
  const ovRef = useRef(null)

  const isDrawing = useRef(false)
  const lastPos = useRef(null)
  const history = useRef([])

  const [ready, setReady] = useState(false)

  // Zoom
  const [scale, setScale] = useState(1)
  const [minScale, setMinScale] = useState(1)

  // Pinch state
  const pointers = useRef(new Map())
  const pinch = useRef({ startDist: 0, startScale: 1 })

  // Hand pan state
  const isPanning = useRef(false)
  const panStart = useRef({ x: 0, y: 0, left: 0, top: 0 })

  const clamp = (v, a, b) => Math.max(a, Math.min(b, v))
  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y)

  // ── Helpers ───────────────────────────────────────────────────
  const getPos = (e, canvas) => {
    const rect = canvas.getBoundingClientRect()
    const sx = canvas.width / rect.width
    const sy = canvas.height / rect.height
    const src = e.touches?.[0] ?? e
    return { x: (src.clientX - rect.left) * sx, y: (src.clientY - rect.top) * sy }
  }

  const pushHistory = () => {
    const ov = ovRef.current
    if (!ov) return
    history.current.push(ov.getContext('2d').getImageData(0, 0, ov.width, ov.height))
    if (history.current.length > 50) history.current.shift()
  }

  // ── Saving ────────────────────────────────────────────────────
  const saveTimer = useRef(null)

  const flushSave = useCallback(() => {
    clearTimeout(saveTimer.current)
    const ov = ovRef.current
    if (ov) saveProgress(image.id, ov.toDataURL())
  }, [image.id])

  const scheduleSave = useCallback(() => {
    clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      const ov = ovRef.current
      if (ov) saveProgress(image.id, ov.toDataURL())
    }, 600)
  }, [image.id])

  useEffect(() => {
    return () => flushSave()
  }, [flushSave])

  // ── Fit + center helpers ───────────────────────────────────────
  const computeMinScale = useCallback(() => {
    const vp = viewportRef.current
    const bg = bgRef.current
    if (!vp || !bg || !bg.width || !bg.height) return 1

    // available size inside viewport
    const vw = vp.clientWidth
    const vh = vp.clientHeight

    // fit image (unscaled stage) into viewport
    const s = Math.min(vw / bg.width, vh / bg.height)

    // Don't upscale on minScale; keep at most 1
    return Math.min(1, s)
  }, [])

  const centerIfSmaller = useCallback((useScale) => {
    const vp = viewportRef.current
    const bg = bgRef.current
    if (!vp || !bg) return

    const contentW = bg.width * useScale
    const contentH = bg.height * useScale

    // If content smaller than viewport -> center by setting scroll to negative "padding" area.
    // Since we don't have actual padding, we simulate centering by setting scroll to half of the difference (clamped to 0).
    const extraX = Math.max(0, (vp.clientWidth - contentW) / 2)
    const extraY = Math.max(0, (vp.clientHeight - contentH) / 2)

    // We can't scroll to negative, so the clean trick is:
    // keep scroll at 0 and rely on stage to be positioned. We don't have positioning here,
    // so we emulate by scrolling to 0 and letting user see top-left.
    // Better: apply translate to stage, but we keep it simple: scroll to 0 and if larger, keep bounds.
    // We'll instead do: if smaller, scroll 0 and we add CSS centering? (not changing CSS now)
    // Practical centering: just scroll to 0 when smaller; most important is full visibility at minScale.
    if (contentW <= vp.clientWidth) vp.scrollLeft = 0
    if (contentH <= vp.clientHeight) vp.scrollTop = 0
  }, [])

  // ── Load image + restore progress ─────────────────────────────
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
        prev.onload = () => {
          ovCtx.drawImage(prev, 0, 0)
          setReady(true)
        }
        prev.src = saved
      } else {
        ovCtx.fillStyle = '#ffffff'
        ovCtx.fillRect(0, 0, ov.width, ov.height)
        setReady(true)
      }

      history.current = []

      // compute minScale and set scale to it (fit view)
      requestAnimationFrame(() => {
        const ms = computeMinScale()
        setMinScale(ms)
        setScale(ms)
        vp.scrollLeft = 0
        vp.scrollTop = 0
        centerIfSmaller(ms)
      })
    }
    img.src = image.src
  }, [image, computeMinScale, centerIfSmaller])

  // Recompute minScale on resize/orientation
  useEffect(() => {
    const onResize = () => {
      const ms = computeMinScale()
      setMinScale(ms)
      setScale((prev) => Math.max(ms, prev))
      centerIfSmaller(Math.max(ms, scale))
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [computeMinScale, centerIfSmaller, scale])

  // ── Exposed methods ────────────────────────────────────────────
  const undo = useCallback(() => {
    const ov = ovRef.current
    if (!ov || !history.current.length) return
    ov.getContext('2d').putImageData(history.current.pop(), 0, 0)
    scheduleSave()
  }, [scheduleSave])

  const clear = useCallback(() => {
    const ov = ovRef.current
    if (!ov) return
    pushHistory()
    const ctx = ov.getContext('2d')
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, ov.width, ov.height)
    scheduleSave()
  }, [scheduleSave])

  const save = useCallback(() => {
    const bg = bgRef.current
    const ov = ovRef.current
    if (!bg || !ov) return

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
  }, [image.name])

  useImperativeHandle(ref, () => ({ undo, clear, save, flushSave }))

  // ── Fill ──────────────────────────────────────────────────────
  const doFill = useCallback((pos) => {
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

    const x = Math.floor(pos.x)
    const y = Math.floor(pos.y)
    if (x < 0 || x >= tmp.width || y < 0 || y >= tmp.height) return

    const imgData = tCtx.getImageData(0, 0, tmp.width, tmp.height)
    floodFill(imgData, x, y, hexToRgba(color))

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
    scheduleSave()
  }, [color, scheduleSave])

  // ── Draw events ────────────────────────────────────────────────
  const startDraw = useCallback((e) => {
    // if hand tool, we pan instead of draw
    if (tool === 'hand') return
    if (pointers.current.size >= 2) return

    e.preventDefault()
    const ov = ovRef.current
    if (!ov) return

    const pos = getPos(e, ov)
    if (tool === 'fill') {
      pushHistory()
      doFill(pos)
      return
    }

    pushHistory()
    isDrawing.current = true
    lastPos.current = pos
  }, [tool, doFill])

  const draw = useCallback((e) => {
    if (tool === 'hand') return
    if (pointers.current.size >= 2) return

    e.preventDefault()
    if (!isDrawing.current) return

    const ov = ovRef.current
    if (!ov) return
    const ctx = ov.getContext('2d')
    const pos = getPos(e, ov)

    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.globalCompositeOperation = 'source-over'
    ctx.shadowBlur = 0

    ctx.lineWidth = tool === 'eraser' ? brushSize * 3 : brushSize
    ctx.strokeStyle = tool === 'eraser' ? '#ffffff' : color

    ctx.beginPath()
    ctx.moveTo(lastPos.current.x, lastPos.current.y)
    ctx.lineTo(pos.x, pos.y)
    ctx.stroke()

    lastPos.current = pos
  }, [tool, color, brushSize])

  const stopDraw = useCallback((e) => {
    if (tool === 'hand') return
    if (pointers.current.size >= 2) return
    e?.preventDefault()
    if (isDrawing.current) scheduleSave()
    isDrawing.current = false
    lastPos.current = null
  }, [tool, scheduleSave])

  useEffect(() => {
    const ov = ovRef.current
    if (!ov) return

    ov.addEventListener('mousedown', startDraw)
    ov.addEventListener('mousemove', draw)
    ov.addEventListener('mouseup', stopDraw)
    ov.addEventListener('mouseleave', stopDraw)

    ov.addEventListener('touchstart', startDraw, { passive: false })
    ov.addEventListener('touchmove', draw, { passive: false })
    ov.addEventListener('touchend', stopDraw, { passive: false })
    ov.addEventListener('touchcancel', stopDraw, { passive: false })

    return () => {
      ov.removeEventListener('mousedown', startDraw)
      ov.removeEventListener('mousemove', draw)
      ov.removeEventListener('mouseup', stopDraw)
      ov.removeEventListener('mouseleave', stopDraw)

      ov.removeEventListener('touchstart', startDraw)
      ov.removeEventListener('touchmove', draw)
      ov.removeEventListener('touchend', stopDraw)
      ov.removeEventListener('touchcancel', stopDraw)
    }
  }, [startDraw, draw, stopDraw])

  // ── Hand tool: drag to pan (1 finger / mouse) ──────────────────
  useEffect(() => {
    const vp = viewportRef.current
    if (!vp) return

    const onDown = (e) => {
      if (tool !== 'hand') return
      if (pointers.current.size >= 2) return

      // only primary button for mouse
      if (e.pointerType === 'mouse' && e.button !== 0) return

      isPanning.current = true
      panStart.current = { x: e.clientX, y: e.clientY, left: vp.scrollLeft, top: vp.scrollTop }
      vp.setPointerCapture?.(e.pointerId)
    }

    const onMove = (e) => {
      if (!isPanning.current) return
      if (tool !== 'hand') return

      e.preventDefault()
      const dx = e.clientX - panStart.current.x
      const dy = e.clientY - panStart.current.y
      vp.scrollLeft = panStart.current.left - dx
      vp.scrollTop = panStart.current.top - dy
    }

    const onUp = (e) => {
      if (!isPanning.current) return
      isPanning.current = false
      try { vp.releasePointerCapture?.(e.pointerId) } catch {}
    }

    vp.addEventListener('pointerdown', onDown, { passive: false })
    vp.addEventListener('pointermove', onMove, { passive: false })
    vp.addEventListener('pointerup', onUp)
    vp.addEventListener('pointercancel', onUp)

    return () => {
      vp.removeEventListener('pointerdown', onDown)
      vp.removeEventListener('pointermove', onMove)
      vp.removeEventListener('pointerup', onUp)
      vp.removeEventListener('pointercancel', onUp)
    }
  }, [tool])

  // ── Pinch zoom (2 pointers) ────────────────────────────────────
  useEffect(() => {
    const el = viewportRef.current
    if (!el) return

    const onPointerDown = (e) => {
      pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
      if (pointers.current.size === 2) {
        const [p1, p2] = [...pointers.current.values()]
        pinch.current.startDist = dist(p1, p2)
        pinch.current.startScale = scale
      }
    }

    const onPointerMove = (e) => {
      if (!pointers.current.has(e.pointerId)) return
      pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
      if (pointers.current.size !== 2) return

      e.preventDefault()

      const [p1, p2] = [...pointers.current.values()]
      const newDist = dist(p1, p2)
      const factor = newDist / (pinch.current.startDist || newDist)

      const unclamped = pinch.current.startScale * factor
      const nextScale = clamp(unclamped, minScale, 4)

      // midpoint in client space
      const midX = (p1.x + p2.x) / 2
      const midY = (p1.y + p2.y) / 2

      // midpoint in viewport scroll space
      const rect = el.getBoundingClientRect()
      const mx = midX - rect.left + el.scrollLeft
      const my = midY - rect.top + el.scrollTop

      const ratio = nextScale / (scale || 1)

      setScale(nextScale)

      requestAnimationFrame(() => {
        el.scrollLeft = mx * ratio - (midX - rect.left)
        el.scrollTop = my * ratio - (midY - rect.top)

        // when fully zoomed out, ensure we can see everything
        if (nextScale === minScale) centerIfSmaller(nextScale)
      })
    }

    const onPointerUp = (e) => {
      pointers.current.delete(e.pointerId)
      if (pointers.current.size < 2) pinch.current.startDist = 0
    }

    el.addEventListener('pointerdown', onPointerDown, { passive: false })
    el.addEventListener('pointermove', onPointerMove, { passive: false })
    el.addEventListener('pointerup', onPointerUp)
    el.addEventListener('pointercancel', onPointerUp)

    return () => {
      el.removeEventListener('pointerdown', onPointerDown)
      el.removeEventListener('pointermove', onPointerMove)
      el.removeEventListener('pointerup', onPointerUp)
      el.removeEventListener('pointercancel', onPointerUp)
    }
  }, [scale, minScale, centerIfSmaller])

  return (
    <div
      ref={viewportRef}
      className={styles.viewport}
      aria-busy={!ready}
      style={{ cursor: tool === 'hand' ? 'grab' : 'default' }}
    >
      <div className={styles.stage} style={{ transform: `scale(${scale})` }}>
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
