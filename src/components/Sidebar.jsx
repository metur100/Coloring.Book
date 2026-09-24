import { sfx } from '../utils/sound.js'
import { burstAt } from '../utils/fx.js'
import {
  BucketIcon,
  CrayonIcon,
  EraserIcon,
  HandIcon,
  UndoIcon,
  TrashIcon,
  RainbowIcon,
} from './Icons.jsx'
import { PRESETS, SIZES } from '../utils/palette.js'
import styles from './Sidebar.module.css'

const TOOLS = [
  { id: 'fill',   Icon: BucketIcon, tint: true, title: 'Fill' },
  { id: 'pen',    Icon: CrayonIcon, tint: true, title: 'Draw' },
  { id: 'eraser', Icon: EraserIcon, title: 'Eraser' },
  { id: 'hand',   Icon: HandIcon,   title: 'Move' },
]

export default function Sidebar({ tool, setTool, color, setColor, brushSize, setBrushSize, onUndo, onClear }) {
  const pickTool = (id, e) => {
    if (id !== tool) {
      sfx.tool()
      burstAt(e.currentTarget, null, 8)
    }
    setTool(id)
  }

  const pickColor = (c, i, e) => {
    sfx.color(i)
    burstAt(e.currentTarget, c, 10)
    setColor(c)
  }

  const pickSize = (s, i) => {
    sfx.color(i * 3)
    setBrushSize(s)
    // Choosing a size means you want to draw
    if (tool !== 'pen' && tool !== 'eraser') setTool('pen')
  }

  const showSizes = tool === 'pen' || tool === 'eraser'

  return (
    <aside className={styles.sidebar}>

      {/* ── ROW 1 (phone) / normal flow (desktop): Tools + Size ── */}
      <div className={styles.row1}>
        <div className={styles.toolGroup}>
          {TOOLS.map(({ id, Icon, tint, title }) => (
            <button
              key={id}
              className={`${styles.toolBtn} ${tool === id ? styles.active : ''}`}
              onClick={(e) => pickTool(id, e)}
              title={title}
              aria-label={title}
              aria-pressed={tool === id}
            >
              <Icon className={styles.icon} {...(tint ? { color } : {})} />
            </button>
          ))}
          <button
            className={`${styles.toolBtn} ${styles.undoTool}`}
            onClick={() => { sfx.undo(); onUndo() }}
            title="Undo"
            aria-label="Undo"
          >
            <UndoIcon className={styles.icon} />
          </button>
          <button
            className={`${styles.toolBtn} ${styles.dangerTool}`}
            onClick={() => { sfx.clear(); onClear() }}
            title="Clear"
            aria-label="Clear"
          >
            <TrashIcon className={styles.icon} />
          </button>
        </div>

        {showSizes && (
          <div className={styles.sizeGroup}>
            {SIZES.map((s, i) => (
              <button
                key={s}
                className={`${styles.sizeBtn} ${brushSize === s ? styles.sizeActive : ''}`}
                onClick={() => pickSize(s, i)}
                aria-label={`Brush size ${i + 1}`}
                aria-pressed={brushSize === s}
              >
                <span className={styles.sizeDot} style={{ width: 8 + i * 9, height: 8 + i * 9 }} />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── ROW 2 (phone) / normal flow (desktop): Colors ── */}
      <div className={styles.row2}>
        <div className={styles.palette}>
          {PRESETS.map((c, i) => (
            <button
              key={c}
              className={`${styles.dot} ${color === c ? styles.dotActive : ''}`}
              style={{ '--c': c }}
              onClick={(e) => pickColor(c, i, e)}
              aria-label={`Color ${c}`}
              aria-pressed={color === c}
            />
          ))}

          <label
            className={`${styles.dot} ${styles.customDot} ${PRESETS.includes(color) ? '' : styles.dotActive}`}
            title="More colors"
            onClick={() => sfx.tap()}
          >
            <RainbowIcon className={styles.rainbow} />
            <input
              type="color"
              value={color}
              onChange={e => setColor(e.target.value)}
              className={styles.hiddenPicker}
            />
          </label>
        </div>
      </div>

    </aside>
  )
}
