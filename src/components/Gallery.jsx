// src/components/Gallery.jsx
import { useEffect, useMemo, useRef, useState } from 'react';
import { loadProgress } from '../utils/storage.js';
import styles from './Gallery.module.css';

function uid() {
  return crypto?.randomUUID?.() ?? String(Date.now() + Math.random());
}

async function decodeImage(file) {
  const buf = await file.arrayBuffer();
  const blob = new Blob([buf], { type: file.type || 'application/octet-stream' });

  if ('createImageBitmap' in window) {
    try {
      return await createImageBitmap(blob);
    } catch {
      // fall back
    }
  }

  const url = URL.createObjectURL(blob);
  try {
    const img = new Image();
    img.decoding = 'async';
    await new Promise((res, rej) => {
      img.onload = res;
      img.onerror = rej;
      img.src = url;
    });
    return img;
  } finally {
    URL.revokeObjectURL(url);
  }
}

function toPngDataURL(imageLike, maxW = 2200) {
  const w = imageLike.width || imageLike.naturalWidth;
  const h = imageLike.height || imageLike.naturalHeight;

  const s = Math.min(1, maxW / w);
  const cw = Math.round(w * s);
  const ch = Math.round(h * s);

  const c = document.createElement('canvas');
  c.width = cw;
  c.height = ch;
  const ctx = c.getContext('2d');
  ctx.drawImage(imageLike, 0, 0, cw, ch);

  return c.toDataURL('image/png');
}

export default function Gallery({ images, onSelect, onUpload, onDelete }) {
  const inputRef = useRef(null);

  // progress badge cache (async)
  const [progressMap, setProgressMap] = useState({});

  useEffect(() => {
    let alive = true;
    (async () => {
      const pairs = await Promise.all(
        (images || []).map(async (img) => [img.id, !!(await loadProgress(img.id))])
      );
      if (!alive) return;
      const next = {};
      for (const [id, has] of pairs) next[id] = has;
      setProgressMap(next);
    })();
    return () => {
      alive = false;
    };
  }, [images]);

  const handleDrop = (e) => {
    e.preventDefault();
    onUpload(e.dataTransfer.files);
  };

  // This wrapper fixes WebP upload by normalizing all uploads to PNG dataURL
  const handleUploadFiles = async (fileList) => {
    const files = Array.from(fileList || []);
    if (!files.length) return;

    const prepared = [];
    for (const file of files) {
      // allow empty type too, but prefer known image types
      if (file.type && !file.type.startsWith('image/')) continue;

      try {
        const decoded = await decodeImage(file);
        const src = toPngDataURL(decoded, 2200);

        prepared.push({
          id: uid(),
          name: file.name,
          src,
        });
      } catch (err) {
        console.error('Upload decode failed:', file.name, err);
        alert(`Could not load "${file.name}". If it's a WebP, try another file or browser.`);
      }
    }

    if (prepared.length) {
      // call your existing onUpload with "virtual files" (images)
      // If your App expects FileList, change App to accept prepared images instead.
      onUpload(prepared);
    }
  };

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.logo}>
          <span className={styles.logoIcon}>🎨</span>
          <span className={styles.logoText}>Adijan's Coloring Book</span>
        </div>
        <p className={styles.subtitle}>Choose a page to color</p>
      </header>

      <main className={styles.main}>
        <button
          className={styles.uploadCard}
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
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
          type="file"
          // Explicitly include webp (some browsers are picky with image/*)
          accept="image/png,image/jpeg,image/webp"
          multiple
          className={styles.hidden}
          onChange={async (e) => {
            await handleUploadFiles(e.target.files);
            e.target.value = '';
          }}
        />

        {images.map((img) => {
          const hasProgress = !!progressMap[img.id];

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
                <span className={styles.cardName}>
                  {img.name.replace(/\.[^.]+$/, '')}
                </span>

                <div className={styles.cardActions}>
                  <button
                    className={styles.editBtn}
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelect(img.id);
                    }}
                    title="Color this image"
                  >
                    ✏️ Color
                  </button>

                  <button
                    className={styles.deleteBtn}
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(img.id);
                    }}
                    title="Delete image"
                  >
                    🗑
                  </button>
                </div>
              </div>
            </div>
          );
        })}

        {images.length === 0 && (
          <div className={styles.empty}>
            <div className={styles.emptyIcon}>🖼️</div>
            <p>
              No images yet. Click <strong>Add Image</strong> to get started!
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
