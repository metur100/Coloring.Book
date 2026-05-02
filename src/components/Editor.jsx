import Canvas from './Canvas.jsx'
import Sidebar from './Sidebar.jsx'
import styles from './Editor.module.css'
import { useRef, useState } from 'react'

export default function Editor({ image, onBack }) {
  const [tool, setTool] = useState('pen')
  const [color, setColor] = useState('#e63946')
  const [brushSize, setBrushSize] = useState(10)
  const canvasRef = useRef(null)

  return (
    <div className={styles.editor}>
      {/* Top bar */}
      <header className={styles.topbar}>
        <button className={styles.backBtn} onClick={onBack} aria-label="Back to gallery">
          ← 
        </button>
        <div className={styles.imageTitle}>
          <span className={styles.titleIcon}>🖼️</span>
          <span className={styles.titleText}>{image.name.replace(/\.[^.]+$/, '')}</span>
        </div>
        <button
          className={styles.saveBtn}
          onClick={() => canvasRef.current?.save()}
          aria-label="Save image"
        >
          💾 
        </button>
      </header>

      {/* Body */}
      <div className={styles.body}>
        <Sidebar
          tool={tool} setTool={setTool}
          color={color} setColor={setColor}
          brushSize={brushSize} setBrushSize={setBrushSize}
          onUndo={() => canvasRef.current?.undo()}
          onClear={() => canvasRef.current?.clear()}
        />

        <main className={styles.canvasArea}>
          <Canvas
            ref={canvasRef}
            tool={tool}
            color={color}
            brushSize={brushSize}
            image={image}
          />
        </main>
      </div>
    </div>
  )
}