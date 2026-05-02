const IMAGES_KEY = 'cb_images_v1'
const PROGRESS_KEY = 'cb_progress_v1'

// ── Images (metadata + original src) ─────────────────────────────
export function loadImages() {
  try { return JSON.parse(localStorage.getItem(IMAGES_KEY)) || [] }
  catch { return [] }
}

export function saveImages(images) {
  // Store id, name, src (base64). Thumbnail generated on the fly.
  localStorage.setItem(IMAGES_KEY, JSON.stringify(
    images.map(({ id, name, src }) => ({ id, name, src }))
  ))
}

// ── Per-image coloring progress (overlay dataURL) ────────────────
export function loadProgress(id) {
  try {
    const all = JSON.parse(localStorage.getItem(PROGRESS_KEY)) || {}
    return all[id] || null
  } catch { return null }
}

export function saveProgress(id, dataURL) {
  try {
    const all = JSON.parse(localStorage.getItem(PROGRESS_KEY)) || {}
    all[id] = dataURL
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(all))
  } catch {}
}

export function deleteProgress(id) {
  try {
    const all = JSON.parse(localStorage.getItem(PROGRESS_KEY)) || {}
    delete all[id]
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(all))
  } catch {}
}