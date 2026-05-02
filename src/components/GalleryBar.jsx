import { useRef } from 'react'
import styles from './GalleryBar.module.css'

export default function GalleryBar({ images, activeId, onSelect, onDelete, onUpload }) {
  const inputRef = useRef(null)

  const handleDrop = (e) => {
    e.preventDefault()
    onUpload(e.dataTransfer.files)
  }

  return (
    <div className={styles.bar}>
      {/* Upload slot */}
      <button
        className={styles.uploadSlot}
        onClick={() => inputRef.current.click()}
        onDragOver={e => e.preventDefault()}
        onDrop={handleDrop}
        title="Upload image (max 10)"
        disabled={images.length >= 10}
      >
        <span className={styles.plus}>+</span>
        <span className={styles.uploadLabel}>Add</span>
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className={styles.hidden}
        onChange={e => { onUpload(e.target.files); e.target.value = '' }}
      />

      {/* Image thumbnails */}
      <div className={styles.thumbList}>
        {images.map(img => (
          <div
            key={img.id}
            className={`${styles.thumb} ${img.id === activeId ? styles.active : ''}`}
            onClick={() => onSelect(img.id)}
            title={img.name}
          >
            <img src={img.src} alt={img.name} className={styles.thumbImg} />
            <button
              className={styles.deleteBtn}
              onClick={e => { e.stopPropagation(); onDelete(img.id) }}
              title="Remove image"
            >×</button>
            {img.id === activeId && <div className={styles.activeDot} />}
          </div>
        ))}
        {images.length === 0 && (
          <span className={styles.hint}>Upload up to 10 coloring pages →</span>
        )}
      </div>
    </div>
  )
}