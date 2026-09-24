// src/components/SoundToggle.jsx
import { useEffect, useState } from 'react'
import { isMuted, setMuted, onMuteChange, sfx } from '../utils/sound.js'
import { SoundIcon } from './Icons.jsx'

export default function SoundToggle({ className, iconClassName }) {
  const [muted, setMutedState] = useState(isMuted)

  useEffect(() => onMuteChange(setMutedState), [])

  const toggle = () => {
    const next = !muted
    setMuted(next)
    if (!next) sfx.tap()
  }

  return (
    <button
      className={className}
      onClick={toggle}
      aria-label={muted ? 'Sound on' : 'Sound off'}
      aria-pressed={!muted}
      title={muted ? 'Sound on' : 'Sound off'}
    >
      <SoundIcon muted={muted} className={iconClassName} />
    </button>
  )
}
