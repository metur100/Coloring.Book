import { useState, useRef } from 'react'
import Canvas from './components/Canvas.jsx'
import LeftSidebar from './components/LeftSidebar.jsx'
import RightSidebar from './components/RightSidebar.jsx'
import GalleryBar from './components/GalleryBar.jsx'
import styles from './App.module.css'

export default function App() {
  const [tool, setTool] = useState('pen')
  const [color, setColor] = useState('#e63946')
  const [brushSize, setBrushSize] = useState(10)
  const [images, setImages] = useState([])        // [{ id, name, src }]
  const [activeId, setActiveId] = useState(null)  // currently selected image id
  const [selectedFrame, setSelectedFrame] = useState(null)
  const canvasRef = useRef(null)

  const activeImage = images.find(img => img.id === activeId) ?? null

  const handleUpload = (files) => {
    const remaining = 10 - images.length
    if (remaining <= 0) return alert('Maximum 10 images reached.')
    const toAdd = Array.from(files).slice(0, remaining)
    toAdd.forEach(file => {
      if (!file.type.startsWith('image/')) return
      const reader = new FileReader()
      reader.onload = (e) => {
        const newImg = { id: Date.now() + Math.random(), name: file.name, src: e.target.result }
        setImages(prev => {
          const next = [...prev, newImg]
          if (!activeId) setActiveId(newImg.id)
          return next
        })
      }
      reader.readAsDataURL(file)
    })
  }

  const handleDelete = (id) => {
    setImages(prev => {
      const next = prev.filter(img => img.id !== id)
      if (activeId === id) setActiveId(next[0]?.id ?? null)
      return next
    })
  }

  return (
    <div className={styles.app}>
      <header className={styles.header}>
        <div className={styles.logo}>
          <span className={styles.logoIcon}>🎨</span>
          <span className={styles.logoText}>Coloring Book</span>
        </div>
        <GalleryBar
          images={images}
          activeId={activeId}
          onSelect={setActiveId}
          onDelete={handleDelete}
          onUpload={handleUpload}
        />
      </header>

      <div className={styles.workspace}>
        <LeftSidebar
          tool={tool}
          setTool={setTool}
          color={color}
          setColor={setColor}
          brushSize={brushSize}
          setBrushSize={setBrushSize}
        />

        <main className={styles.canvasArea}>
          {!activeImage ? (
            <div className={styles.empty}>
              <div className={styles.emptyIcon}>🖼️</div>
              <p className={styles.emptyTitle}>No image selected</p>
              <p className={styles.emptyHint}>Upload up to 10 images using the gallery above, then click one to start coloring.</p>
            </div>
          ) : (
            <Canvas
              ref={canvasRef}
              tool={tool}
              color={color}
              brushSize={brushSize}
              uploadedImage={activeImage.src}
            />
          )}
        </main>

        <RightSidebar
          onUndo={() => canvasRef.current?.undo()}
          onClear={() => canvasRef.current?.clear()}
          onSave={() => canvasRef.current?.save(selectedFrame)}
          selectedFrame={selectedFrame}
          setSelectedFrame={setSelectedFrame}
        />
      </div>
    </div>
  )
}