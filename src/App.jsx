import { useState, useRef } from 'react'
import Canvas from './components/Canvas.jsx'
import Toolbar from './components/Toolbar.jsx'
import ColorPalette from './components/ColorPalette.jsx'
import ImageUploader from './components/ImageUploader.jsx'
import styles from './App.module.css'

export default function App() {
  const [tool, setTool] = useState('pen')  // 'pen' | 'eraser' | 'fill'
  const [color, setColor] = useState('#e63946')
  const [brushSize, setBrushSize] = useState(8)
  const [uploadedImage, setUploadedImage] = useState(null)
  const canvasRef = useRef(null)

  return (
    <div className={styles.app}>
      <header className={styles.header}>
        <h1 className={styles.title}>🎨 Coloring Book</h1>
      </header>

      <div className={styles.workspace}>
        <aside className={styles.sidebar}>
          <ImageUploader onImageUpload={setUploadedImage} />
          <Toolbar
            tool={tool}
            setTool={setTool}
            brushSize={brushSize}
            setBrushSize={setBrushSize}
            onUndo={() => canvasRef.current?.undo()}
            onClear={() => canvasRef.current?.clear()}
            onSave={() => canvasRef.current?.save()}
          />
          <ColorPalette color={color} setColor={setColor} />
        </aside>

        <main className={styles.canvasArea}>
          {!uploadedImage ? (
            <div className={styles.placeholder}>
              <span>⬆️ Upload a coloring page to get started</span>
            </div>
          ) : (
            <Canvas
              ref={canvasRef}
              tool={tool}
              color={color}
              brushSize={brushSize}
              uploadedImage={uploadedImage}
            />
          )}
        </main>
      </div>
    </div>
  )
}