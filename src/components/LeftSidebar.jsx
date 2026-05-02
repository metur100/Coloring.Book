import styles from './LeftSidebar.module.css'

const TOOLS = [
  { id: 'pen',    icon: '✏️', label: 'Pen' },
  { id: 'eraser', icon: '⬜', label: 'Erase' },
  { id: 'fill',   icon: '🪣', label: 'Fill' },
]

const PRESETS = [
  '#e63946','#f4a261','#e9c46a','#2a9d8f','#457b9d',
  '#9b5de5','#f15bb5','#ffffff','#adb5bd','#212529',
  '#ff595e','#ffca3a','#6a4c93','#1982c4','#8ac926',
  '#ff006e','#fb5607','#3a86ff','#06d6a0','#118ab2',
]

export default function LeftSidebar({ tool, setTool, color, setColor, brushSize, setBrushSize }) {
  return (
    <aside className={styles.sidebar}>
      {/* Tools */}
      <section className={styles.section}>
        <p className={styles.label}>Tools</p>
        <div className={styles.toolGroup}>
          {TOOLS.map(t => (
            <button
              key={t.id}
              className={`${styles.toolBtn} ${tool === t.id ? styles.active : ''}`}
              onClick={() => setTool(t.id)}
              title={t.label}
            >
              <span className={styles.toolIcon}>{t.icon}</span>
              <span className={styles.toolLabel}>{t.label}</span>
            </button>
          ))}
        </div>
      </section>

      {/* Brush size */}
      <section className={styles.section}>
        <p className={styles.label}>Size <span className={styles.sizeVal}>{brushSize}px</span></p>
        <input
          type="range" min={1} max={60} value={brushSize}
          onChange={e => setBrushSize(Number(e.target.value))}
          className={styles.slider}
        />
        <div className={styles.sizePreview}>
          <div style={{
            width: Math.min(brushSize, 48), height: Math.min(brushSize, 48),
            borderRadius: '50%', background: color,
            boxShadow: `0 0 8px ${color}88`,
            transition: 'all 0.2s',
          }} />
        </div>
      </section>

      {/* Color picker */}
      <section className={styles.section}>
        <p className={styles.label}>Color</p>
        <div className={styles.pickerRow}>
          <div className={styles.colorWrap}>
            <input
              type="color" value={color}
              onChange={e => setColor(e.target.value)}
              className={styles.colorInput}
              title="Custom color"
            />
            <span className={styles.colorIcon}>🎨</span>
          </div>
          <span className={styles.hexLabel}>{color.toUpperCase()}</span>
        </div>
      </section>

      {/* Preset swatches */}
      <section className={styles.section}>
        <p className={styles.label}>Palette</p>
        <div className={styles.swatches}>
          {PRESETS.map(c => (
            <button
              key={c}
              className={`${styles.swatch} ${color === c ? styles.selectedSwatch : ''}`}
              style={{ background: c }}
              onClick={() => setColor(c)}
              title={c}
            />
          ))}
        </div>
      </section>
    </aside>
  )
}
