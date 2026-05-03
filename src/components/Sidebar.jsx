import styles from './Sidebar.module.css'

const TOOLS = [
  { id: 'pen',    emoji: '✏️' },
  { id: 'eraser', emoji: '🧹' },
  { id: 'fill',   emoji: '🪣' },
  { id: 'hand',   emoji: '✋' }, // NEW
]

const PRESETS = [
  '#e63946','#f4a261','#ffdd57','#8ac926','#3a86ff',
  '#9b5de5','#f15bb5','#06d6a0','#ffffff','#212529',
]

export default function Sidebar({ tool, setTool, color, setColor, brushSize, setBrushSize, onUndo, onClear }) {
  return (
    <aside className={styles.sidebar}>

      {/* ── ROW 1 (phone) / normal flow (desktop): Tools + Size ── */}
      <div className={styles.row1}>
        <div className={styles.toolGroup}>
          {TOOLS.map(t => (
            <button
              key={t.id}
              className={`${styles.toolBtn} ${tool === t.id ? styles.active : ''}`}
              onClick={() => setTool(t.id)}
              title={t.id}
            >
              {t.emoji}
            </button>
          ))}
          <button className={styles.toolBtn} onClick={onUndo} title="Undo">↩️</button>
          <button className={`${styles.toolBtn} ${styles.dangerTool}`} onClick={onClear} title="Clear">🗑️</button>
        </div>

        <div className={styles.sizeGroup}>
          <input
            type="range"
            min={1}
            max={60}
            value={brushSize}
            onChange={e => setBrushSize(Number(e.target.value))}
            className={styles.slider}
          />
          <div className={styles.sizePreview}>
            <div style={{
              width: `${Math.min(brushSize, 36)}px`,
              height: `${Math.min(brushSize, 36)}px`,
              borderRadius: '50%',
              background: color,
              boxShadow: `0 0 8px ${color}88`,
              transition: 'all 0.15s',
              flexShrink: 0,
            }} />
          </div>
        </div>
      </div>

      {/* ── ROW 2 (phone) / normal flow (desktop): Colors ── */}
      <div className={styles.row2}>
        <div className={styles.palette}>
          {PRESETS.map(c => (
            <button
              key={c}
              className={`${styles.dot} ${color === c ? styles.dotActive : ''}`}
              style={{ background: c }}
              onClick={() => setColor(c)}
              title={c}
            />
          ))}
        </div>

        <label className={styles.colorSwatch} style={{ background: color }} title="Custom color">
          <input
            type="color"
            value={color}
            onChange={e => setColor(e.target.value)}
            className={styles.hiddenPicker}
          />
        </label>
      </div>

    </aside>
  )
}
