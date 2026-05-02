import { useRef } from 'react'
import { loadProgress } from '../utils/storage.js'
import styles from './Gallery.module.css'

export default function Gallery({ images, onSelect, onUpload, onDelete }) {
  const inputRef = useRef(null)

  const handleDrop = e => { e.preventDefault(); onUpload(e.dataTransfer.files) }

  return (
    <div className={styles.page}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.logo}>
          <span className={styles.logoIcon}>🎨</span>
          <span className={styles.logoText}>Coloring Book</span>
        </div>
        <p className={styles.subtitle}>Choose a page to color</p>
      </header>

      {/* Grid */}
      <main className={styles.main}>
        {/* Upload card */}
        <button
          className={styles.uploadCard}
          onClick={() => inputRef.current.click()}
          onDragOver={e => e.preventDefault()}
          onDrop={handleDrop}
          disabled={images.length >= 30}
          aria-label="Upload new image"
        >
          <div className={styles.uploadIcon}>+</div>
          <span className={styles.uploadLabel}>Add Image</span>
          <span className={styles.uploadHint}>{images.length}/30</span>
        </button>
        <input
          ref={inputRef}
          type="file" accept="image/*" multiple
          className={styles.hidden}
          onChange={e => { onUpload(e.target.files); e.target.value = '' }}
        />

        {/* Image cards */}
        {images.map(img => {
          const hasProgress = !!loadProgress(img.id)
          return (
            <div key={img.id} className={styles.card} onClick={() => onSelect(img.id)}>
              <div className={styles.cardImg}>
                <img src={img.src} alt={img.name} />
                {hasProgress && (
                  <div className={styles.progressBadge} title="Has saved coloring">
                    🎨
                  </div>
                )}
              </div>
              <div className={styles.cardFooter}>
                <span className={styles.cardName}>{img.name.replace(/\.[^.]+$/, '')}</span>
                <div className={styles.cardActions}>
                  <button
                    className={styles.editBtn}
                    onClick={e => { e.stopPropagation(); onSelect(img.id) }}
                    title="Color this image"
                  >
                    ✏️ Color
                  </button>
                  <button
                    className={styles.deleteBtn}
                    onClick={e => { e.stopPropagation(); onDelete(img.id) }}
                    title="Delete image"
                  >
                    🗑
                  </button>
                </div>
              </div>
            </div>
          )
        })}

        {/* Empty state */}
        {images.length === 0 && (
          <div className={styles.empty}>
            <div className={styles.emptyIcon}>🖼️</div>
            <p>No images yet. Click <strong>Add Image</strong> to get started!</p>
          </div>
        )}
      </main>
    </div>
  )
}