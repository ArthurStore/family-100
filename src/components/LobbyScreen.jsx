import { useState } from 'react';
import { motion } from 'framer-motion';
import { Play, Users, Zap, Settings } from 'lucide-react';

export default function LobbyScreen({
  settings,
  questionCount,
  onStartGame,
  onOpenAdmin,
}) {
  const [teamAName, setTeamAName] = useState(settings.teamAName || 'Tim 1');
  const [teamBName, setTeamBName] = useState(settings.teamBName || 'Tim 2');
  const [startMode, setStartMode] = useState('faceoff');

  const handleSubmit = (e) => {
    e.preventDefault();
    onStartGame({
      teamAName: teamAName.trim() || 'Tim 1',
      teamBName: teamBName.trim() || 'Tim 2',
      startMode,
    });
  };

  return (
    <motion.section
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-auto max-w-2xl rounded-3xl border-4 border-amber-400 bg-[#FFFDF7] p-6 sm:p-8 text-zinc-900 shadow-2xl"
    >
      <div className="mb-5 flex items-center justify-between border-b-2 border-zinc-200 pb-4">
        <div className="flex items-center gap-2">
          <span className="h-3.5 w-3.5 rounded-full bg-red-500" aria-hidden="true" />
          <span className="h-3.5 w-3.5 rounded-full bg-amber-400" aria-hidden="true" />
          <span className="h-3.5 w-3.5 rounded-full bg-emerald-500" aria-hidden="true" />
          <span className="ml-2 text-xs font-extrabold uppercase tracking-wider text-zinc-500">
            Setup Permainan • {questionCount} Soal
          </span>
        </div>
        <button
          type="button"
          onClick={onOpenAdmin}
          className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl border border-zinc-300 bg-zinc-100 px-3 py-1.5 text-xs font-bold text-zinc-800 hover:bg-zinc-200"
        >
          <Settings className="h-4 w-4" aria-hidden="true" />
          Settings / Admin
        </button>
      </div>

      <div className="mb-6 text-center">
        <h2 className="font-display text-3xl sm:text-4xl font-black text-red-900">
          FAMILY 100
        </h2>
        <p className="mt-1.5 text-sm sm:text-base font-medium text-zinc-600">
          Masukkan nama tim dan pilih mode untuk memulai babak pertama.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1.5 flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wide text-red-900">
              <Users className="h-4 w-4" aria-hidden="true" />
              Nama Tim 1
            </span>
            <input
              type="text"
              value={teamAName}
              onChange={(e) => setTeamAName(e.target.value)}
              placeholder="Tim 1"
              className="w-full rounded-xl border-2 border-zinc-300 bg-white px-4 py-3 text-base font-bold text-zinc-900 focus:border-red-800 focus:outline-none"
            />
          </label>

          <label className="block">
            <span className="mb-1.5 flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wide text-red-900">
              <Users className="h-4 w-4" aria-hidden="true" />
              Nama Tim 2
            </span>
            <input
              type="text"
              value={teamBName}
              onChange={(e) => setTeamBName(e.target.value)}
              placeholder="Tim 2"
              className="w-full rounded-xl border-2 border-zinc-300 bg-white px-4 py-3 text-base font-bold text-zinc-900 focus:border-red-800 focus:outline-none"
            />
          </label>
        </div>

        <div>
          <span className="mb-2 flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wide text-red-900">
            <Zap className="h-4 w-4" aria-hidden="true" />
            Mode Babak Awal
          </span>
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
            {[
              {
                id: 'faceoff',
                title: 'Face-Off',
                desc: 'Adu peringkat jawaban untuk menentukan tim main',
              },
              {
                id: 'teamA',
                title: `${teamAName.trim() || 'Tim 1'} Langsung Main`,
                desc: 'Mulai langsung dengan giliran Tim 1',
              },
              {
                id: 'teamB',
                title: `${teamBName.trim() || 'Tim 2'} Langsung Main`,
                desc: 'Mulai langsung dengan giliran Tim 2',
              },
            ].map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setStartMode(opt.id)}
                className={`min-h-[68px] rounded-xl border-2 p-3 text-left transition-colors ${
                  startMode === opt.id
                    ? 'border-red-800 bg-red-50 text-red-950'
                    : 'border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50'
                }`}
              >
                <div className="text-sm font-extrabold">{opt.title}</div>
                <div className="mt-0.5 text-xs text-zinc-600">{opt.desc}</div>
              </button>
            ))}
          </div>
        </div>

        <button
          type="submit"
          className="inline-flex min-h-[52px] w-full items-center justify-center gap-2 rounded-2xl bg-red-800 px-6 py-3 text-lg font-black text-amber-200 shadow-lg transition-colors hover:bg-red-900"
        >
          <Play className="h-5 w-5 fill-current" aria-hidden="true" />
          Mulai Permainan
        </button>
      </form>
    </motion.section>
  );
}
