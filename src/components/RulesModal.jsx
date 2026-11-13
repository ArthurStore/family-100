import { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { GAME_RULES } from '../data/defaultQuestions';

export default function RulesModal({ open, onClose }) {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-labelledby="rules-modal-title"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 10 }}
            transition={{ duration: 0.18 }}
            onClick={(e) => e.stopPropagation()}
            className="max-h-[88vh] w-full max-w-2xl overflow-y-auto rounded-2xl border-2 border-amber-400/70 bg-[#FFFDF7] p-6 text-zinc-900 shadow-2xl"
          >
            <div className="mb-5 flex items-center justify-between border-b border-zinc-200 pb-3">
              <h2 id="rules-modal-title" className="font-display text-2xl font-black text-red-900">
                Peraturan Permainan FAMILY 100
              </h2>
              <button
                type="button"
                onClick={onClose}
                aria-label="Tutup peraturan"
                className="flex h-11 w-11 items-center justify-center rounded-xl border border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-100"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>

            <div className="space-y-5">
              {GAME_RULES.map((section) => (
                <section key={section.title} className="rounded-xl border border-amber-200 bg-amber-50/60 p-4">
                  <h3 className="font-display mb-2 text-base font-extrabold text-red-900">
                    {section.title}
                  </h3>
                  <ul className="list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-zinc-800">
                    {section.items.map((item, idx) => (
                      <li key={idx}>{item}</li>
                    ))}
                  </ul>
                </section>
              ))}

              <section className="rounded-xl border border-zinc-200 bg-zinc-100 p-4">
                <h3 className="font-display mb-2 text-base font-extrabold text-zinc-900">
                  Pintasan Keyboard (Host)
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-zinc-700">
                  <div>
                    <kbd className="rounded border border-zinc-300 bg-white px-2 py-0.5 font-mono text-xs font-bold">
                      Enter
                    </kbd>{' '}
                    Submit Jawaban dari Kolom Ketik
                  </div>
                  <div>
                    <kbd className="rounded border border-zinc-300 bg-white px-2 py-0.5 font-mono text-xs font-bold">
                      X
                    </kbd>{' '}
                    Tandai SALAH [X]
                  </div>
                  <div>
                    <kbd className="rounded border border-zinc-300 bg-white px-2 py-0.5 font-mono text-xs font-bold">
                      1 - 8
                    </kbd>{' '}
                    Buka Kartu Jawaban Manual
                  </div>
                  <div>
                    <kbd className="rounded border border-zinc-300 bg-white px-2 py-0.5 font-mono text-xs font-bold">
                      Klik Kotak Tim
                    </kbd>{' '}
                    Pilih / Ganti Tim Aktif
                  </div>
                </div>
              </section>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
