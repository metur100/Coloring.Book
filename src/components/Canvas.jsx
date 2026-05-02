import { forwardRef, useRef, useImperativeHandle, useEffect, useCallback, useState } from 'react'
import { floodFill, hexToRgba } from '../utils/floodFill.js'
import { loadProgress, saveProgress } from '../utils/storage.js'
import styles from './Canvas.module.css'

const Canvas = forwardRef(function Canvas({ tool, color, brushSize, image }, ref) {
  const bgRef = useRef(null)      // image layer
  const ovRef = useRef(null)      // drawing layer
  const isDrawing = useRef(false)
  const lastPos = useRef(null)
  const history = useRef([])
  const [ready, setReady] = useState(false)

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

  // Auto-save progress 1 s after last stroke
  const saveTimer = useRef(null)
  const scheduleSave = useCallback(() => {
    clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      const ov = ovRef.current
      if (ov) saveProgress(image.id, ov.toDataURL())
    }, 1000)
  }, [image.id])

  // ── Load image + restore progress ────────────────────────────
  useEffect(() => {
    const bg = bgRef.current
    const ov = ovRef.current
    if (!bg || !ov) return
    setReady(false)
    const img = new Image()
    img.onload = () => {
      const maxW = 1600
      const scale = Math.min(1, maxW / img.naturalWidth)
      bg.width = Math.round(img.naturalWidth * scale)
      bg.height = Math.round(img.naturalHeight * scale)
      ov.width = bg.width
      ov.height = bg.height

      bg.getContext('2d').drawImage(img, 0, 0, bg.width, bg.height)

      // Restore saved progress or fill white
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
    }
    img.src = image.src
  }, [image])

  // ── Exposed methods ───────────────────────────────────────────
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
    out.width = bg.width; out.height = bg.height
    const ctx = out.getContext('2d')
    ctx.drawImage(bg, 0, 0)
    ctx.globalCompositeOperation = 'multiply'
    ctx.drawImage(ov, 0, 0)
    const a = document.createElement('a')
    a.download = `${image.name.replace(/\.[^.]+$/, '')}-colored.png`
    a.href = out.toDataURL('image/png')
    a.click()
  }, [image.name])

  useImperativeHandle(ref, () => ({ undo, clear, save }))

  // ── Fill ─────────────────────────────────────────────────────
  const doFill = useCallback((pos) => {
    const bg = bgRef.current; const ov = ovRef.current
    if (!bg || !ov) return
    const tmp = document.createElement('canvas')
    tmp.width = bg.width; tmp.height = bg.height
    const tCtx = tmp.getContext('2d')
    tCtx.drawImage(bg, 0, 0)
    tCtx.globalCompositeOperation = 'multiply'
    tCtx.drawImage(ov, 0, 0)
    tCtx.globalCompositeOperation = 'source-over'
    const x = Math.floor(pos.x), y = Math.floor(pos.y)
    if (x<0||x>=tmp.width||y<0||y>=tmp.height) return
    const imgData = tCtx.getImageData(0, 0, tmp.width, tmp.height)
    floodFill(imgData, x, y, hexToRgba(color))
    const ovCtx = ov.getContext('2d')
    const ovData = ovCtx.getImageData(0, 0, ov.width, ov.height)
    const [fR,fG,fB] = hexToRgba(color)
    for (let i=0; i<imgData.data.length; i+=4) {
      if (imgData.data[i]===fR && imgData.data[i+1]===fG && imgData.data[i+2]===fB) {
        ovData.data[i]=fR; ovData.data[i+1]=fG; ovData.data[i+2]=fB; ovData.data[i+3]=255
      }
    }
    ovCtx.putImageData(ovData, 0, 0)
    scheduleSave()
  }, [color, scheduleSave])

  // ── Draw events ───────────────────────────────────────────────
  const startDraw = useCallback((e) => {
    e.preventDefault()
    const ov = ovRef.current; if (!ov) return
    const pos = getPos(e, ov)
    if (tool==='fill') { pushHistory(); doFill(pos); return }
    pushHistory()
    isDrawing.current = true
    lastPos.current = pos
  }, [tool, doFill])

  const draw = useCallback((e) => {
    e.preventDefault()
    if (!isDrawing.current) return
    const ov = ovRef.current; if (!ov) return
    const ctx = ov.getContext('2d')
    const pos = getPos(e, ov)
    ctx.lineWidth = tool==='eraser' ? brushSize*3 : brushSize
    ctx.lineCap = 'round'; ctx.lineJoin = 'round'
    ctx.globalCompositeOperation = 'source-over'
    ctx.strokeStyle = tool==='eraser' ? '#ffffff' : color
    ctx.beginPath()
    ctx.moveTo(lastPos.current.x, lastPos.current.y)
    ctx.lineTo(pos.x, pos.y)
    ctx.stroke()
    lastPos.current = pos
  }, [tool, color, brushSize])

  const stopDraw = useCallback((e) => {
    e?.preventDefault()
    if (isDrawing.current) scheduleSave()
    isDrawing.current = false; lastPos.current = null
  }, [scheduleSave])

  // Attach events
  useEffect(() => {
    const ov = ovRef.current; if (!ov) return
    ov.addEventListener('mousedown', startDraw)
    ov.addEventListener('mousemove', draw)
    ov.addEventListener('mouseup', stopDraw)
    ov.addEventListener('mouseleave', stopDraw)
    ov.addEventListener('touchstart', startDraw, { passive: false })
    ov.addEventListener('touchmove', draw, { passive: false })
    ov.addEventListener('touchend', stopDraw, { passive: false })
    return () => {
      ov.removeEventListener('mousedown', startDraw)
      ov.removeEventListener('mousemove', draw)
      ov.removeEventListener('mouseup', stopDraw)
      ov.removeEventListener('mouseleave', stopDraw)
      ov.removeEventListener('touchstart', startDraw)
      ov.removeEventListener('touchmove', draw)
      ov.removeEventListener('touchend', stopDraw)
    }
  }, [startDraw, draw, stopDraw])

  return (
    <div className={styles.wrapper}>
      {!ready && <div className={styles.loading}>Loading…</div>}
      <canvas ref={bgRef} className={styles.canvas} />
      <canvas
        ref={ovRef}
        className={`${styles.canvas} ${styles.overlay} ${ready ? styles[tool] : ''}`}
        style={{ opacity: ready ? 1 : 0 }}
      />
    </div>
  )
})

export default Canvas
