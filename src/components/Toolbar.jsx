import styles from './Toolbar.module.css'

const TOOLS = [
  { id: 'pen',    icon: '✏️', title: 'Pen' },
  { id: 'eraser', icon: '⬜', title: 'Eraser' },
  { id: 'fill',   icon: '🪣', title: 'Fill' },
]

export default function Toolbar({ tool, setTool, brushSize, setBrushSize, onUndo, onClear, onSave }) {
  return (
    <div className={styles.toolbar}>
      <p className={styles.label}>Tools</p>
      <div className={styles.toolGroup}>
        {TOOLS.map((t) => (
          <button
            key={t.id}
            title={t.title}
            className={`${styles.toolBtn} ${tool === t.id ? styles.active : ''}`}
            onClick={() => setTool(t.id)}
          >
            {t.icon}
            <span className={styles.toolName}>{t.title}</span>
          </button>
        ))}
      </div>

      <p className={styles.label}>Brush Size</p>
      <div className={styles.sliderRow}>
        <input
          type="range" min={1} max={40} value={brushSize}
          onChange={(e) => setBrushSize(Number(e.target.value))}
          className={styles.slider}
        />
        <span className={styles.sizeLabel}>{brushSize}px</span>
      </div>

      <p className={styles.label}>Actions</p>
      <div className={styles.actions}>
        <button className={styles.actionBtn} onClick={onUndo}>↩️ Undo</button>
        <button className={styles.actionBtn} onClick={onClear}>🗑️ Clear</button>
        <button className={`${styles.actionBtn} ${styles.save}`} onClick={onSave}>💾 Save</button>
      </div>
    </div>
  )
}
