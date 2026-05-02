import { useRef } from 'react'
import styles from './ImageUploader.module.css'

export default function ImageUploader({ onImageUpload }) {
  const inputRef = useRef(null)

  const handleFile = (file) => {
    if (!file || !file.type.startsWith('image/')) return
    const reader = new FileReader()
    reader.onload = (e) => onImageUpload(e.target.result)
    reader.readAsDataURL(file)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    handleFile(e.dataTransfer.files[0])
  }

  return (
    <div
      className={styles.uploader}
      onClick={() => inputRef.current.click()}
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={(e) => handleFile(e.target.files[0])}
        className={styles.hidden}
      />
      <span className={styles.icon}>🖼️</span>
      <span className={styles.text}>Upload Image</span>
    </div>
  )
}