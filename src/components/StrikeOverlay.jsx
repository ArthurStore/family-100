import { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

export default function StrikeOverlay({ strikeCount, visible, onClose }) {
  useEffect(() => {
    if (!visible) return;
    const timer = setTimeout(onClose, 1100);
    const handleKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('keydown', handleKey);
    };
  }, [visible, onClose]);

  const count = Math.max(1, Math.min(3, strikeCount || 1));

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          role="alertdialog"
          aria-live="assertive"
          aria-label={`SALAH ke-${count}`}
          onClick={onClose}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-xs p-4"
        >
          <motion.div
            initial={{ scale: 0.55, rotate: -6 }}
            animate={{ scale: 1, rotate: 0 }}
            exit={{ scale: 0.75, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 320, damping: 18 }}
            className="flex flex-col items-center gap-4 rounded-3xl border-4 border-red-400 bg-red-950/95 px-8 py-6 shadow-2xl"
          >
            <div className="flex items-center gap-4 sm:gap-6">
              {Array.from({ length: count }).map((_, i) => (
                <div
                  key={i}
                  className="font-display flex h-24 w-24 sm:h-28 sm:w-28 items-center justify-center rounded-xl border-4 border-red-500 bg-red-600 text-6xl sm:text-7xl font-black text-white shadow-lg"
                >
                  X
                </div>
              ))}
            </div>
            <div className="font-display text-2xl sm:text-3xl font-black tracking-widest text-red-200 uppercase">
              SALAH!
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
