// src/components/Gallery.jsx
import { useEffect, useRef, useState } from 'react'
import { loadProgress } from '../utils/storage.js'
import { sfx } from '../utils/sound.js'
import { burstAt, confetti } from '../utils/fx.js'
import { AddPictureIcon, TrashIcon } from './Icons.jsx'
import SoundToggle from './SoundToggle.jsx'
import styles from './Gallery.module.css'

// Every card gets its own playful tilt and frame color
const TILTS = [-2.5, 1.5, -1, 2.5, -1.8, 1]
const FRAMES = ['#ff595e', '#ffca3a', '#8ac926', '#1982c4', '#6a4c93', '#ff85c0']

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
      sfx.upload()
      confetti(60)
    }
  }

  const TITLE = "Adijan's Malbuch"

  return (
    <div className={styles.page}>
      {/* Floating decorations */}
      <div className={styles.sky} aria-hidden="true">
        <span className={`${styles.float} ${styles.cloud1}`}>☁️</span>
        <span className={`${styles.float} ${styles.cloud2}`}>☁️</span>
        <span className={`${styles.float} ${styles.star1}`}>⭐</span>
        <span className={`${styles.float} ${styles.star2}`}>✨</span>
        <span className={`${styles.float} ${styles.rainbow}`}>🌈</span>
        <span className={`${styles.float} ${styles.butterfly}`}>🦋</span>
      </div>

      {/* Kopf */}
      <header className={styles.header}>
        <h1 className={styles.logo} aria-label={TITLE}>
          {[...TITLE].map((ch, i) => (
            <span key={i} className={styles.letter} style={{ '--i': i }} aria-hidden="true">
              {ch === ' ' ? '\u00a0' : ch}
            </span>
          ))}
        </h1>
        <div className={styles.headerTools}>
          <SoundToggle className={styles.soundBtn} iconClassName={styles.soundIcon} />
        </div>
      </header>

      {/* Grid */}
      <main className={styles.main}>
        {/* Upload-Karte */}
        <button
          className={`${styles.uploadCard} ${images.length === 0 ? styles.invite : ''}`}
          onClick={() => {
            sfx.tap()
            inputRef.current?.click()
          }}
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          disabled={images.length >= 30}
          aria-label="Neues Bild hochladen"
          title="Bild hinzufügen"
        >
          <AddPictureIcon className={styles.uploadIcon} />
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
        {images.map((img, i) => {
          const hasProgress = !!progressMap[img.id]

          return (
            <div
              key={img.id}
              className={styles.card}
              style={{ '--tilt': `${TILTS[i % TILTS.length]}deg`, '--frame': FRAMES[i % FRAMES.length] }}
              onClick={(e) => {
                sfx.open()
                burstAt(e.currentTarget, FRAMES[i % FRAMES.length], 20)
                onSelect(img.id)
              }}
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
                    ⭐
                  </div>
                )}
              </div>

              <button
                className={styles.deleteBtn}
                onClick={(e) => {
                  e.stopPropagation()
                  onDelete(img.id)
                }}
                title="Bild löschen"
                aria-label="Bild löschen"
              >
                <TrashIcon className={styles.deleteIcon} />
              </button>
            </div>
          )
        })}
      </main>
    </div>
  )
}
