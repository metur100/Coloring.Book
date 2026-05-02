import { useState, useEffect } from 'react'
import Gallery from './components/Gallery.jsx'
import Editor from './components/Editor.jsx'
import { loadImages, saveImages, deleteProgress } from './utils/storage.js'
import styles from './App.module.css'

export default function App() {
  const [images, setImages] = useState(() => loadImages())
  const [editingId, setEditingId] = useState(null)

  // Persist images list whenever it changes
  useEffect(() => { saveImages(images) }, [images])

  const handleUpload = (files) => {
    const remaining = 30 - images.length
    if (remaining <= 0) return alert('Maximum 30 images reached.')
    Array.from(files).slice(0, remaining).forEach(file => {
      if (!file.type.startsWith('image/')) return
      const reader = new FileReader()
      reader.onload = e => {
        setImages(prev => [
          ...prev,
          { id: `img_${Date.now()}_${Math.random().toString(36).slice(2)}`, name: file.name, src: e.target.result }
        ])
      }
      reader.readAsDataURL(file)
    })
  }

  const handleDelete = (id) => {
    if (!confirm('Delete this image and its coloring?')) return
    setImages(prev => prev.filter(img => img.id !== id))
    deleteProgress(id)
    if (editingId === id) setEditingId(null)
  }

  const activeImage = images.find(img => img.id === editingId) ?? null

  return (
    <div className={styles.app}>
      {editingId && activeImage ? (
        <Editor
          image={activeImage}
          onBack={() => setEditingId(null)}
        />
      ) : (
        <Gallery
          images={images}
          onSelect={setEditingId}
          onUpload={handleUpload}
          onDelete={handleDelete}
        />
      )}
    </div>
  )
}
