import { motion } from 'framer-motion';
import { Lightbulb } from 'lucide-react';

export default function AnswerCard({
  index,
  answer,
  revealed,
  bonusRevealed,
  multiplier = 1,
  clueEnabled,
  clueText,
  onShowClue,
  onReveal,
  compact = false,
}) {
  const isOpen = revealed || bonusRevealed;
  const displayPoints = answer.points * multiplier;

  return (
    <div className={`perspective-1200 w-full ${compact ? 'h-14 sm:h-16' : 'h-16 sm:h-[4.35rem]'}`}>
      <motion.div
        className="preserve-3d relative h-full w-full"
        initial={false}
        animate={{ rotateX: isOpen ? 180 : 0 }}
        transition={{ duration: 0.52, type: 'spring', stiffness: 195, damping: 20 }}
      >
        {/* Front (Hidden) */}
        <div className="backface-hidden absolute inset-0 flex items-center justify-between gap-2 rounded-xl border-2 border-amber-400/85 bg-gradient-to-b from-zinc-800 to-zinc-950 px-3 shadow-md">
          <button
            type="button"
            onClick={onReveal}
            disabled={isOpen}
            aria-label={`Buka jawaban nomor ${index + 1}`}
            className="flex min-w-0 flex-1 items-center gap-2.5 text-left py-1 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
          >
            <span className="font-display flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-lg border border-amber-400/70 bg-amber-500/15 text-lg sm:text-xl font-black text-amber-300">
              {index + 1}
            </span>
            {clueText ? (
              <span className="truncate font-mono text-xs sm:text-base font-extrabold tracking-widest text-amber-300">
                {clueText}
              </span>
            ) : (
              <span
                className="h-2.5 w-28 sm:w-44 rounded-full bg-zinc-700/75"
                aria-hidden="true"
              />
            )}
          </button>

          {clueEnabled && !clueText && (
            <button
              type="button"
              onClick={onShowClue}
              className="inline-flex min-h-[36px] shrink-0 items-center gap-1 rounded-lg border border-amber-400/60 bg-amber-400/15 px-2.5 py-1 text-xs font-extrabold text-amber-200 hover:bg-amber-400/30"
            >
              <Lightbulb className="h-3.5 w-3.5" aria-hidden="true" />
              Buka Clue
            </button>
          )}
        </div>

        {/* Back (Revealed) */}
        <div
          style={{ transform: 'rotateX(180deg)' }}
          className={`backface-hidden absolute inset-0 flex items-center justify-between gap-2.5 rounded-xl border-2 px-3 sm:px-4 shadow-lg ${
            bonusRevealed && !revealed
              ? 'border-zinc-400 bg-zinc-100 text-zinc-800'
              : 'border-amber-400 bg-[#FFFDF7] text-zinc-900'
          }`}
        >
          <div className="flex min-w-0 items-center gap-2.5">
            <span
              className={`font-display flex h-8 w-8 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-lg text-base sm:text-lg font-black ${
                bonusRevealed && !revealed
                  ? 'bg-zinc-300 text-zinc-800'
                  : 'bg-red-800 text-amber-200'
              }`}
            >
              {index + 1}
            </span>
            <span className="truncate text-sm sm:text-lg font-extrabold leading-tight">
              {answer.text}
            </span>
          </div>

          <div
            className={`font-display flex h-9 sm:h-11 min-w-[3rem] sm:min-w-[3.75rem] shrink-0 items-center justify-center rounded-lg px-2.5 text-lg sm:text-2xl font-black ${
              bonusRevealed && !revealed
                ? 'bg-zinc-300 text-zinc-700'
                : 'bg-amber-400 text-zinc-950 shadow-inner'
            }`}
          >
            {displayPoints}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
