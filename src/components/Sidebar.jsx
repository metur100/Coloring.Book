import styles from './Sidebar.module.css'

const TOOLS = [
  { id: 'pen',    emoji: '✏️' },
  { id: 'eraser', emoji: '🧹' },
  { id: 'fill',   emoji: '🪣' },
]

const PRESETS = [
  '#e63946','#ff595e','#ff006e','#f15bb5','#ff6fd8',
  '#f4a261','#fb5607','#ffca3a','#e9c46a','#ffdd57',
  '#8ac926','#06d6a0','#2a9d8f','#6ef0a0','#34d399',
  '#3a86ff','#1982c4','#457b9d','#9b5de5','#6a4c93',
  '#ffffff','#e0e0e0','#adb5bd','#555555','#212529',
]

export default function Sidebar({ tool, setTool, color, setColor, brushSize, setBrushSize, onUndo, onClear }) {
  return (
    <aside className={styles.sidebar}>

      {/* ── Tools + Actions (combined) ── */}
      <section className={styles.section}>
        <p className={styles.label}>Tools</p>
        <div className={styles.toolGroup}>
          {TOOLS.map(t => (
            <button
              key={t.id}
              className={`${styles.toolBtn} ${tool===t.id ? styles.active : ''}`}
              onClick={() => setTool(t.id)}
              title={t.id}
            >
              {t.emoji}
            </button>
          ))}
          <button className={styles.toolBtn} onClick={onUndo} title="Undo">↩️</button>
          <button className={`${styles.toolBtn} ${styles.dangerTool}`} onClick={onClear} title="Clear">🗑️</button>
        </div>
      </section>

      {/* ── Size ── */}
      <section className={styles.section}>
        <p className={styles.label}>Size</p>
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

      {/* ── Palette FIRST ── */}
      <section className={styles.section}>
        <p className={styles.label}>Colors</p>
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

      {/* ── Custom Color picker AFTER palette ── */}
      <section className={styles.section}>
        <p className={styles.label}>Custom</p>
        <label className={styles.colorSwatch} style={{ background: color }}>
          <input
            type="color" value={color}
            onChange={e => setColor(e.target.value)}
            className={styles.hiddenPicker}
          />
        </label>
      </section>

    </aside>
  )
}