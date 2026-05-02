import { forwardRef, useRef, useImperativeHandle } from 'react'
import { useCanvas } from '../hooks/useCanvas'
import styles from './Canvas.module.css'

const Canvas = forwardRef(function Canvas({ tool, color, brushSize, uploadedImage }, ref) {
  const canvasRef = useRef(null)   // background – holds the image
  const overlayRef = useRef(null)  // foreground – holds all drawings

  const { undo, clear, save } = useCanvas({
    canvasRef, overlayRef, tool, color, brushSize, uploadedImage,
  })

  useImperativeHandle(ref, () => ({ undo, clear, save }))

  return (
    <div className={styles.wrapper}>
      <canvas ref={canvasRef} className={styles.canvas} />
      <canvas
        ref={overlayRef}
        className={`${styles.canvas} ${styles.overlay} ${styles[tool]}`}
      />
    </div>
  )
})

export default Canvas