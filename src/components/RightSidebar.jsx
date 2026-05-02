import FramePicker from './FramePicker.jsx'
import styles from './RightSidebar.module.css'

export default function RightSidebar({ onUndo, onClear, onSave, selectedFrame, setSelectedFrame }) {
  return (
    <aside className={styles.sidebar}>
      <section className={styles.section}>
        <p className={styles.label}>Actions</p>
        <button className={styles.btn} onClick={onUndo}>
          <span>↩️</span> Undo
        </button>
        <button className={`${styles.btn} ${styles.danger}`} onClick={onClear}>
          <span>🗑️</span> Clear
        </button>
        <button className={`${styles.btn} ${styles.success}`} onClick={onSave}>
          <span>💾</span> Save PNG
        </button>
      </section>

      <section className={`${styles.section} ${styles.frameSec}`}>
        <p className={styles.label}>Frame</p>
        <FramePicker selected={selectedFrame} onSelect={setSelectedFrame} />
      </section>
    </aside>
  )
}