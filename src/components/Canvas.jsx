import { forwardRef, useRef, useImperativeHandle, useEffect, useCallback, useState } from 'react'
import { floodFill, hexToRgba } from '../utils/floodFill.js'
import { loadProgress, saveProgress } from '../utils/storage.js'
import styles from './Canvas.module.css'

const Canvas = forwardRef(function Canvas({ tool, color, brushSize, image }, ref) {
  const viewportRef = useRef(null)

  const bgRef = useRef(null) // image layer
  const ovRef = useRef(null) // drawing layer

  const isDrawing = useRef(false)
  const lastPos = useRef(null)
  const history = useRef([])

  const [ready, setReady] = useState(false)

  // Zoom state
  const [scale, setScale] = useState(1)
  const pointers = useRef(new Map())
  const pinch = useRef({ startDist: 0, startScale: 1 })

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

  // Auto-save 1s after last change
  const scheduleSave = useCallback(() => {
    clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      const ov = ovRef.current
      if (ov) saveProgress(image.id, ov.toDataURL())
    }, 1000)
  }, [image.id])

  // Flush save on unmount (leaving image)
  useEffect(() => {
    return () => flushSave()
  }, [flushSave])

  // ── Load image + restore progress ─────────────────────────────
  useEffect(() => {
    const bg = bgRef.current
    const ov = ovRef.current
    if (!bg || !ov) return

    setReady(false)

    const img = new Image()
    img.onload = () => {
      // Use a cap to avoid insane memory usage, but keep big enough for quality
      const maxW = 2000
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
      setScale(1)
      // reset scroll to top-left
      const vp = viewportRef.current
      if (vp) {
        vp.scrollLeft = 0
        vp.scrollTop = 0
      }
    }
    img.src = image.src
  }, [image])

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

    // Merge snapshot so outlines behave as walls
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

    // Apply fill result to overlay pixels
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

  // ── Magic brush hue state ──────────────────────────────────────
  const magicHue = useRef(0)

  // ── Draw events (pen/eraser/magic/fill) ────────────────────────
  const startDraw = useCallback((e) => {
    // If we are pinching (2 pointers), don't draw.
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

    if (tool === 'magic') {
      magicHue.current = (magicHue.current + 4) % 360
      ctx.strokeStyle = `hsl(${magicHue.current}, 100%, 55%)`
      ctx.lineWidth = brushSize + 4
      ctx.shadowColor = `hsl(${magicHue.current}, 100%, 70%)`
      ctx.shadowBlur = 12
    } else {
      ctx.shadowBlur = 0
      ctx.lineWidth = tool === 'eraser' ? brushSize * 3 : brushSize
      ctx.strokeStyle = tool === 'eraser' ? '#ffffff' : color
    }

    ctx.beginPath()
    ctx.moveTo(lastPos.current.x, lastPos.current.y)
    ctx.lineTo(pos.x, pos.y)
    ctx.stroke()

    lastPos.current = pos
  }, [tool, color, brushSize])

  const stopDraw = useCallback((e) => {
    if (pointers.current.size >= 2) return
    e?.preventDefault()
    if (isDrawing.current) scheduleSave()
    isDrawing.current = false
    lastPos.current = null
  }, [scheduleSave])

  // Attach draw events to overlay canvas
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

  // ── Pinch zoom on viewport (2 pointers) ────────────────────────
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
      const nextScale = clamp(pinch.current.startScale * factor, 0.7, 4)

      // midpoint in client space
      const midX = (p1.x + p2.x) / 2
      const midY = (p1.y + p2.y) / 2

      // convert midpoint to viewport scroll space
      const rect = el.getBoundingClientRect()
      const mx = midX - rect.left + el.scrollLeft
      const my = midY - rect.top + el.scrollTop

      const ratio = nextScale / (scale || 1)

      setScale(nextScale)

      // Adjust scroll so the midpoint stays under fingers after scaling
      requestAnimationFrame(() => {
        el.scrollLeft = mx * ratio - (midX - rect.left)
        el.scrollTop = my * ratio - (midY - rect.top)
      })
    }

    const onPointerUp = (e) => {
      pointers.current.delete(e.pointerId)
      if (pointers.current.size < 2) {
        pinch.current.startDist = 0
      }
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
  }, [scale])

  return (
    <div ref={viewportRef} className={styles.viewport} aria-busy={!ready}>
      <div className={styles.stage} style={{ transform: `scale(${scale})` }}>
        <canvas ref={bgRef} className={styles.canvas} />
        <canvas ref={ovRef} className={`${styles.canvas} ${styles.overlay}`} />
      </div>
    </div>
  )
})

export default Canvas
