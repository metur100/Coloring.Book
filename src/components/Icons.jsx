// src/components/Icons.jsx
// Chunky, sticker-style cartoon icons (thick outlines, bright fills) that small
// kids can recognize without any text.

const INK = '#3b2a5a'

function Svg({ children, size = '1em', ...rest }) {
  return (
    <svg
      viewBox="0 0 64 64"
      width={size}
      height={size}
      fill="none"
      stroke={INK}
      strokeWidth="3.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...rest}
    >
      {children}
    </svg>
  )
}

// Crayon, its tip and wrapper show the selected color
export function CrayonIcon({ color = '#ff595e', ...p }) {
  return (
    <Svg {...p}>
      <g transform="rotate(45 32 32)">
        <rect x="23" y="18" width="18" height="38" rx="4" fill={color} />
        <rect x="23" y="26" width="18" height="6" fill="#fff" opacity="0.55" stroke="none" />
        <rect x="23" y="44" width="18" height="6" fill="#fff" opacity="0.55" stroke="none" />
        <path d="M23 18 L32 3 L41 18 Z" fill="#ffe0b3" />
        <path d="M28.5 9 L32 3 L35.5 9 Z" fill={color} />
        <rect x="23" y="18" width="18" height="38" rx="4" />
      </g>
    </Svg>
  )
}

export function EraserIcon(p) {
  return (
    <Svg {...p}>
      <g transform="rotate(-40 32 32)">
        <rect x="10" y="20" width="44" height="24" rx="6" fill="#ff8fab" />
        <path d="M10 26 a6 6 0 0 1 6 -6 h12 v24 h-12 a6 6 0 0 1 -6 -6 Z" fill="#8ecae6" />
        <rect x="10" y="20" width="44" height="24" rx="6" />
        <path d="M28 20 v24" />
      </g>
      <circle cx="12" cy="54" r="3" fill="#ffc8dd" strokeWidth="2" />
      <circle cx="20" cy="58" r="2" fill="#bde0fe" strokeWidth="2" />
    </Svg>
  )
}

// Tipped paint bucket pouring the selected color
export function BucketIcon({ color = '#ff595e', ...p }) {
  return (
    <Svg {...p}>
      <path d="M46 36 C 56 40, 58 48, 55 56 C 53 61, 47 61, 46 55 C 45 49, 50 46, 46 36 Z" fill={color} />
      <g transform="rotate(-30 28 30)">
        <path d="M12 20 L16 50 Q28 56 40 50 L44 20 Z" fill="#ffd166" />
        <ellipse cx="28" cy="20" rx="16" ry="6" fill={color} />
        <path d="M14 20 Q28 -4 42 20" fill="none" />
      </g>
    </Svg>
  )
}

export function HandIcon(p) {
  return (
    <Svg {...p}>
      <path
        d="M20 34 V16 a4 4 0 0 1 8 0 V30 V11 a4 4 0 0 1 8 0 V30 V14 a4 4 0 0 1 8 0 V32 V22 a4 4 0 0 1 8 0 V40
           c0 12 -8 20 -18 20 c-8 0 -12 -3 -17 -10 L9 38 a4 4 0 0 1 6 -5 Z"
        fill="#ffd6a5"
      />
    </Svg>
  )
}

// Curly "go back" arrow
export function UndoIcon(p) {
  return (
    <Svg {...p}>
      <path
        d="M22 12 L6 26 L22 40 V32 H36 a10 10 0 0 1 0 20 H26 a4 4 0 0 0 0 8 H36 a18 18 0 0 0 0 -36 H22 Z"
        fill="#ffb703"
      />
    </Svg>
  )
}

export function TrashIcon(p) {
  return (
    <Svg {...p}>
      <path d="M14 20 H50 L46 58 H18 Z" fill="#80ed99" />
      <path d="M26 28 V50 M32 28 V50 M38 28 V50" strokeWidth="3" />
      <rect x="9" y="12" width="46" height="8" rx="4" fill="#57cc99" />
      <path d="M25 12 V8 a2 2 0 0 1 2 -2 H37 a2 2 0 0 1 2 2 V12" />
    </Svg>
  )
}

// Camera = "keep a picture of it"
export function CameraIcon(p) {
  return (
    <Svg {...p}>
      <path d="M22 16 L26 9 H38 L42 16 Z" fill="#a0c4ff" />
      <rect x="6" y="16" width="52" height="38" rx="9" fill="#4cc9f0" />
      <circle cx="32" cy="35" r="12" fill="#fff" />
      <circle cx="32" cy="35" r="6" fill={INK} stroke="none" />
      <circle cx="29.5" cy="32.5" r="2" fill="#fff" stroke="none" />
      <circle cx="49" cy="24" r="2.5" fill="#ffd166" strokeWidth="2" />
    </Svg>
  )
}

// House = "back to all pictures"
export function HomeIcon(p) {
  return (
    <Svg {...p}>
      <path d="M6 30 L32 8 L58 30" fill="none" strokeWidth="4.5" />
      <path d="M12 26 V56 H52 V26 L32 10 Z" fill="#ffadad" />
      <path d="M12 26 L32 10 L52 26" fill="none" />
      <rect x="26" y="38" width="12" height="18" rx="3" fill="#9d4edd" />
      <rect x="40" y="30" width="8" height="8" rx="1.5" fill="#fdffb6" strokeWidth="2.5" />
    </Svg>
  )
}

export function SoundIcon({ muted, ...p }) {
  return (
    <Svg {...p}>
      <path d="M8 24 H18 L32 12 V52 L18 40 H8 Z" fill="#ffd166" />
      {muted ? (
        <path d="M42 24 L56 40 M56 24 L42 40" stroke="#ef476f" strokeWidth="5" />
      ) : (
        <>
          <path d="M40 24 Q46 32 40 40" />
          <path d="M46 17 Q58 32 46 47" />
        </>
      )}
    </Svg>
  )
}

// Magnifier with minus = "zoom back out"
export function ZoomOutIcon(p) {
  return (
    <Svg {...p}>
      <path d="M40 40 L56 56" strokeWidth="8" stroke={INK} />
      <path d="M40 40 L56 56" strokeWidth="4" stroke="#ff9f1c" />
      <circle cx="26" cy="26" r="18" fill="#caf0f8" />
      <path d="M17 26 H35" strokeWidth="5" />
    </Svg>
  )
}

// Picture with a big plus = "add a new page"
export function AddPictureIcon(p) {
  return (
    <Svg {...p}>
      <rect x="6" y="12" width="44" height="38" rx="6" fill="#fff" />
      <path d="M10 46 L22 32 L30 40 L36 34 L46 46 Z" fill="#8ac926" strokeWidth="2.5" />
      <circle cx="18" cy="22" r="4" fill="#ffca3a" strokeWidth="2.5" />
      <circle cx="48" cy="46" r="13" fill="#ff595e" />
      <path d="M48 39 V53 M41 46 H55" stroke="#fff" strokeWidth="4.5" />
    </Svg>
  )
}

// Rainbow blob for picking any color
export function RainbowIcon(p) {
  return (
    <Svg {...p}>
      <path d="M6 46 a26 26 0 0 1 52 0" stroke="#ff595e" strokeWidth="6" />
      <path d="M13 46 a19 19 0 0 1 38 0" stroke="#ffca3a" strokeWidth="6" />
      <path d="M20 46 a12 12 0 0 1 24 0" stroke="#8ac926" strokeWidth="6" />
      <path d="M27 46 a5 5 0 0 1 10 0" stroke="#1982c4" strokeWidth="6" />
    </Svg>
  )
}
