// src/App.jsx
import { useEffect, useState, useCallback } from 'react'
import Gallery from './components/Gallery.jsx'
import Editor from './components/Editor.jsx'
import { loadImages, saveImages, deleteProgress } from './utils/storage.js'
import styles from './App.module.css'

function uid() {
  return `img_${Date.now()}_${Math.random().toString(36).slice(2)}`
}

async function decodeToImageBitmapOrImg(file) {
  const buf = await file.arrayBuffer()
  const blob = new Blob([buf], { type: file.type || 'application/octet-stream' })

  // Best path (Chrome/Edge/Firefox; Safari newer versions)
  if ('createImageBitmap' in window) {
    try {
      return await createImageBitmap(blob)
    } catch {
      // fallback below
    }
  }

  // Fallback: <img>
  const url = URL.createObjectURL(blob)
  try {
    const img = new Image()
    img.decoding = 'async'
    await new Promise((res, rej) => {
      img.onload = res
      img.onerror = rej
      img.src = url
    })
    return img
  } finally {
    URL.revokeObjectURL(url)
  }
}

function toPngDataURL(imageLike, maxW = 2200) {
  const w = imageLike.width || imageLike.naturalWidth
  const h = imageLike.height || imageLike.naturalHeight
  const s = Math.min(1, maxW / w)

  const cw = Math.round(w * s)
  const ch = Math.round(h * s)

  const c = document.createElement('canvas')
  c.width = cw
  c.height = ch
  const ctx = c.getContext('2d')
  ctx.drawImage(imageLike, 0, 0, cw, ch)

  // Normalize everything to PNG so WebP never breaks downstream canvas usage
  return c.toDataURL('image/png')
}

export default function App() {
  const [images, setImages] = useState([])
  const [editingId, setEditingId] = useState(null)

  // Load images from IndexedDB on mount
  useEffect(() => {
    let alive = true
    ;(async () => {
      const saved = await loadImages()
      if (!alive) return
      setImages(saved)
    })()
    return () => {
      alive = false
    }
  }, [])

  // Persist images list whenever it changes (async)
  useEffect(() => {
    // fire-and-forget
    saveImages(images)
  }, [images])

  const handleUpload = useCallback(
    async (filesOrPrepared) => {
      const remaining = 30 - images.length
      if (remaining <= 0) return alert('Maximum 30 images reached! 🎨')

      // Support BOTH:
      // 1) FileList from <input> or drag/drop
      // 2) Prepared array from the patched Gallery.jsx (optional)
      const arr = Array.from(filesOrPrepared || []).slice(0, remaining)

      // If Gallery already prepared {id,name,src}, accept it
      if (arr.length && arr[0] && typeof arr[0] === 'object' && 'src' in arr[0] && 'name' in arr[0]) {
        setImages(prev => [...prev, ...arr])
        return
      }

      // Otherwise treat as real File objects and decode (WebP-safe)
      const newOnes = []
      for (const file of arr) {
        if (!file) continue
        if (file.type && !file.type.startsWith('image/')) continue

        try {
          const decoded = await decodeToImageBitmapOrImg(file)
          const src = toPngDataURL(decoded, 2200)
          newOnes.push({ id: uid(), name: file.name, src })
        } catch (e) {
          console.error('Upload failed:', file?.name, e)
          alert(`Could not upload "${file?.name}". (WebP decoding failed in this browser.)`)
        }
      }

      if (newOnes.length) {
        setImages(prev => [...prev, ...newOnes])
      }
    },
    [images.length]
  )

  const handleDelete = useCallback(
    (id) => {
      if (!confirm('Delete this image and its coloring?')) return
      setImages(prev => prev.filter(img => img.id !== id))

      // async delete; don't block UI
      deleteProgress(id)

      if (editingId === id) setEditingId(null)
    },
    [editingId]
  )

  const activeImage = images.find(img => img.id === editingId) ?? null

  return (
    <div className={styles.app}>
      {editingId && activeImage ? (
        <Editor image={activeImage} onBack={() => setEditingId(null)} />
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
