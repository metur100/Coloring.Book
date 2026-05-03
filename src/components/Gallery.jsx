// src/components/Gallery.jsx
import { useEffect, useRef, useState } from 'react'
import { loadProgress } from '../utils/storage.js'
import styles from './Gallery.module.css'

function uid() {
  return crypto?.randomUUID?.() ?? String(Date.now() + Math.random())
}

async function decodeImage(file) {
  const buf = await file.arrayBuffer()
  const blob = new Blob([buf], { type: file.type || 'application/octet-stream' })

  if ('createImageBitmap' in window) {
    try {
      return await createImageBitmap(blob)
    } catch {
      // Fallback unten
    }
  }

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

  return c.toDataURL('image/png')
}

export default function Gallery({ images, onSelect, onUpload, onDelete }) {
  const inputRef = useRef(null)

  // Cache für Fortschritts-Badges (async)
  const [progressMap, setProgressMap] = useState({})

  useEffect(() => {
    let alive = true
    ;(async () => {
      const pairs = await Promise.all(
        (images || []).map(async (img) => [img.id, !!(await loadProgress(img.id))])
      )
      if (!alive) return
      const next = {}
      for (const [id, has] of pairs) next[id] = has
      setProgressMap(next)
    })()
    return () => {
      alive = false
    }
  }, [images])

  const handleDrop = (e) => {
    e.preventDefault()
    onUpload(e.dataTransfer.files)
  }

  // Fix für WebP: Uploads immer nach PNG normalisieren (DataURL)
  const handleUploadFiles = async (fileList) => {
    const files = Array.from(fileList || [])
    if (!files.length) return

    const prepared = []
    for (const file of files) {
      // leere Types erlauben, aber wenn vorhanden: muss Bild sein
      if (file.type && !file.type.startsWith('image/')) continue

      try {
        const decoded = await decodeImage(file)
        const src = toPngDataURL(decoded, 2200)

        prepared.push({
          id: uid(),
          name: file.name,
          src,
        })
      } catch (err) {
        console.error('Upload-Dekodierung fehlgeschlagen:', file.name, err)
        alert(
          `„${file.name}“ konnte nicht geladen werden. Wenn es WebP ist: bitte eine andere Datei oder einen anderen Browser probieren.`
        )
      }
    }

    if (prepared.length) {
      // Wir geben vorbereitete Bilder weiter (id/name/src)
      onUpload(prepared)
    }
  }

  return (
    <div className={styles.page}>
      {/* Kopf */}
      <header className={styles.header}>
        <div className={styles.logo}>
          <span className={styles.logoIcon}>🎨</span>
          <span className={styles.logoText}>Adijan's Malbuch</span>
        </div>
        <p className={styles.subtitle}>Wähle eine Seite zum Ausmalen</p>
      </header>

      {/* Grid */}
      <main className={styles.main}>
        {/* Upload-Karte */}
        <button
          className={styles.uploadCard}
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          disabled={images.length >= 30}
          aria-label="Neues Bild hochladen"
          title="Bild hinzufügen"
        >
          <div className={styles.uploadIcon}>+</div>
          <span className={styles.uploadLabel}>Bild hinzufügen</span>
          <span className={styles.uploadHint}>{images.length}/30</span>
        </button>

        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          multiple
          className={styles.hidden}
          onChange={async (e) => {
            await handleUploadFiles(e.target.files)
            e.target.value = ''
          }}
        />

        {/* Bild-Karten */}
        {images.map((img) => {
          const hasProgress = !!progressMap[img.id]

          return (
            <div
              key={img.id}
              className={styles.card}
              onClick={() => onSelect(img.id)}
              title="Zum Ausmalen öffnen"
            >
              <div className={styles.cardImg}>
                <img src={img.src} alt={img.name} />
                {hasProgress && (
                  <div
                    className={styles.progressBadge}
                    title="Ausmal-Fortschritt gespeichert"
                    aria-label="Ausmal-Fortschritt gespeichert"
                  >
                    🎨
                  </div>
                )}
              </div>

              <div className={styles.cardFooter}>
                <span className={styles.cardName}>
                  {img.name.replace(/\.[^.]+$/, '')}
                </span>

                <div className={styles.cardActions}>
                  <button
                    className={styles.editBtn}
                    onClick={(e) => {
                      e.stopPropagation()
                      onSelect(img.id)
                    }}
                    title="Dieses Bild ausmalen"
                    aria-label="Dieses Bild ausmalen"
                  >
                    ✏️ Ausmalen
                  </button>

                  <button
                    className={styles.deleteBtn}
                    onClick={(e) => {
                      e.stopPropagation()
                      onDelete(img.id)
                    }}
                    title="Bild löschen"
                    aria-label="Bild löschen"
                  >
                    🗑
                  </button>
                </div>
              </div>
            </div>
          )
        })}

        {/* Leerzustand */}
        {images.length === 0 && (
          <div className={styles.empty}>
            <div className={styles.emptyIcon}>🖼️</div>
            <p>
              Noch keine Bilder. Klicke auf <strong>Bild hinzufügen</strong>, um zu starten!
            </p>
          </div>
        )}
      </main>
    </div>
  )
}
