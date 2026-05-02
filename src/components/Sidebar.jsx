import styles from './Sidebar.module.css'

const TOOLS = [
  { id: 'pen',    emoji: '✏️', label: 'Pen' },
  { id: 'eraser', emoji: '⬜', label: 'Erase' },
  { id: 'fill',   emoji: '🪣', label: 'Fill' },
]

const PRESETS = [
  '#e63946','#f4a261','#e9c46a','#2a9d8f','#457b9d',
  '#9b5de5','#f15bb5','#ffffff','#adb5bd','#212529',
  '#ff595e','#ffca3a','#6a4c93','#1982c4','#8ac926',
  '#ff006e','#fb5607','#3a86ff','#06d6a0','#118ab2',
]

export default function Sidebar({ tool, setTool, color, setColor, brushSize, setBrushSize, onUndo, onClear }) {
  return (
    <aside className={styles.sidebar}>
      {/* ── Tools ── */}
      <section className={styles.section}>
        <p className={styles.label}>Tools</p>
        <div className={styles.toolGroup}>
          {TOOLS.map(t => (
            <button
              key={t.id}
              className={`${styles.toolBtn} ${tool===t.id ? styles.active : ''}`}
              onClick={() => setTool(t.id)}
            >
              <span className={styles.toolEmoji}>{t.emoji}</span>
              <span>{t.label}</span>
            </button>
          ))}
        </div>
      </section>

      {/* ── Size ── */}
      <section className={styles.section}>
        <p className={styles.label}>Size <span className={styles.sizeVal}>{brushSize}px</span></p>
        <input
          type="range" min={1} max={60} value={brushSize}
          onChange={e => setBrushSize(Number(e.target.value))}
          className={styles.slider}
        />
        <div className={styles.sizePreview}>
          <div style={{
            width: `${Math.min(brushSize, 44)}px`,
            height: `${Math.min(brushSize, 44)}px`,
            borderRadius: '50%',
            background: color,
            boxShadow: `0 0 10px ${color}88`,
            transition: 'all 0.15s',
            flexShrink: 0,
          }} />
        </div>
      </section>

      {/* ── Color ── */}
      <section className={styles.section}>
        <p className={styles.label}>Color</p>
        <div className={styles.colorRow}>
          <label className={styles.colorSwatch} style={{ background: color }}>
            <input
              type="color" value={color}
              onChange={e => setColor(e.target.value)}
              className={styles.hiddenPicker}
            />
          </label>
          <span className={styles.hexLabel}>{color.toUpperCase()}</span>
        </div>
      </section>

      {/* ── Palette ── */}
      <section className={styles.section}>
        <p className={styles.label}>Palette</p>
        <div className={styles.palette}>
          {PRESETS.map(c => (
            <button
              key={c}
              className={`${styles.dot} ${color===c ? styles.dotActive : ''}`}
              style={{ background: c }}
              onClick={() => setColor(c)}
              title={c}
            />
          ))}
        </div>
      </section>

      {/* ── Actions ── */}
      <section className={styles.section}>
        <p className={styles.label}>Actions</p>
        <button className={styles.actionBtn} onClick={onUndo}>
          ↩️ Undo
        </button>
        <button className={`${styles.actionBtn} ${styles.danger}`} onClick={onClear}>
          🗑️ Clear
        </button>
      </section>
    </aside>
  )
}