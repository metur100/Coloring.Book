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
    if (e.touches && e.touches.length > 0) {
      return {
        x: (e.touches[0].clientX - rect.left) * scaleX,
        y: (e.touches[0].clientY - rect.top) * scaleY,
      }
    }
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    }
  }, [])

  const pushHistory = useCallback(() => {
    const canvas = overlayRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    historyRef.current.push(ctx.getImageData(0, 0, canvas.width, canvas.height))
    if (historyRef.current.length > 50) historyRef.current.shift()
  }, [overlayRef])

  const undo = useCallback(() => {
    const canvas = overlayRef.current
    if (!canvas || historyRef.current.length === 0) return
    canvas.getContext('2d').putImageData(historyRef.current.pop(), 0, 0)
  }, [overlayRef])

  const clear = useCallback(() => {
    const canvas = overlayRef.current
    if (!canvas) return
    pushHistory()
    canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height)
  }, [overlayRef, pushHistory])

  const save = useCallback(() => {
    const bg = canvasRef.current
    const overlay = overlayRef.current
    if (!bg || !overlay) return
    const merged = document.createElement('canvas')
    merged.width = bg.width
    merged.height = bg.height
    const ctx = merged.getContext('2d')
    ctx.drawImage(bg, 0, 0)
    // Draw overlay with multiply so lines stay visible in saved image too
    ctx.globalCompositeOperation = 'multiply'
    ctx.drawImage(overlay, 0, 0)
    const link = document.createElement('a')
    link.download = 'my-coloring-page.png'
    link.href = merged.toDataURL('image/png')
    link.click()
  }, [canvasRef, overlayRef])

  // Load image onto background canvas
  useEffect(() => {
    if (!uploadedImage || !canvasRef.current) return
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const img = new Image()
    img.onload = () => {
      const maxW = 1200
      const scale = Math.min(1, maxW / img.naturalWidth)
      canvas.width = img.naturalWidth * scale
      canvas.height = img.naturalHeight * scale
      const overlay = overlayRef.current
      if (overlay) {
        overlay.width = canvas.width
        overlay.height = canvas.height
      }
      // Fill overlay with white so multiply blending works correctly
      const overlayCtx = overlay?.getContext('2d')
      if (overlayCtx) {
        overlayCtx.fillStyle = '#ffffff'
        overlayCtx.fillRect(0, 0, canvas.width, canvas.height)
      }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      historyRef.current = []
    }
    img.src = uploadedImage
  }, [uploadedImage, canvasRef, overlayRef])

  /**
   * For flood fill we need to sample the MERGED visible pixels (bg + overlay)
   * so the fill respects the black outlines from the image layer.
   * We composite both canvases into a temporary canvas, read its pixels,
   * run flood fill, then write the result back to the overlay only.
   */
  const doFill = useCallback((pos) => {
    const bg = canvasRef.current
    const overlay = overlayRef.current
    if (!bg || !overlay) return

    // Build merged snapshot for sampling
    const merged = document.createElement('canvas')
    merged.width = bg.width
    merged.height = bg.height
    const mCtx = merged.getContext('2d')
    mCtx.drawImage(bg, 0, 0)
    mCtx.globalCompositeOperation = 'multiply'
    mCtx.drawImage(overlay, 0, 0)
    mCtx.globalCompositeOperation = 'source-over'

    const x = Math.floor(pos.x)
    const y = Math.floor(pos.y)
    if (x < 0 || x >= merged.width || y < 0 || y >= merged.height) return

    // Run fill on merged image data
    const imageData = mCtx.getImageData(0, 0, merged.width, merged.height)
    const filled = floodFill(imageData, x, y, hexToRgba(color))

    // Apply only the changed pixels back to the overlay
    const overlayCtx = overlay.getContext('2d')
    const overlayData = overlayCtx.getImageData(0, 0, overlay.width, overlay.height)
    const src = filled.data
    const dst = overlayData.data

    // Get merged original for comparison
    const origData = mCtx.getImageData(0, 0, merged.width, merged.height).data

    const [fr, fg, fb] = hexToRgba(color)
    for (let i = 0; i < src.length; i += 4) {
      if (src[i] === fr && src[i+1] === fg && src[i+2] === fb) {
        dst[i]     = fr
        dst[i + 1] = fg
        dst[i + 2] = fb
        dst[i + 3] = 255
      }
    }
    overlayCtx.putImageData(overlayData, 0, 0)
  }, [canvasRef, overlayRef, color])

  const startDraw = useCallback((e) => {
    e.preventDefault()
    const overlay = overlayRef.current
    if (!overlay) return
    const pos = getPos(e, overlay)
    if (tool === 'fill') {
      pushHistory()
      doFill(pos)
      return
    }
    pushHistory()
    isDrawing.current = true
    lastPos.current = pos
  }, [overlayRef, tool, doFill, getPos, pushHistory])

  const draw = useCallback((e) => {
    e.preventDefault()
    if (!isDrawing.current) return
    const overlay = overlayRef.current
    if (!overlay) return
    const ctx = overlay.getContext('2d')
    const pos = getPos(e, overlay)
    ctx.lineWidth = tool === 'eraser' ? brushSize * 3 : brushSize
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    if (tool === 'eraser') {
      // Erase back to white (not transparent) so multiply still works
      ctx.globalCompositeOperation = 'source-over'
      ctx.strokeStyle = '#ffffff'
    } else {
      ctx.globalCompositeOperation = 'source-over'
      ctx.strokeStyle = color
    }
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
    const overlay = overlayRef.current
    if (!overlay) return
    overlay.addEventListener('mousedown', startDraw)
    overlay.addEventListener('mousemove', draw)
    overlay.addEventListener('mouseup', stopDraw)
    overlay.addEventListener('mouseleave', stopDraw)
    overlay.addEventListener('touchstart', startDraw, { passive: false })
    overlay.addEventListener('touchmove', draw, { passive: false })
    overlay.addEventListener('touchend', stopDraw, { passive: false })
    return () => {
      overlay.removeEventListener('mousedown', startDraw)
      overlay.removeEventListener('mousemove', draw)
      overlay.removeEventListener('mouseup', stopDraw)
      overlay.removeEventListener('mouseleave', stopDraw)
      overlay.removeEventListener('touchstart', startDraw)
      overlay.removeEventListener('touchmove', draw)
      overlay.removeEventListener('touchend', stopDraw)
    }
  }, [overlayRef, startDraw, draw, stopDraw])

  return { undo, clear, save }
}
