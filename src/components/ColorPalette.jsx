import styles from './ColorPalette.module.css'

const PRESET_COLORS = [
  '#e63946', '#ff6b6b', '#ff9f1c', '#ffbf69',
  '#f9c74f', '#90be6d', '#43aa8b', '#4cc9f0',
  '#457b9d', '#1d3557', '#9b5de5', '#f15bb5',
  '#ffffff', '#d3d3d3', '#808080', '#000000',
  '#a0522d', '#8b4513', '#deb887', '#f5deb3',
]

export default function ColorPalette({ color, setColor }) {
  return (
    <div className={styles.palette}>
      <p className={styles.label}>Color</p>
      <div className={styles.pickerRow}>
        <input
          type="color"
          value={color}
          onChange={(e) => setColor(e.target.value)}
          className={styles.colorInput}
          title="Custom color"
        />
        <span className={styles.hexLabel}>{color.toUpperCase()}</span>
      </div>
      <div className={styles.swatches}>
        {PRESET_COLORS.map((c) => (
          <button
            key={c}
            className={`${styles.swatch} ${color === c ? styles.selected : ''}`}
            style={{ background: c }}
            onClick={() => setColor(c)}
            title={c}
          />
        ))}
      </div>
    </div>
  )
}