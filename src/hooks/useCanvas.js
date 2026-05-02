import { useEffect, useRef, useCallback } from 'react'
import { floodFill, hexToRgba } from '../utils/floodFill'

export function useCanvas({ canvasRef, overlayRef, tool, color, brushSize, uploadedImage }) {
  const isDrawing = useRef(false)
  const lastPos = useRef(null)
  const historyRef = useRef([])

  const getPos = useCallback((e, canvas) => {
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    const src = e.touches?.[0] ?? e
    return {
      x: (src.clientX - rect.left) * scaleX,
      y: (src.clientY - rect.top) * scaleY,
    }
  }, [])

  const pushHistory = useCallback(() => {
    const c = overlayRef.current
    if (!c) return
    const snap = c.getContext('2d').getImageData(0, 0, c.width, c.height)
    historyRef.current.push(snap)
    if (historyRef.current.length > 50) historyRef.current.shift()
  }, [overlayRef])

  const undo = useCallback(() => {
    const c = overlayRef.current
    if (!c || !historyRef.current.length) return
    c.getContext('2d').putImageData(historyRef.current.pop(), 0, 0)
  }, [overlayRef])

  const clear = useCallback(() => {
    const c = overlayRef.current
    if (!c) return
    pushHistory()
    const ctx = c.getContext('2d')
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, c.width, c.height)
  }, [overlayRef, pushHistory])

  // Save with chosen frame
  const save = useCallback((frameStyle) => {
    const bg = canvasRef.current
    const ov = overlayRef.current
    if (!bg || !ov) return

    const pad = frameStyle?.padding ?? 0
    const W = bg.width + pad * 2
    const H = bg.height + pad * 2

    const out = document.createElement('canvas')
    out.width = W; out.height = H
    const ctx = out.getContext('2d')

    // Frame background
    if (frameStyle?.background) {
      ctx.fillStyle = frameStyle.background
      ctx.fillRect(0, 0, W, H)
    }

    // Draw image + coloring
    ctx.drawImage(bg, pad, pad)
    ctx.save()
    ctx.globalCompositeOperation = 'multiply'
    ctx.drawImage(ov, pad, pad)
    ctx.restore()

    // Frame border overlay
    if (frameStyle?.border) {
      ctx.strokeStyle = frameStyle.border
      ctx.lineWidth = frameStyle.borderWidth ?? 12
      ctx.strokeRect(
        frameStyle.borderWidth/2, frameStyle.borderWidth/2,
        W - frameStyle.borderWidth, H - frameStyle.borderWidth
      )
    }
    if (frameStyle?.cornerFn) frameStyle.cornerFn(ctx, W, H)

    const link = document.createElement('a')
    link.download = 'coloring-page.png'
    link.href = out.toDataURL('image/png')
    link.click()
  }, [canvasRef, overlayRef])

  // Load image
  useEffect(() => {
    if (!uploadedImage || !canvasRef.current) return
    const bg = canvasRef.current
    const ov = overlayRef.current
    const img = new Image()
    img.onload = () => {
      const maxW = 1400
      const scale = Math.min(1, maxW / img.naturalWidth)
      bg.width = Math.round(img.naturalWidth * scale)
      bg.height = Math.round(img.naturalHeight * scale)
      if (ov) { ov.width = bg.width; ov.height = bg.height }
      bg.getContext('2d').drawImage(img, 0, 0, bg.width, bg.height)
      if (ov) {
        const ctx = ov.getContext('2d')
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(0, 0, ov.width, ov.height)
      }
      historyRef.current = []
    }
    img.src = uploadedImage
  }, [uploadedImage, canvasRef, overlayRef])

  // Fill tool — samples merged canvas so outlines act as walls
  const doFill = useCallback((pos) => {
    const bg = canvasRef.current
    const ov = overlayRef.current
    if (!bg || !ov) return
    const tmp = document.createElement('canvas')
    tmp.width = bg.width; tmp.height = bg.height
    const tCtx = tmp.getContext('2d')
    tCtx.drawImage(bg, 0, 0)
    tCtx.globalCompositeOperation = 'multiply'
    tCtx.drawImage(ov, 0, 0)
    tCtx.globalCompositeOperation = 'source-over'

    const x = Math.floor(pos.x), y = Math.floor(pos.y)
    if (x < 0 || x >= tmp.width || y < 0 || y >= tmp.height) return

    const imgData = tCtx.getImageData(0, 0, tmp.width, tmp.height)
    floodFill(imgData, x, y, hexToRgba(color))

    // Write filled pixels back to overlay
    const ovCtx = ov.getContext('2d')
    const ovData = ovCtx.getImageData(0, 0, ov.width, ov.height)
    const [fR, fG, fB] = hexToRgba(color)
    for (let i = 0; i < imgData.data.length; i += 4) {
      if (imgData.data[i]===fR && imgData.data[i+1]===fG && imgData.data[i+2]===fB) {
        ovData.data[i]=fR; ovData.data[i+1]=fG; ovData.data[i+2]=fB; ovData.data[i+3]=255
      }
    }
    ovCtx.putImageData(ovData, 0, 0)
  }, [canvasRef, overlayRef, color])

  const startDraw = useCallback((e) => {
    e.preventDefault()
    const ov = overlayRef.current
    if (!ov) return
    const pos = getPos(e, ov)
    if (tool === 'fill') { pushHistory(); doFill(pos); return }
    pushHistory()
    isDrawing.current = true
    lastPos.current = pos
  }, [overlayRef, tool, doFill, getPos, pushHistory])

  const draw = useCallback((e) => {
    e.preventDefault()
    if (!isDrawing.current) return
    const ov = overlayRef.current
    if (!ov) return
    const ctx = ov.getContext('2d')
    const pos = getPos(e, ov)
    ctx.lineWidth = tool === 'eraser' ? brushSize * 3 : brushSize
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.globalCompositeOperation = 'source-over'
    ctx.strokeStyle = tool === 'eraser' ? '#ffffff' : color
    ctx.beginPath()
    ctx.moveTo(lastPos.current.x, lastPos.current.y)
    ctx.lineTo(pos.x, pos.y)
    ctx.stroke()
    lastPos.current = pos
  }, [overlayRef, tool, color, brushSize, getPos])

  const stopDraw = useCallback((e) => {
    e?.preventDefault()
    isDrawing.current = false
    lastPos.current = null
  }, [])

  useEffect(() => {
    const ov = overlayRef.current
    if (!ov) return
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
  }, [overlayRef, startDraw, draw, stopDraw])

  return { undo, clear, save }
}
