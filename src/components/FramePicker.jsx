import styles from './FramePicker.module.css'

export const FRAMES = [
  {
    id: 'none',
    label: 'None',
    preview: 'transparent',
    style: null,
  },
  {
    id: 'gold',
    label: 'Gold',
    preview: 'linear-gradient(135deg,#f6d365,#fda085)',
    style: { padding: 24, background: '#1a0a00', border: '#c9a84c', borderWidth: 12 },
  },
  {
    id: 'midnight',
    label: 'Night',
    preview: 'linear-gradient(135deg,#0f2027,#203a43,#2c5364)',
    style: { padding: 20, background: '#0d1b2a', border: '#4cc9f0', borderWidth: 8 },
  },
  {
    id: 'rose',
    label: 'Rose',
    preview: 'linear-gradient(135deg,#f093fb,#f5576c)',
    style: { padding: 20, background: '#2d0a1e', border: '#f5576c', borderWidth: 10 },
  },
  {
    id: 'forest',
    label: 'Forest',
    preview: 'linear-gradient(135deg,#134e5e,#71b280)',
    style: { padding: 20, background: '#0a1f0f', border: '#52b788', borderWidth: 10 },
  },
  {
    id: 'sunset',
    label: 'Sunset',
    preview: 'linear-gradient(135deg,#f7971e,#ffd200)',
    style: { padding: 20, background: '#1a0800', border: '#ffd200', borderWidth: 10 },
  },
  {
    id: 'ocean',
    label: 'Ocean',
    preview: 'linear-gradient(135deg,#1a6dff,#c822ff)',
    style: { padding: 20, background: '#05001a', border: '#7b2fff', borderWidth: 10 },
  },
  {
    id: 'chalk',
    label: 'Chalk',
    preview: 'linear-gradient(135deg,#e0e0e0,#ffffff)',
    style: { padding: 24, background: '#f5f5f5', border: '#bdbdbd', borderWidth: 14 },
  },
  {
    id: 'neon',
    label: 'Neon',
    preview: 'linear-gradient(135deg,#00f2fe,#4facfe)',
    style: { padding: 20, background: '#000', border: '#00f2fe', borderWidth: 6,
      cornerFn: (ctx, W, H) => {
        ctx.strokeStyle = '#ff00ff'
        ctx.lineWidth = 6
        const s = 30
        ;[[0,0],[W,0],[W,H],[0,H]].forEach(([x,y]) => {
          ctx.beginPath()
          ctx.moveTo(x === 0 ? x+s : x-s, y)
          ctx.lineTo(x, y)
          ctx.lineTo(x, y === 0 ? y+s : y-s)
          ctx.stroke()
        })
      }
    },
  },
  {
    id: 'vintage',
    label: 'Vintage',
    preview: 'linear-gradient(135deg,#d4a843,#8b6914)',
    style: { padding: 28, background: '#2b1d0e', border: '#8b6914', borderWidth: 16,
      cornerFn: (ctx, W, H) => {
        ctx.fillStyle = '#d4a843'
        const s = 20
        ;[[s,s],[W-s,s],[W-s,H-s],[s,H-s]].forEach(([x,y]) => {
          ctx.beginPath()
          ctx.arc(x, y, 6, 0, Math.PI*2)
          ctx.fill()
        })
      }
    },
  },
]

export default function FramePicker({ selected, onSelect }) {
  return (
    <div className={styles.list}>
      {FRAMES.map(f => (
        <button
          key={f.id}
          className={`${styles.frameBtn} ${selected?.id === f.id ? styles.active : ''}`}
          onClick={() => onSelect(f.id === 'none' ? null : f)}
          title={f.label}
        >
          <div
            className={styles.framePreview}
            style={{ background: f.preview }}
          />
          <span className={styles.frameLabel}>{f.label}</span>
        </button>
      ))}
    </div>
  )
}
