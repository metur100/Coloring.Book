// src/components/Editor.jsx
import Canvas from './Canvas.jsx';
import Sidebar from './Sidebar.jsx';
import { PRESETS, SIZES } from '../utils/palette.js';
import SoundToggle from './SoundToggle.jsx';
import { HomeIcon, CameraIcon } from './Icons.jsx';
import { sfx } from '../utils/sound.js';
import { confetti, burstAt } from '../utils/fx.js';
import styles from './Editor.module.css';
import { useEffect, useRef, useState, useCallback } from 'react';

export default function Editor({ image, onBack }) {
  const [tool, setTool] = useState('fill');
  const [color, setColor] = useState(PRESETS[0]);
  const [brushSize, setBrushSize] = useState(SIZES[1]);
  const canvasRef = useRef(null);

  const flush = useCallback(() => {
    canvasRef.current?.flushSave?.();
  }, []);

  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === 'hidden') flush();
    };
    window.addEventListener('pagehide', flush);
    window.addEventListener('beforeunload', flush);
    document.addEventListener('visibilitychange', onVis);

    return () => {
      window.removeEventListener('pagehide', flush);
      window.removeEventListener('beforeunload', flush);
      document.removeEventListener('visibilitychange', onVis);
      flush();
    };
  }, [flush]);

  const handleBack = () => {
    sfx.back();
    flush();
    onBack();
  };

  const handleSave = (e) => {
    sfx.save();
    burstAt(e.currentTarget, null, 24);
    confetti();
    canvasRef.current?.save();
  };

  return (
    <div className={styles.editor}>
      <header className={styles.topbar}>
        <button className={`${styles.topBtn} ${styles.homeBtn}`} onClick={handleBack} aria-label="Back to gallery" title="Home">
          <HomeIcon className={styles.topIcon} />
        </button>

        <div className={styles.spacer} />

        <SoundToggle className={styles.topBtn} iconClassName={styles.topIcon} />

        <button
          className={`${styles.topBtn} ${styles.saveBtn}`}
          onClick={handleSave}
          aria-label="Save image"
          title="Save"
        >
          <CameraIcon className={styles.topIcon} />
        </button>
      </header>

      <div className={styles.body}>
        <Sidebar
          tool={tool}
          setTool={setTool}
          color={color}
          setColor={setColor}
          brushSize={brushSize}
          setBrushSize={setBrushSize}
          onUndo={() => canvasRef.current?.undo()}
          onClear={() => canvasRef.current?.clear()}
        />

        <main className={styles.canvasArea}>
          <Canvas
            ref={canvasRef}
            tool={tool}
            color={color}
            brushSize={brushSize}
            image={image}
          />
        </main>
      </div>
    </div>
  );
}
