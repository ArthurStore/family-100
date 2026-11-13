import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Plus,
  RotateCcw,
  Trash2,
  Upload,
  Volume2,
  X,
  Download,
  Play,
  ArrowUp,
  ArrowDown,
  Lock,
  Music,
  Copy,
  Check,
} from 'lucide-react';
import {
  DEFAULT_QUESTIONS,
  DEFAULT_SETTINGS,
  EXAMPLE_JSON_BANK,
} from '../data/defaultQuestions';
import { BGM_PRESETS, SOUND_SLOTS, playSound } from '../utils/soundManager';

export default function SettingsModal({
  open,
  onClose,
  questions,
  onUpdateQuestions,
  settings,
  onUpdateSettings,
  customAudio,
  onSaveAudioSlot,
  onDeleteAudioSlot,
  currentRoundIndex,
  onJumpToRound,
  onResetScoresAndStartFromOne,
  onResetTotalToLobby,
}) {
  const [activeTab, setActiveTab] = useState('questions');
  const [audioError, setAudioError] = useState('');
  const [importError, setImportError] = useState('');
  const [copiedExample, setCopiedExample] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');
  const [unlocked, setUnlocked] = useState(false);

  const exampleJsonString = JSON.stringify(EXAMPLE_JSON_BANK, null, 2);

  useEffect(() => {
    if (!open) {
      setUnlocked(false);
      setPinInput('');
      setPinError('');
      return;
    }
    if (!settings.adminPin) {
      setUnlocked(true);
    }
  }, [open, settings.adminPin]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  const handlePinSubmit = (e) => {
    e.preventDefault();
    if (pinInput === settings.adminPin) {
      setUnlocked(true);
      setPinError('');
    } else {
      setPinError('PIN Admin salah.');
    }
  };

  const handleQuestionTextChange = (qIdx, value) => {
    const next = questions.map((q, idx) => (idx === qIdx ? { ...q, question: value } : q));
    onUpdateQuestions(next);
  };

  const handleMoveQuestion = (qIdx, dir) => {
    const targetIdx = qIdx + dir;
    if (targetIdx < 0 || targetIdx >= questions.length) return;
    const next = [...questions];
    const [moved] = next.splice(qIdx, 1);
    next.splice(targetIdx, 0, moved);
    onUpdateQuestions(next);
  };

  const handleAnswerChange = (qIdx, aIdx, field, value) => {
    const next = questions.map((q, idx) => {
      if (idx !== qIdx) return q;
      const updatedAnswers = q.answers.map((ans, j) => {
        if (j !== aIdx) return ans;
        if (field === 'points') {
          return { ...ans, points: Math.max(0, Number(value) || 0) };
        }
        if (field === 'aliases') {
          return {
            ...ans,
            aliases: value
              .split(',')
              .map((k) => k.trim())
              .filter(Boolean),
          };
        }
        return { ...ans, [field]: value };
      });
      return { ...q, answers: updatedAnswers };
    });
    onUpdateQuestions(next);
  };

  const handleAddAnswer = (qIdx) => {
    const next = questions.map((q, idx) => {
      if (idx !== qIdx) return q;
      if (q.answers.length >= 8) return q;
      return {
        ...q,
        answers: [
          ...q.answers,
          {
            id: `ans-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            text: 'Jawaban baru',
            points: 10,
            aliases: ['jawaban baru'],
          },
        ],
      };
    });
    onUpdateQuestions(next);
  };

  const handleRemoveAnswer = (qIdx, aIdx) => {
    const next = questions.map((q, idx) => {
      if (idx !== qIdx) return q;
      if (q.answers.length <= 1) return q;
      return { ...q, answers: q.answers.filter((_, j) => j !== aIdx) };
    });
    onUpdateQuestions(next);
  };

  const handleAddQuestion = () => {
    const newQ = {
      id: `q-${Date.now()}`,
      question: 'Pertanyaan survei baru...',
      answers: [
        { id: `a-${Date.now()}-1`, text: 'Jawaban 1', points: 30, aliases: ['jawaban 1'] },
        { id: `a-${Date.now()}-2`, text: 'Jawaban 2', points: 25, aliases: ['jawaban 2'] },
        { id: `a-${Date.now()}-3`, text: 'Jawaban 3', points: 20, aliases: ['jawaban 3'] },
      ],
    };
    onUpdateQuestions([...questions, newQ]);
  };

  const handleDeleteQuestion = (qIdx) => {
    if (questions.length <= 1) return;
    const next = questions.filter((_, idx) => idx !== qIdx);
    onUpdateQuestions(next);
    if (currentRoundIndex >= next.length) {
      onJumpToRound(next.length - 1);
    }
  };

  const handleResetDefaultQuestions = () => {
    onUpdateQuestions(DEFAULT_QUESTIONS);
    onJumpToRound(0);
  };

  const handleAudioUpload = (slotKey, file) => {
    setAudioError('');
    if (!file) return;
    if (file.size > 12 * 1024 * 1024) {
      setAudioError(
        `File "${file.name}" terlalu besar (${(file.size / 1024 / 1024).toFixed(2)} MB). Maksimal 12 MB.`
      );
      return;
    }
    const reader = new FileReader();
    reader.onload = async () => {
      const entry = {
        name: file.name,
        size: file.size,
        dataUrl: reader.result,
      };
      const result = await onSaveAudioSlot(slotKey, entry);
      if (result && !result.ok) {
        setAudioError(result.error);
      } else if (slotKey === 'bgmCustom') {
        onUpdateSettings({ ...settings, bgmTrack: 'custom', bgmEnabled: true });
      }
    };
    reader.onerror = () => {
      setAudioError('Gagal membaca file audio.');
    };
    reader.readAsDataURL(file);
  };

  const handleResetAudioSlot = async (slotKey) => {
    setAudioError('');
    await onDeleteAudioSlot(slotKey);
    if (slotKey === 'bgmCustom' && settings.bgmTrack === 'custom') {
      onUpdateSettings({ ...settings, bgmTrack: 'upbeat' });
    }
  };

  const handleExportJson = () => {
    const payload = JSON.stringify(questions, null, 2);
    const blob = new Blob([payload], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'family100-bank-soal.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportJson = (file) => {
    setImportError('');
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result);
        // Support either an array of questions or { questions: [...] }
        const importedQuestions = Array.isArray(parsed)
          ? parsed
          : Array.isArray(parsed?.questions)
            ? parsed.questions
            : null;
        if (!importedQuestions || importedQuestions.length === 0) {
          setImportError('File JSON harus berisi array soal yang valid.');
          return;
        }
        onUpdateQuestions(importedQuestions);
        if (parsed?.settings && typeof parsed.settings === 'object') {
          onUpdateSettings({ ...settings, ...parsed.settings });
        }
      } catch {
        setImportError('Format file JSON tidak valid.');
      }
    };
    reader.readAsText(file);
  };

  const handleCopyExampleJson = async () => {
    try {
      await navigator.clipboard.writeText(exampleJsonString);
      setCopiedExample(true);
      setTimeout(() => setCopiedExample(false), 1800);
    } catch {
      // Ignore clipboard failure
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-labelledby="settings-modal-title"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-3 sm:p-4"
        >
          <motion.div
            initial={{ scale: 0.96, opacity: 0, y: 12 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.96, opacity: 0, y: 12 }}
            transition={{ duration: 0.18 }}
            onClick={(e) => e.stopPropagation()}
            className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border-2 border-amber-400/70 bg-[#FFFDF7] text-zinc-900 shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-zinc-200 bg-white px-5 py-4">
              <h2 id="settings-modal-title" className="font-display text-xl sm:text-2xl font-black text-red-900">
                Settings / Admin Panel
              </h2>
              <button
                type="button"
                onClick={onClose}
                aria-label="Tutup panel admin"
                className="flex h-11 w-11 items-center justify-center rounded-xl border border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-100"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>

            {!unlocked ? (
              <form onSubmit={handlePinSubmit} className="mx-auto my-12 w-full max-w-sm space-y-4 px-6 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-100 text-red-800">
                  <Lock className="h-7 w-7" aria-hidden="true" />
                </div>
                <h3 className="font-display text-xl font-extrabold text-zinc-900">
                  Masukkan PIN Admin
                </h3>
                <p className="text-sm text-zinc-600">
                  Panel ini dikunci agar peserta tidak melihat kunci jawaban.
                </p>
                <input
                  type="password"
                  value={pinInput}
                  onChange={(e) => setPinInput(e.target.value)}
                  placeholder="PIN Admin"
                  autoFocus
                  className="w-full rounded-xl border-2 border-zinc-300 bg-white px-4 py-3 text-center text-lg font-bold tracking-widest focus:border-red-800 focus:outline-none"
                />
                {pinError && <p className="text-sm font-bold text-red-700">{pinError}</p>}
                <button
                  type="submit"
                  className="min-h-[44px] w-full rounded-xl bg-red-800 px-4 py-2.5 text-sm font-extrabold text-white hover:bg-red-900"
                >
                  Buka Panel Admin
                </button>
              </form>
            ) : (
              <>
                {/* Tabs */}
                <div role="tablist" className="flex flex-wrap gap-2 border-b border-zinc-200 bg-zinc-50 px-5 py-3">
                  {[
                    { id: 'questions', label: `Bank Soal (${questions.length})` },
                    { id: 'teams', label: 'Clue, Tim & Reset' },
                    { id: 'audio', label: 'Audio Manager (SFX & BGM)' },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      role="tab"
                      aria-selected={activeTab === tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`min-h-[44px] rounded-xl px-4 py-2 text-sm font-bold transition-colors ${
                        activeTab === tab.id
                          ? 'bg-red-800 text-white shadow-sm'
                          : 'border border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-100'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-5">
                  {activeTab === 'questions' && (
                    <div className="space-y-5">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={handleAddQuestion}
                            className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-red-800 px-4 py-2 text-sm font-bold text-white hover:bg-red-900"
                          >
                            <Plus className="h-4 w-4" aria-hidden="true" />
                            Tambah Soal
                          </button>
                          <button
                            type="button"
                            onClick={handleResetDefaultQuestions}
                            className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold text-zinc-800 hover:bg-zinc-100"
                          >
                            <RotateCcw className="h-4 w-4" aria-hidden="true" />
                            Reset Soal Default
                          </button>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={handleExportJson}
                            className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-zinc-300 bg-white px-3.5 py-2 text-sm font-semibold text-zinc-800 hover:bg-zinc-100"
                          >
                            <Download className="h-4 w-4" aria-hidden="true" />
                            Export JSON
                          </button>
                          <label className="inline-flex min-h-[44px] cursor-pointer items-center gap-2 rounded-xl border border-zinc-300 bg-white px-3.5 py-2 text-sm font-semibold text-zinc-800 hover:bg-zinc-100">
                            <Upload className="h-4 w-4" aria-hidden="true" />
                            Import JSON
                            <input
                              type="file"
                              accept=".json,application/json"
                              className="sr-only"
                              onChange={(e) => {
                                handleImportJson(e.target.files?.[0]);
                                e.target.value = '';
                              }}
                            />
                          </label>
                        </div>
                      </div>

                      {importError && (
                        <p className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm font-medium text-red-800">
                          {importError}
                        </p>
                      )}

                      {/* Example JSON Format Box */}
                      <div className="rounded-xl border border-zinc-300 bg-zinc-900 p-4 text-zinc-100">
                        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                          <span className="text-xs font-extrabold uppercase tracking-wider text-amber-300">
                            Contoh Format JSON Bank Soal (Untuk Import)
                          </span>
                          <button
                            type="button"
                            onClick={handleCopyExampleJson}
                            className="inline-flex min-h-[34px] items-center gap-1.5 rounded-lg bg-amber-400 px-3 py-1 text-xs font-extrabold text-zinc-950 hover:bg-amber-300"
                          >
                            {copiedExample ? (
                              <>
                                <Check className="h-3.5 w-3.5" aria-hidden="true" />
                                Tersalin!
                              </>
                            ) : (
                              <>
                                <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                                Copy Contoh JSON
                              </>
                            )}
                          </button>
                        </div>
                        <pre className="max-h-40 overflow-auto rounded-lg bg-black/50 p-3 font-mono text-xs text-zinc-200">
                          {exampleJsonString}
                        </pre>
                      </div>

                      <div className="space-y-4">
                        {questions.map((q, qIdx) => (
                          <div
                            key={q.id}
                            className={`rounded-xl border-2 p-4 ${
                              qIdx === currentRoundIndex
                                ? 'border-amber-500 bg-amber-50/40'
                                : 'border-zinc-200 bg-white'
                            }`}
                          >
                            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <span className="font-display rounded-lg bg-red-800 px-2.5 py-1 text-xs font-extrabold text-amber-200">
                                  SOAL {qIdx + 1}
                                </span>
                                {qIdx === currentRoundIndex && (
                                  <span className="rounded-md bg-amber-200 px-2 py-0.5 text-xs font-bold text-amber-950">
                                    Aktif
                                  </span>
                                )}
                              </div>

                              <div className="flex flex-wrap items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => handleMoveQuestion(qIdx, -1)}
                                  disabled={qIdx === 0}
                                  aria-label={`Pindah soal ${qIdx + 1} ke atas`}
                                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-100 disabled:opacity-35"
                                >
                                  <ArrowUp className="h-4 w-4" aria-hidden="true" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleMoveQuestion(qIdx, 1)}
                                  disabled={qIdx === questions.length - 1}
                                  aria-label={`Pindah soal ${qIdx + 1} ke bawah`}
                                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-100 disabled:opacity-35"
                                >
                                  <ArrowDown className="h-4 w-4" aria-hidden="true" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    onJumpToRound(qIdx);
                                    onClose();
                                  }}
                                  className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-amber-500 bg-amber-100 px-3 py-1.5 text-xs font-bold text-amber-950 hover:bg-amber-200"
                                >
                                  <Play className="h-3.5 w-3.5" aria-hidden="true" />
                                  Mainkan
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteQuestion(qIdx)}
                                  disabled={questions.length <= 1}
                                  aria-label={`Hapus soal ${qIdx + 1}`}
                                  className="inline-flex min-h-[36px] items-center justify-center rounded-lg border border-red-200 bg-red-50 px-2.5 text-red-700 hover:bg-red-100 disabled:opacity-40"
                                >
                                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                                </button>
                              </div>
                            </div>

                            <label className="mb-3 block">
                              <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-zinc-600">
                                Pertanyaan
                              </span>
                              <input
                                type="text"
                                value={q.question}
                                onChange={(e) => handleQuestionTextChange(qIdx, e.target.value)}
                                className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-semibold text-zinc-900 focus:border-red-700 focus:outline-none"
                              />
                            </label>

                            <div className="space-y-2.5">
                              <span className="block text-xs font-bold uppercase tracking-wide text-zinc-600">
                                Jawaban, Aliases Frasa Utuh (pisahkan koma), & Poin
                              </span>
                              {q.answers.map((ans, aIdx) => (
                                <div
                                  key={ans.id}
                                  className="grid grid-cols-1 gap-2 rounded-lg border border-zinc-200 bg-zinc-50/70 p-2 sm:grid-cols-12 sm:items-center"
                                >
                                  <div className="flex items-center gap-2 sm:col-span-5">
                                    <span className="w-5 text-center text-xs font-extrabold text-zinc-500">
                                      {aIdx + 1}.
                                    </span>
                                    <input
                                      type="text"
                                      aria-label={`Jawaban ${aIdx + 1}`}
                                      value={ans.text}
                                      onChange={(e) =>
                                        handleAnswerChange(qIdx, aIdx, 'text', e.target.value)
                                      }
                                      className="w-full rounded-lg border border-zinc-300 bg-white px-2.5 py-1.5 text-sm font-semibold text-zinc-900 focus:border-red-700 focus:outline-none"
                                    />
                                  </div>

                                  <div className="sm:col-span-5">
                                    <input
                                      type="text"
                                      aria-label={`Aliases jawaban ${aIdx + 1}`}
                                      placeholder="Aliases utuh: frasa 1, frasa 2"
                                      value={(ans.aliases || ans.keywords || []).join(', ')}
                                      onChange={(e) =>
                                        handleAnswerChange(qIdx, aIdx, 'aliases', e.target.value)
                                      }
                                      className="w-full rounded-lg border border-zinc-300 bg-white px-2.5 py-1.5 text-xs text-zinc-700 focus:border-red-700 focus:outline-none"
                                    />
                                  </div>

                                  <div className="flex items-center justify-end gap-1.5 sm:col-span-2">
                                    <input
                                      type="number"
                                      min={0}
                                      max={200}
                                      aria-label={`Poin jawaban ${aIdx + 1}`}
                                      value={ans.points}
                                      onChange={(e) =>
                                        handleAnswerChange(qIdx, aIdx, 'points', e.target.value)
                                      }
                                      className="w-16 rounded-lg border border-zinc-300 bg-white px-2 py-1.5 text-center text-sm font-bold text-zinc-900 focus:border-red-700 focus:outline-none"
                                    />
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveAnswer(qIdx, aIdx)}
                                      disabled={q.answers.length <= 1}
                                      aria-label={`Hapus jawaban ${aIdx + 1}`}
                                      className="flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-500 hover:bg-red-50 hover:text-red-700 disabled:opacity-30"
                                    >
                                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                                    </button>
                                  </div>
                                </div>
                              ))}
                              {q.answers.length < 8 && (
                                <button
                                  type="button"
                                  onClick={() => handleAddAnswer(qIdx)}
                                  className="mt-1 inline-flex items-center gap-1.5 rounded-lg border border-dashed border-zinc-300 px-3 py-1.5 text-xs font-bold text-zinc-700 hover:bg-zinc-100"
                                >
                                  <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                                  Tambah Jawaban (maks. 8)
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {activeTab === 'teams' && (
                    <div className="space-y-5">
                      {/* Clue Toggle */}
                      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border-2 border-amber-300 bg-amber-50/70 p-4">
                        <div>
                          <div className="font-display text-base font-extrabold text-red-900">
                            Clue Huruf Acak (Garis Bawah)
                          </div>
                          <p className="text-sm text-zinc-700">
                            Menampilkan tombol &ldquo;Buka Clue&rdquo; pada kartu tertutup untuk menyensor huruf dengan garis bawah (contoh: <code>K _ N _ _ _ G</code>).
                          </p>
                        </div>
                        <button
                          type="button"
                          role="switch"
                          aria-checked={Boolean(settings.clueEnabled)}
                          onClick={() =>
                            onUpdateSettings({ ...settings, clueEnabled: !settings.clueEnabled })
                          }
                          className={`min-h-[44px] rounded-xl px-5 py-2 text-sm font-black transition-colors ${
                            settings.clueEnabled
                              ? 'bg-emerald-600 text-white'
                              : 'bg-zinc-300 text-zinc-800'
                          }`}
                        >
                          {settings.clueEnabled ? 'ON (Aktif)' : 'OFF (Nonaktif)'}
                        </button>
                      </div>

                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <label className="block rounded-xl border border-zinc-200 bg-white p-4">
                          <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-zinc-600">
                            Nama Tim 1
                          </span>
                          <input
                            type="text"
                            value={settings.teamAName}
                            onChange={(e) =>
                              onUpdateSettings({ ...settings, teamAName: e.target.value })
                            }
                            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-base font-bold text-zinc-900 focus:border-red-700 focus:outline-none"
                          />
                        </label>
                        <label className="block rounded-xl border border-zinc-200 bg-white p-4">
                          <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-zinc-600">
                            Nama Tim 2
                          </span>
                          <input
                            type="text"
                            value={settings.teamBName}
                            onChange={(e) =>
                              onUpdateSettings({ ...settings, teamBName: e.target.value })
                            }
                            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-base font-bold text-zinc-900 focus:border-red-700 focus:outline-none"
                          />
                        </label>
                      </div>

                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div className="rounded-xl border border-zinc-200 bg-white p-4">
                          <span className="mb-2 block text-xs font-bold uppercase tracking-wide text-zinc-600">
                            Pengali Poin Ronde
                          </span>
                          <div className="flex flex-wrap gap-2">
                            {[1, 2, 3].map((mult) => (
                              <button
                                key={mult}
                                type="button"
                                onClick={() =>
                                  onUpdateSettings({ ...settings, roundMultiplier: mult })
                                }
                                className={`min-h-[44px] rounded-xl px-4 py-2 text-sm font-extrabold ${
                                  settings.roundMultiplier === mult
                                    ? 'bg-red-800 text-amber-200'
                                    : 'border border-zinc-300 bg-zinc-50 text-zinc-800 hover:bg-zinc-100'
                                }`}
                              >
                                {mult}x Poin
                              </button>
                            ))}
                          </div>
                        </div>

                        <label className="block rounded-xl border border-zinc-200 bg-white p-4">
                          <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-zinc-600">
                            PIN Panel Admin (Opsional)
                          </span>
                          <input
                            type="text"
                            value={settings.adminPin || ''}
                            onChange={(e) =>
                              onUpdateSettings({ ...settings, adminPin: e.target.value.trim() })
                            }
                            placeholder="Kosongkan jika tanpa PIN"
                            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm font-bold text-zinc-900 focus:border-red-700 focus:outline-none"
                          />
                        </label>
                      </div>

                      {/* Two Clear Reset Buttons */}
                      <div className="space-y-3 rounded-xl border-2 border-red-200 bg-red-50/70 p-4">
                        <h3 className="font-display text-base font-extrabold text-red-900">
                          Opsi Reset Permainan
                        </h3>

                        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-red-200 bg-white p-3">
                          <div>
                            <div className="text-sm font-extrabold text-zinc-900">
                              Reset Skor & Mulai dari Soal 1
                            </div>
                            <p className="text-xs text-zinc-600">
                              Mengembalikan skor kedua tim ke 0 dan mulai dari Soal 1 tanpa menghapus bank soal atau file lagu custom.
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              onResetScoresAndStartFromOne();
                              onClose();
                            }}
                            className="min-h-[44px] shrink-0 rounded-xl bg-red-700 px-4 py-2 text-xs sm:text-sm font-bold text-white hover:bg-red-800"
                          >
                            Reset Skor & Mulai dari Soal 1
                          </button>
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-red-200 bg-white p-3">
                          <div>
                            <div className="text-sm font-extrabold text-zinc-900">
                              Reset Total ke Lobby
                            </div>
                            <p className="text-xs text-zinc-600">
                              Mereset progres pertandingan dan kembali ke layar awal Lobby untuk input nama tim baru.
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              onResetTotalToLobby();
                              onClose();
                            }}
                            className="min-h-[44px] shrink-0 rounded-xl border-2 border-red-700 bg-white px-4 py-2 text-xs sm:text-sm font-bold text-red-800 hover:bg-red-50"
                          >
                            Reset Total ke Lobby
                          </button>
                        </div>
                      </div>

                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={() => onUpdateSettings(DEFAULT_SETTINGS)}
                          className="min-h-[44px] rounded-xl border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-100"
                        >
                          Kembalikan Pengaturan Default
                        </button>
                      </div>
                    </div>
                  )}

                  {activeTab === 'audio' && (
                    <div className="space-y-6">
                      {audioError && (
                        <div
                          role="alert"
                          className="rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800"
                        >
                          {audioError}
                        </div>
                      )}

                      {/* Background Music (BGM) */}
                      <div className="space-y-3 rounded-xl border-2 border-amber-300 bg-white p-4">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div className="flex items-center gap-2">
                            <Music className="h-5 w-5 text-red-800" aria-hidden="true" />
                            <h3 className="font-display text-lg font-black text-red-900">
                              Background Music (BGM)
                            </h3>
                          </div>
                          <button
                            type="button"
                            role="switch"
                            aria-checked={Boolean(settings.bgmEnabled)}
                            onClick={() =>
                              onUpdateSettings({ ...settings, bgmEnabled: !settings.bgmEnabled })
                            }
                            className={`min-h-[42px] rounded-xl px-4 py-2 text-xs font-black ${
                              settings.bgmEnabled
                                ? 'bg-emerald-600 text-white'
                                : 'bg-zinc-200 text-zinc-800'
                            }`}
                          >
                            {settings.bgmEnabled ? 'BGM Sedang Putar' : 'BGM Mati'}
                          </button>
                        </div>

                        <label className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-zinc-50 px-3 py-2.5 text-sm font-bold text-zinc-800">
                          <span>Volume BGM ({Math.round((settings.bgmVolume ?? 0.35) * 100)}%)</span>
                          <input
                            type="range"
                            min={0}
                            max={1}
                            step={0.05}
                            value={settings.bgmVolume ?? 0.35}
                            onChange={(e) =>
                              onUpdateSettings({ ...settings, bgmVolume: Number(e.target.value) })
                            }
                            className="w-44 accent-red-800"
                          />
                        </label>

                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                          {BGM_PRESETS.map((preset) => (
                            <button
                              key={preset.id}
                              type="button"
                              onClick={() =>
                                onUpdateSettings({
                                  ...settings,
                                  bgmTrack: preset.id,
                                  bgmEnabled: true,
                                })
                              }
                              className={`min-h-[44px] rounded-xl border-2 px-3 py-2 text-xs font-extrabold transition-colors ${
                                settings.bgmTrack === preset.id
                                  ? 'border-red-800 bg-red-50 text-red-900'
                                  : 'border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50'
                              }`}
                            >
                              {preset.label}
                            </button>
                          ))}
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-dashed border-zinc-300 bg-zinc-50 p-3">
                          <div className="text-xs">
                            <div className="font-bold text-zinc-900">
                              Upload BGM Custom (.mp3 / .wav) — Tersimpan di IndexedDB
                            </div>
                            <div className="text-zinc-600">
                              {customAudio?.bgmCustom
                                ? `Aktif: ${customAudio.bgmCustom.name} (${(customAudio.bgmCustom.size / 1024).toFixed(0)} KB)`
                                : 'Belum ada lagu custom diunggah'}
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {customAudio?.bgmCustom && (
                              <>
                                <button
                                  type="button"
                                  onClick={() =>
                                    onUpdateSettings({
                                      ...settings,
                                      bgmTrack: 'custom',
                                      bgmEnabled: true,
                                    })
                                  }
                                  className={`min-h-[40px] rounded-xl px-3 py-1.5 text-xs font-bold ${
                                    settings.bgmTrack === 'custom'
                                      ? 'bg-amber-400 text-zinc-950'
                                      : 'border border-zinc-300 bg-white text-zinc-800'
                                  }`}
                                >
                                  Gunakan Lagu Ini
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleResetAudioSlot('bgmCustom')}
                                  className="min-h-[40px] rounded-xl border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-bold text-red-700"
                                >
                                  Hapus
                                </button>
                              </>
                            )}
                            <label className="inline-flex min-h-[40px] cursor-pointer items-center gap-1.5 rounded-xl bg-red-800 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-red-900">
                              <Upload className="h-4 w-4" aria-hidden="true" />
                              Upload Lagu
                              <input
                                type="file"
                                accept="audio/*"
                                className="sr-only"
                                onChange={(e) => {
                                  handleAudioUpload('bgmCustom', e.target.files?.[0]);
                                  e.target.value = '';
                                }}
                              />
                            </label>
                          </div>
                        </div>
                      </div>

                      {/* Sound Effects (SFX) */}
                      <div className="space-y-3 rounded-xl border border-zinc-200 bg-white p-4">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <h3 className="font-display text-lg font-black text-red-900">
                            Sound Effects (SFX)
                          </h3>
                          <label className="flex items-center gap-2 text-sm font-bold text-zinc-800">
                            <input
                              type="checkbox"
                              checked={settings.sfxEnabled}
                              onChange={(e) =>
                                onUpdateSettings({ ...settings, sfxEnabled: e.target.checked })
                              }
                              className="h-5 w-5 rounded accent-red-800"
                            />
                            Aktifkan SFX
                          </label>
                        </div>

                        <label className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-zinc-50 px-3 py-2.5 text-sm font-bold text-zinc-800">
                          <span>Volume SFX ({Math.round((settings.sfxVolume ?? 0.85) * 100)}%)</span>
                          <input
                            type="range"
                            min={0}
                            max={1}
                            step={0.05}
                            value={settings.sfxVolume ?? 0.85}
                            onChange={(e) =>
                              onUpdateSettings({ ...settings, sfxVolume: Number(e.target.value) })
                            }
                            className="w-44 accent-red-800"
                          />
                        </label>

                        <div className="space-y-2.5">
                          {SOUND_SLOTS.map((slot) => {
                            const custom = customAudio?.[slot.key];
                            return (
                              <div
                                key={slot.key}
                                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-zinc-200 bg-zinc-50/50 p-3"
                              >
                                <div className="min-w-[200px] flex-1">
                                  <div className="text-sm font-bold text-zinc-900">{slot.label}</div>
                                  <div className="text-xs text-zinc-600">{slot.description}</div>
                                  <div className="mt-0.5 text-xs font-semibold text-red-800">
                                    {custom
                                      ? `Custom (IndexedDB): ${custom.name} (${(custom.size / 1024).toFixed(0)} KB)`
                                      : 'Suara sintetis bawaan'}
                                  </div>
                                </div>

                                <div className="flex flex-wrap items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      playSound(slot.key, {
                                        enabled: true,
                                        volume: settings.sfxVolume,
                                        customAudio,
                                      })
                                    }
                                    className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl border border-zinc-300 bg-white px-3 py-1.5 text-xs font-bold text-zinc-800 hover:bg-zinc-100"
                                  >
                                    <Volume2 className="h-4 w-4" aria-hidden="true" />
                                    Tes
                                  </button>

                                  <label className="inline-flex min-h-[40px] cursor-pointer items-center gap-1.5 rounded-xl bg-red-800 px-3 py-1.5 text-xs font-bold text-white hover:bg-red-900">
                                    <Upload className="h-4 w-4" aria-hidden="true" />
                                    Upload
                                    <input
                                      type="file"
                                      accept="audio/*"
                                      className="sr-only"
                                      onChange={(e) => {
                                        handleAudioUpload(slot.key, e.target.files?.[0]);
                                        e.target.value = '';
                                      }}
                                    />
                                  </label>

                                  {custom && (
                                    <button
                                      type="button"
                                      onClick={() => handleResetAudioSlot(slot.key)}
                                      className="inline-flex min-h-[40px] items-center gap-1 rounded-xl border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-bold text-red-700 hover:bg-red-100"
                                    >
                                      <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                                      Default
                                    </button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
