import styles from './Sidebar.module.css'

const TOOLS = [
  { id: 'pen',     emoji: '✏️' },
  { id: 'eraser',  emoji: '🧹' },
  { id: 'fill',    emoji: '🪣' },
  { id: 'sticker', emoji: '⭐' },
]

const STICKERS = ['⭐','🌈','❤️','🦄','🐉','🦁','🐸','🚀','🌟','💥','🎉','🍭','🦋','🐣','🎈']

const STICKER_SIZE = 48

const PRESETS = [
  '#e63946','#f4a261','#ffdd57','#8ac926','#3a86ff',
  '#9b5de5','#f15bb5','#06d6a0','#ffffff','#212529',
]

export default function Sidebar({ tool, setTool, color, setColor, brushSize, setBrushSize, onUndo, onClear, onSticker }) {
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

      {/* ── Stickers (shown when sticker tool active) ── */}
      {tool === 'sticker' && (
        <section className={styles.section}>
          <p className={styles.label}>Stickers</p>
          <div className={styles.stickerGrid}>
            {STICKERS.map(s => (
              <button
                key={s}
                className={styles.stickerBtn}
                onClick={() => onSticker(s)}
                title={s}
              >
                {s}
              </button>
            ))}
          </div>
        </section>
      )}

    </aside>
  )
}