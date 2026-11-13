import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import confetti from 'canvas-confetti';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BookOpen,
  Settings,
  Volume2,
  VolumeX,
  RotateCcw,
  ArrowRight,
  Eye,
  Trophy,
  CheckCircle2,
  XCircle,
  Music,
  Send,
} from 'lucide-react';
import AnswerCard from './components/AnswerCard';
import StrikeOverlay from './components/StrikeOverlay';
import RulesModal from './components/RulesModal';
import SettingsModal from './components/SettingsModal';
import LobbyScreen from './components/LobbyScreen';
import {
  loadQuestions,
  saveQuestions,
  loadSettings,
  saveSettings,
  loadGameState,
  saveGameState,
  clearGameState,
} from './utils/storage';
import {
  loadAllCustomAudio,
  saveCustomAudioSlot,
  deleteCustomAudioSlot,
} from './utils/audioDb';
import { playSound, startBgm, stopBgm, setBgmVolume } from './utils/soundManager';
import { findBestAnswerMatch, generateMaskedClue } from './utils/matching';

function fireSideConfetti() {
  const colors = ['#F59E0B', '#FBBF24', '#DC2626', '#FFFDF7'];
  confetti({
    particleCount: 40,
    angle: 60,
    spread: 55,
    origin: { x: 0, y: 0.65 },
    colors,
  });
  confetti({
    particleCount: 40,
    angle: 120,
    spread: 55,
    origin: { x: 1, y: 0.65 },
    colors,
  });
}

function fireVictoryConfetti() {
  const colors = ['#F59E0B', '#FBBF24', '#DC2626', '#FFFDF7'];
  confetti({
    particleCount: 110,
    spread: 90,
    origin: { y: 0.55 },
    colors,
  });
  setTimeout(() => fireSideConfetti(), 260);
}

export default function App() {
  const [questions, setQuestions] = useState(() => loadQuestions());
  const [settings, setSettings] = useState(() => loadSettings());
  const [customAudio, setCustomAudio] = useState({});

  const initialSaved = useMemo(() => loadGameState(), []);

  const [roundIndex, setRoundIndex] = useState(() =>
    initialSaved?.roundIndex !== undefined && initialSaved.roundIndex < questions.length
      ? initialSaved.roundIndex
      : 0
  );
  const [teamAScore, setTeamAScore] = useState(() => initialSaved?.teamAScore ?? 0);
  const [teamBScore, setTeamBScore] = useState(() => initialSaved?.teamBScore ?? 0);
  const [roundPot, setRoundPot] = useState(() => initialSaved?.roundPot ?? 0);
  const [revealedIds, setRevealedIds] = useState(() => initialSaved?.revealedIds ?? []);
  const [bonusRevealedIds, setBonusRevealedIds] = useState(
    () => initialSaved?.bonusRevealedIds ?? []
  );
  const [cluesById, setCluesById] = useState(() => initialSaved?.cluesById ?? {});

  // Separate strike counters per team (0-3) so they never mix!
  const [strikesTeam1, setStrikesTeam1] = useState(() => initialSaved?.strikesTeam1 ?? 0);
  const [strikesTeam2, setStrikesTeam2] = useState(() => initialSaved?.strikesTeam2 ?? 0);

  // phase: 'lobby' | 'faceoff' | 'faceoff_choice' | 'playing' | 'steal' | 'round_end' | 'game_over'
  const [phase, setPhase] = useState(() => initialSaved?.phase ?? 'lobby');
  const [activeTeam, setActiveTeam] = useState(() => initialSaved?.activeTeam ?? 'A');
  const [faceoffResults, setFaceoffResults] = useState(
    () => initialSaved?.faceoffResults ?? { A: null, B: null }
  );
  const [faceoffChoiceTeam, setFaceoffChoiceTeam] = useState(
    () => initialSaved?.faceoffChoiceTeam ?? null
  );
  const [roundWinner, setRoundWinner] = useState(() => initialSaved?.roundWinner ?? null);

  const [strikeOverlay, setStrikeOverlay] = useState({ visible: false, count: 1 });
  const [guessInput, setGuessInput] = useState('');
  const [feedbackMsg, setFeedbackMsg] = useState('');
  const [rulesOpen, setRulesOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const guessInputRef = useRef(null);

  const currentQuestion = questions[roundIndex] || questions[0];
  const multiplier = settings.roundMultiplier || 1;
  const maxStrikes = settings.maxStrikes || 3;

  // Active team's strike count
  const activeTeamStrikes = activeTeam === 'B' ? strikesTeam2 : strikesTeam1;

  // Load custom audio from IndexedDB on mount
  useEffect(() => {
    loadAllCustomAudio().then((data) => {
      if (data && Object.keys(data).length > 0) {
        setCustomAudio(data);
      }
    });
  }, []);

  // Persist game state to localStorage
  useEffect(() => {
    saveGameState({
      roundIndex,
      teamAScore,
      teamBScore,
      roundPot,
      revealedIds,
      bonusRevealedIds,
      cluesById,
      strikesTeam1,
      strikesTeam2,
      phase,
      activeTeam,
      faceoffResults,
      faceoffChoiceTeam,
      roundWinner,
    });
  }, [
    roundIndex,
    teamAScore,
    teamBScore,
    roundPot,
    revealedIds,
    bonusRevealedIds,
    cluesById,
    strikesTeam1,
    strikesTeam2,
    phase,
    activeTeam,
    faceoffResults,
    faceoffChoiceTeam,
    roundWinner,
  ]);

  // Sync BGM playback
  useEffect(() => {
    if (settings.bgmEnabled) {
      startBgm({
        enabled: true,
        track: settings.bgmTrack,
        volume: settings.bgmVolume,
        customAudio,
      });
    } else {
      stopBgm();
    }
    return () => stopBgm();
  }, [settings.bgmEnabled, settings.bgmTrack, customAudio]);

  useEffect(() => {
    setBgmVolume(settings.bgmVolume ?? 0.35);
  }, [settings.bgmVolume]);

  const triggerSound = useCallback(
    (type) => {
      playSound(type, {
        enabled: settings.sfxEnabled,
        volume: settings.sfxVolume,
        customAudio,
      });
    },
    [settings.sfxEnabled, settings.sfxVolume, customAudio]
  );

  const handleUpdateQuestions = (nextQuestions) => {
    setQuestions(nextQuestions);
    saveQuestions(nextQuestions);
  };

  const handleUpdateSettings = (nextSettings) => {
    setSettings(nextSettings);
    saveSettings(nextSettings);
  };

  const handleSaveAudioSlot = async (slotKey, entry) => {
    const res = await saveCustomAudioSlot(slotKey, entry);
    if (res.ok) {
      setCustomAudio((prev) => ({ ...prev, [slotKey]: entry }));
    }
    return res;
  };

  const handleDeleteAudioSlot = async (slotKey) => {
    await deleteCustomAudioSlot(slotKey);
    setCustomAudio((prev) => {
      const next = { ...prev };
      delete next[slotKey];
      return next;
    });
  };

  const awardRoundPot = useCallback(
    (winnerTeam, potAmount, { celebrate = true } = {}) => {
      if (winnerTeam === 'A') {
        setTeamAScore((s) => s + potAmount);
      } else if (winnerTeam === 'B') {
        setTeamBScore((s) => s + potAmount);
      }
      setRoundPot(0);
      setRoundWinner(winnerTeam);
      setPhase('round_end');
      if (celebrate) {
        triggerSound('roundWin');
        fireSideConfetti();
      }
    },
    [triggerSound]
  );

  const handleSelectTeam = (team) => {
    if (phase === 'round_end' || phase === 'game_over' || phase === 'lobby') return;
    setActiveTeam(team);
    const name = team === 'A' ? settings.teamAName : settings.teamBName;
    setFeedbackMsg(`Giliran aktif dipindahkan ke ${name}.`);
    setTimeout(() => guessInputRef.current?.focus(), 40);
  };

  const handleStartTeamPlay = (team) => {
    setActiveTeam(team);
    setPhase('playing');
    setFaceoffChoiceTeam(null);
    const teamName = team === 'A' ? settings.teamAName : settings.teamBName;
    setFeedbackMsg(`Giliran ${teamName} menebak sisa jawaban di papan.`);
    setTimeout(() => guessInputRef.current?.focus(), 40);
  };

  const handleRevealAnswer = useCallback(
    (answer) => {
      if (!answer) return;
      if (revealedIds.includes(answer.id) || bonusRevealedIds.includes(answer.id)) return;

      if (phase === 'round_end') {
        setBonusRevealedIds((prev) => [...prev, answer.id]);
        triggerSound('correct');
        fireSideConfetti();
        return;
      }

      const gained = answer.points * multiplier;
      const newPot = roundPot + gained;
      const nextRevealed = [...revealedIds, answer.id];

      setRevealedIds(nextRevealed);
      setRoundPot(newPot);
      triggerSound('correct');
      fireSideConfetti();

      if (phase === 'steal') {
        const stealingTeam = activeTeam === 'A' ? 'B' : 'A';
        const stealingName = stealingTeam === 'A' ? settings.teamAName : settings.teamBName;
        setFeedbackMsg(`STEAL BERHASIL! ${stealingName} merebut ${newPot} poin!`);
        awardRoundPot(stealingTeam, newPot, { celebrate: true });
        return;
      }

      if (
        phase === 'playing' &&
        activeTeam &&
        nextRevealed.length >= currentQuestion.answers.length
      ) {
        const activeName = activeTeam === 'A' ? settings.teamAName : settings.teamBName;
        setFeedbackMsg(`Semua jawaban terbuka! ${activeName} meraih ${newPot} poin.`);
        awardRoundPot(activeTeam, newPot, { celebrate: true });
      }
    },
    [
      revealedIds,
      bonusRevealedIds,
      phase,
      multiplier,
      roundPot,
      triggerSound,
      activeTeam,
      settings.teamAName,
      settings.teamBName,
      currentQuestion.answers.length,
      awardRoundPot,
    ]
  );

  // Per-team strike handler: only increments the active team's own counter (0-3)
  const handleStrike = useCallback(() => {
    if (phase === 'round_end' || phase === 'game_over' || phase === 'lobby') return;

    triggerSound('wrong');

    if (phase === 'steal') {
      const originalName = activeTeam === 'A' ? settings.teamAName : settings.teamBName;
      setStrikeOverlay({ visible: true, count: 1 });
      setFeedbackMsg(`SALAH! Steal gagal, ${originalName} mempertahankan ${roundPot} poin.`);
      awardRoundPot(activeTeam, roundPot, { celebrate: false });
      return;
    }

    const currentStrikes = activeTeam === 'B' ? strikesTeam2 : strikesTeam1;
    const nextStrikes = Math.min(maxStrikes, currentStrikes + 1);

    if (activeTeam === 'B') {
      setStrikesTeam2(nextStrikes);
    } else {
      setStrikesTeam1(nextStrikes);
    }

    setStrikeOverlay({ visible: true, count: nextStrikes });

    const teamLabel = activeTeam === 'B' ? settings.teamBName : settings.teamAName;

    if (phase === 'playing' && nextStrikes >= maxStrikes) {
      const stealingTeam = activeTeam === 'A' ? 'B' : 'A';
      const stealingName = stealingTeam === 'A' ? settings.teamAName : settings.teamBName;
      setPhase('steal');
      setFeedbackMsg(
        `${teamLabel} 3x SALAH! Mode Steal aktif: ${stealingName} punya 1 kesempatan merebut ${roundPot} poin!`
      );
    } else {
      setFeedbackMsg(`${teamLabel} SALAH! (${nextStrikes}/${maxStrikes})`);
    }
  }, [
    phase,
    triggerSound,
    activeTeam,
    settings.teamAName,
    settings.teamBName,
    roundPot,
    awardRoundPot,
    strikesTeam1,
    strikesTeam2,
    maxStrikes,
  ]);

  const handleShowClue = (answer) => {
    if (cluesById[answer.id]) return;
    setCluesById((prev) => ({
      ...prev,
      [answer.id]: generateMaskedClue(answer.text),
    }));
  };

  const setupRound = useCallback((idx, startMode = 'faceoff') => {
    setRoundIndex(idx);
    setRoundPot(0);
    setRevealedIds([]);
    setBonusRevealedIds([]);
    setCluesById({});
    setStrikesTeam1(0);
    setStrikesTeam2(0);
    setFaceoffResults({ A: null, B: null });
    setFaceoffChoiceTeam(null);
    setRoundWinner(null);
    setGuessInput('');

    if (startMode === 'teamA') {
      setActiveTeam('A');
      setPhase('playing');
      setFeedbackMsg('');
    } else if (startMode === 'teamB') {
      setActiveTeam('B');
      setPhase('playing');
      setFeedbackMsg('');
    } else {
      setActiveTeam('A');
      setPhase('faceoff');
      setFeedbackMsg('Babak Face-Off: Klik Kotak Tim 1 / Tim 2 untuk memilih penjawab.');
    }
  }, []);

  const handleStartFromLobby = ({ teamAName, teamBName, startMode }) => {
    handleUpdateSettings({ ...settings, teamAName, teamBName });
    setTeamAScore(0);
    setTeamBScore(0);
    setupRound(0, startMode);
  };

  const handleNextRound = () => {
    if (roundIndex + 1 < questions.length) {
      setupRound(roundIndex + 1, 'faceoff');
    } else {
      setPhase('game_over');
      triggerSound('victory');
      fireVictoryConfetti();
    }
  };

  const handleResetScoresAndStartFromOne = () => {
    clearGameState();
    setTeamAScore(0);
    setTeamBScore(0);
    setupRound(0, 'faceoff');
  };

  const handleResetTotalToLobby = () => {
    clearGameState();
    setTeamAScore(0);
    setTeamBScore(0);
    setupRound(0, 'faceoff');
    setPhase('lobby');
  };

  const handleRevealRemaining = () => {
    const remaining = currentQuestion.answers
      .filter((a) => !revealedIds.includes(a.id) && !bonusRevealedIds.includes(a.id))
      .map((a) => a.id);
    if (remaining.length === 0) return;
    setBonusRevealedIds((prev) => [...prev, ...remaining]);
    triggerSound('correct');
    fireSideConfetti();
  };

  const handleClaimPotToActiveTeam = () => {
    const targetTeam = phase === 'steal' ? (activeTeam === 'A' ? 'B' : 'A') : activeTeam || 'A';
    const targetName = targetTeam === 'A' ? settings.teamAName : settings.teamBName;
    setFeedbackMsg(`Pot ${roundPot} poin diberikan ke ${targetName}!`);
    awardRoundPot(targetTeam, roundPot, { celebrate: true });
  };

  const handleGuessSubmit = (e) => {
    e.preventDefault();
    const rawGuess = guessInput.trim();
    if (!rawGuess) return;
    setGuessInput('');

    const match = findBestAnswerMatch(rawGuess, currentQuestion.answers, [
      ...revealedIds,
      ...bonusRevealedIds,
    ]);

    if (phase === 'faceoff') {
      const currentFaceoffTeam = activeTeam || 'A';
      const currentTeamName =
        currentFaceoffTeam === 'A' ? settings.teamAName : settings.teamBName;
      const otherTeam = currentFaceoffTeam === 'A' ? 'B' : 'A';
      const otherTeamName = otherTeam === 'A' ? settings.teamAName : settings.teamBName;

      if (match) {
        handleRevealAnswer(match.answer);
        const updatedResults = {
          ...faceoffResults,
          [currentFaceoffTeam]: { rankIndex: match.rankIndex, text: match.answer.text },
        };
        setFaceoffResults(updatedResults);

        if (match.rankIndex === 0) {
          setFaceoffChoiceTeam(currentFaceoffTeam);
          setPhase('faceoff_choice');
          setFeedbackMsg(
            `Jawaban #1 TERATAS! ${currentTeamName} berhak memilih Main Sendiri atau Lempar.`
          );
          return;
        }

        const otherResult = updatedResults[otherTeam];
        if (!otherResult) {
          setActiveTeam(otherTeam);
          setFeedbackMsg(
            `${currentTeamName} membuka peringkat #${match.rankIndex + 1}! Giliran ${otherTeamName} menjawab.`
          );
          return;
        }

        if (otherResult === 'miss' || match.rankIndex < otherResult.rankIndex) {
          setFaceoffChoiceTeam(currentFaceoffTeam);
          setPhase('faceoff_choice');
          setFeedbackMsg(
            `${currentTeamName} unggul peringkat! Pilih Main Sendiri atau Lempar ke Lawan.`
          );
        } else {
          setFaceoffChoiceTeam(otherTeam);
          setPhase('faceoff_choice');
          setFeedbackMsg(
            `${otherTeamName} unggul peringkat! Pilih Main Sendiri atau Lempar ke Lawan.`
          );
        }
      } else {
        // Increment only currentFaceoffTeam's own strike counter
        const currentStrikes = currentFaceoffTeam === 'B' ? strikesTeam2 : strikesTeam1;
        const nextStrikes = Math.min(maxStrikes, currentStrikes + 1);
        if (currentFaceoffTeam === 'B') {
          setStrikesTeam2(nextStrikes);
        } else {
          setStrikesTeam1(nextStrikes);
        }
        triggerSound('wrong');
        setStrikeOverlay({ visible: true, count: nextStrikes });

        const updatedResults = { ...faceoffResults, [currentFaceoffTeam]: 'miss' };
        setFaceoffResults(updatedResults);

        const otherResult = updatedResults[otherTeam];
        if (!otherResult) {
          setActiveTeam(otherTeam);
          setFeedbackMsg(
            `${currentTeamName} SALAH (${nextStrikes}/${maxStrikes})! Giliran ${otherTeamName} menjawab.`
          );
        } else if (otherResult !== 'miss') {
          setFaceoffChoiceTeam(otherTeam);
          setPhase('faceoff_choice');
          setFeedbackMsg(
            `${otherTeamName} menang Face-Off! Pilih Main Sendiri atau Lempar ke Lawan.`
          );
        } else {
          setFaceoffResults({ A: null, B: null });
          setActiveTeam('A');
          setFeedbackMsg('Kedua tim belum tepat. Silakan coba jawab lagi!');
        }
      }
      return;
    }

    // Playing or Steal phase
    if (match) {
      setFeedbackMsg(`BENAR! "${match.answer.text}" (+${match.answer.points * multiplier} poin)`);
      handleRevealAnswer(match.answer);
    } else {
      handleStrike();
    }
  };

  // Host keyboard shortcuts
  useEffect(() => {
    const onKeyDown = (e) => {
      if (rulesOpen || settingsOpen || phase === 'lobby') return;
      const tag = document.activeElement?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      const key = e.key.toLowerCase();
      if (key === 'x') {
        handleStrike();
      } else if (/^[1-8]$/.test(key)) {
        const idx = Number(key) - 1;
        const ans = currentQuestion?.answers?.[idx];
        if (ans) handleRevealAnswer(ans);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [rulesOpen, settingsOpen, phase, handleStrike, currentQuestion, handleRevealAnswer]);

  const stealingTeam = activeTeam === 'A' ? 'B' : 'A';
  const stealingTeamName = stealingTeam === 'A' ? settings.teamAName : settings.teamBName;
  const activeTeamName = activeTeam === 'A' ? settings.teamAName : settings.teamBName;
  const displayedActiveTeamName = phase === 'steal' ? stealingTeamName : activeTeamName;
  const roundWinnerName =
    roundWinner === 'A' ? settings.teamAName : roundWinner === 'B' ? settings.teamBName : '';
  const choiceTeamName =
    faceoffChoiceTeam === 'A' ? settings.teamAName : settings.teamBName;
  const opponentOfChoice = faceoffChoiceTeam === 'A' ? 'B' : 'A';
  const opponentOfChoiceName =
    opponentOfChoice === 'A' ? settings.teamAName : settings.teamBName;

  const unrevealedCount = currentQuestion.answers.filter(
    (a) => !revealedIds.includes(a.id) && !bonusRevealedIds.includes(a.id)
  ).length;

  const isTeamAActive =
    (phase === 'faceoff' && activeTeam === 'A') ||
    (phase === 'playing' && activeTeam === 'A') ||
    (phase === 'steal' && stealingTeam === 'A');
  const isTeamBActive =
    (phase === 'faceoff' && activeTeam === 'B') ||
    (phase === 'playing' && activeTeam === 'B') ||
    (phase === 'steal' && stealingTeam === 'B');

  // Strikes shown in [X] [X] [X] belong strictly to the currently active team
  const shownStrikes = phase === 'steal' ? 0 : activeTeamStrikes;

  return (
    <div className="min-h-screen lg:h-screen lg:overflow-hidden flex flex-col">
      {/* Compact Top Header */}
      <header className="shrink-0 border-b border-amber-400/25 bg-black/40 px-4 py-2">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="font-display flex h-9 w-9 items-center justify-center rounded-lg border-2 border-amber-400 bg-red-800 text-sm font-black text-amber-300 shadow">
              100
            </div>
            <div>
              <h1 className="font-display text-lg sm:text-xl font-black tracking-tight text-amber-300 leading-none">
                FAMILY 100
              </h1>
              <p className="text-[11px] font-semibold text-amber-100/80">
                {phase === 'lobby'
                  ? 'Setup Permainan'
                  : `Soal ${roundIndex + 1} dari ${questions.length}${
                      multiplier > 1 ? ` • Pengali ${multiplier}x` : ''
                    }`}
              </p>
            </div>
          </div>

          <nav aria-label="Kontrol utama" className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            <button
              type="button"
              onClick={() =>
                handleUpdateSettings({ ...settings, bgmEnabled: !settings.bgmEnabled })
              }
              className={`inline-flex min-h-[38px] items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-bold ${
                settings.bgmEnabled
                  ? 'border-amber-400 bg-amber-400/20 text-amber-200'
                  : 'border-amber-400/30 bg-black/30 text-amber-100/80 hover:bg-black/50'
              }`}
            >
              <Music className="h-3.5 w-3.5" aria-hidden="true" />
              <span>{settings.bgmEnabled ? 'BGM On' : 'BGM Off'}</span>
            </button>

            <button
              type="button"
              onClick={() =>
                handleUpdateSettings({ ...settings, sfxEnabled: !settings.sfxEnabled })
              }
              className="inline-flex min-h-[38px] items-center gap-1.5 rounded-xl border border-amber-400/30 bg-black/30 px-3 py-1.5 text-xs font-bold text-amber-100 hover:bg-black/50"
            >
              {settings.sfxEnabled ? (
                <Volume2 className="h-3.5 w-3.5 text-amber-300" aria-hidden="true" />
              ) : (
                <VolumeX className="h-3.5 w-3.5 text-red-300" aria-hidden="true" />
              )}
              <span>{settings.sfxEnabled ? 'SFX On' : 'SFX Off'}</span>
            </button>

            <button
              type="button"
              onClick={() => setRulesOpen(true)}
              className="inline-flex min-h-[38px] items-center gap-1.5 rounded-xl border border-amber-400/30 bg-black/30 px-3 py-1.5 text-xs font-bold text-amber-100 hover:bg-black/50"
            >
              <BookOpen className="h-3.5 w-3.5 text-amber-300" aria-hidden="true" />
              Peraturan
            </button>

            <button
              type="button"
              onClick={() => setSettingsOpen(true)}
              className="inline-flex min-h-[38px] items-center gap-1.5 rounded-xl bg-amber-400 px-3.5 py-1.5 text-xs font-extrabold text-zinc-950 shadow-sm hover:bg-amber-300"
            >
              <Settings className="h-3.5 w-3.5" aria-hidden="true" />
              Settings / Admin
            </button>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto flex w-full max-w-7xl flex-1 min-h-0 flex-col px-4 py-3">
        {phase === 'lobby' ? (
          <div className="my-auto">
            <LobbyScreen
              settings={settings}
              questionCount={questions.length}
              onStartGame={handleStartFromLobby}
              onOpenAdmin={() => setSettingsOpen(true)}
            />
          </div>
        ) : phase === 'game_over' ? (
          <motion.section
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="board-frame m-auto w-full max-w-3xl rounded-3xl border-4 border-amber-400 bg-[#FFFDF7] p-8 text-center text-zinc-900"
          >
            <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-2xl bg-amber-400 text-zinc-950 shadow-md">
              <Trophy className="h-10 w-10" aria-hidden="true" />
            </div>
            <h2 className="font-display text-3xl sm:text-4xl font-black text-red-900">
              {teamAScore === teamBScore
                ? 'HASIL SERI!'
                : `PEMENANG: ${
                    teamAScore > teamBScore ? settings.teamAName : settings.teamBName
                  }`}
            </h2>
            <p className="mt-2 text-base font-semibold text-zinc-600">
              Terima kasih telah bermain FAMILY 100!
            </p>

            <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div
                className={`rounded-2xl border-2 p-5 ${
                  teamAScore >= teamBScore
                    ? 'border-amber-500 bg-amber-50'
                    : 'border-zinc-200 bg-zinc-50'
                }`}
              >
                <div className="text-sm font-bold uppercase tracking-wide text-zinc-600">
                  {settings.teamAName}
                </div>
                <div className="font-display mt-1 text-5xl font-black text-red-900">
                  {teamAScore}
                </div>
              </div>
              <div
                className={`rounded-2xl border-2 p-5 ${
                  teamBScore >= teamAScore
                    ? 'border-amber-500 bg-amber-50'
                    : 'border-zinc-200 bg-zinc-50'
                }`}
              >
                <div className="text-sm font-bold uppercase tracking-wide text-zinc-600">
                  {settings.teamBName}
                </div>
                <div className="font-display mt-1 text-5xl font-black text-red-900">
                  {teamBScore}
                </div>
              </div>
            </div>

            <div className="mt-7 flex flex-wrap justify-center gap-3">
              <button
                type="button"
                onClick={handleResetScoresAndStartFromOne}
                className="inline-flex min-h-[48px] items-center gap-2 rounded-xl bg-red-800 px-6 py-3 text-base font-extrabold text-white hover:bg-red-900"
              >
                <RotateCcw className="h-5 w-5" aria-hidden="true" />
                Main Lagi (Mulai Soal 1)
              </button>
              <button
                type="button"
                onClick={handleResetTotalToLobby}
                className="inline-flex min-h-[48px] items-center gap-2 rounded-xl border-2 border-zinc-300 bg-white px-6 py-3 text-base font-extrabold text-zinc-800 hover:bg-zinc-100"
              >
                Kembali ke Lobby
              </button>
            </div>
          </motion.section>
        ) : (
          <div className="flex flex-1 min-h-0 flex-col gap-3">
            {/* Top Scoreboard Row (Clickable Team Boxes + Center Round Pot) */}
            <section
              aria-label="Papan skor tim"
              className="shrink-0 grid grid-cols-1 items-stretch gap-3 md:grid-cols-3"
            >
              {/* Clickable Team 1 */}
              <button
                type="button"
                onClick={() => handleSelectTeam('A')}
                aria-pressed={isTeamAActive}
                className={`flex items-center justify-between gap-3 rounded-2xl border-2 px-4 py-2.5 text-left transition-all ${
                  isTeamAActive
                    ? 'border-amber-300 bg-red-950/95 ring-4 ring-amber-400/50 shadow-[0_0_24px_rgba(251,191,36,0.4)]'
                    : 'border-amber-400/35 bg-black/40 hover:border-amber-400/75 hover:bg-black/55'
                }`}
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-amber-200/80">
                      Tim 1
                    </span>
                    {isTeamAActive && (
                      <span className="rounded-md bg-amber-400 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-zinc-950">
                        GILIRAN MAIN
                      </span>
                    )}
                  </div>
                  <div className="font-display truncate text-xl sm:text-2xl font-black text-white">
                    {settings.teamAName}
                  </div>
                </div>
                <div className="font-display shrink-0 text-4xl sm:text-5xl font-black text-amber-300">
                  {teamAScore}
                </div>
              </button>

              {/* Center Round Pot */}
              <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-amber-400 bg-gradient-to-b from-zinc-900 to-zinc-950 px-4 py-2 text-center shadow-lg">
                <span className="text-[11px] font-extrabold uppercase tracking-widest text-amber-300">
                  Pot Poin Ronde Ini
                </span>
                <motion.div
                  key={roundPot}
                  initial={{ scale: 1.15 }}
                  animate={{ scale: 1 }}
                  className="font-display text-4xl sm:text-5xl font-black text-white leading-none mt-0.5"
                >
                  {roundPot}
                </motion.div>
              </div>

              {/* Clickable Team 2 */}
              <button
                type="button"
                onClick={() => handleSelectTeam('B')}
                aria-pressed={isTeamBActive}
                className={`flex items-center justify-between gap-3 rounded-2xl border-2 px-4 py-2.5 text-left transition-all ${
                  isTeamBActive
                    ? 'border-amber-300 bg-red-950/95 ring-4 ring-amber-400/50 shadow-[0_0_24px_rgba(251,191,36,0.4)]'
                    : 'border-amber-400/35 bg-black/40 hover:border-amber-400/75 hover:bg-black/55'
                }`}
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-amber-200/80">
                      Tim 2
                    </span>
                    {isTeamBActive && (
                      <span className="rounded-md bg-amber-400 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-zinc-950">
                        GILIRAN MAIN
                      </span>
                    )}
                  </div>
                  <div className="font-display truncate text-xl sm:text-2xl font-black text-white">
                    {settings.teamBName}
                  </div>
                </div>
                <div className="font-display shrink-0 text-4xl sm:text-5xl font-black text-amber-300">
                  {teamBScore}
                </div>
              </button>
            </section>

            {/* Split 2-Column Main Area (~60% Left Board, ~40% Right Controls) */}
            <div className="flex flex-1 min-h-0 flex-col gap-3 lg:flex-row">
              {/* Left Column (~60%): Question + Survey Board */}
              <AnimatePresence mode="wait">
                <motion.section
                  key={currentQuestion.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  aria-label="Papan soal dan jawaban survei"
                  className="board-frame flex flex-col min-h-0 lg:w-[60%] rounded-3xl border-4 border-amber-400/90 bg-gradient-to-b from-red-950/95 to-zinc-950/95 p-3.5 sm:p-4"
                >
                  {/* Question Banner */}
                  <div className="shrink-0 mb-3 rounded-2xl border-2 border-zinc-900 bg-[#FFFDF7] px-4 py-3 text-center text-zinc-900 shadow-md">
                    <p className="font-display text-lg sm:text-2xl font-black leading-snug">
                      {currentQuestion.question}
                    </p>
                  </div>

                  {/* Survey Answer Cards */}
                  <div
                    className={`grid flex-1 min-h-0 content-center gap-2.5 overflow-y-auto pr-0.5 ${
                      currentQuestion.answers.length > 5
                        ? 'grid-cols-1 md:grid-cols-2'
                        : 'grid-cols-1'
                    }`}
                  >
                    {currentQuestion.answers.map((ans, idx) => (
                      <AnswerCard
                        key={ans.id}
                        index={idx}
                        answer={ans}
                        revealed={revealedIds.includes(ans.id)}
                        bonusRevealed={bonusRevealedIds.includes(ans.id)}
                        multiplier={multiplier}
                        clueEnabled={Boolean(settings.clueEnabled)}
                        clueText={cluesById[ans.id] || ''}
                        compact={currentQuestion.answers.length > 5}
                        onShowClue={() => handleShowClue(ans)}
                        onReveal={() => handleRevealAnswer(ans)}
                      />
                    ))}
                  </div>
                </motion.section>
              </AnimatePresence>

              {/* Right Column (~40%): Strikes, Phase Status, Hybrid Input, Claim Pot, Host Actions */}
              <section
                aria-label="Panel kontrol permainan"
                className="flex flex-col justify-between gap-2.5 rounded-3xl border-2 border-amber-400/40 bg-black/45 p-3.5 sm:p-4 lg:w-[40%] overflow-y-auto"
              >
                {/* Top Status & Active Team Strike [X] [X] [X] */}
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-amber-400/30 bg-zinc-950/80 px-3.5 py-2.5">
                    <div>
                      <div className="text-[10px] font-bold uppercase tracking-wider text-amber-300/80">
                        Status Babak
                      </div>
                      <div className="font-display text-sm sm:text-base font-black text-white">
                        {phase === 'faceoff' && `Face-Off (${activeTeamName})`}
                        {phase === 'faceoff_choice' && `Pilih Giliran (${choiceTeamName})`}
                        {phase === 'playing' && `Bermain (${activeTeamName})`}
                        {phase === 'steal' && `MODE STEAL (${stealingTeamName})`}
                        {phase === 'round_end' && `Selesai (${roundWinnerName})`}
                      </div>
                    </div>

                    {/* 3 Red X Indicators strictly for Active Team */}
                    <div
                      className="flex items-center gap-1.5"
                      aria-label={`Kesalahan ${displayedActiveTeamName}: ${shownStrikes} dari ${maxStrikes}`}
                    >
                      {Array.from({ length: maxStrikes }).map((_, i) => (
                        <span
                          key={i}
                          className={`font-display flex h-9 w-9 items-center justify-center rounded-xl border-2 text-lg font-black transition-colors ${
                            i < shownStrikes
                              ? 'border-red-400 bg-red-600 text-white shadow'
                              : 'border-zinc-700 bg-zinc-900 text-zinc-600'
                          }`}
                        >
                          X
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Steal Dramatic Banner */}
                  {phase === 'steal' && (
                    <div className="rounded-xl border-2 border-amber-300 bg-amber-400 px-3.5 py-2 text-center text-zinc-950 shadow">
                      <p className="font-display text-xs sm:text-sm font-black uppercase">
                        MODE STEAL! {stealingTeamName} punya 1 kesempatan merebut {roundPot} poin!
                      </p>
                    </div>
                  )}

                  {/* Face-Off Winner Choice Banner */}
                  {phase === 'faceoff_choice' && (
                    <div className="rounded-xl border-2 border-amber-300 bg-[#FFFDF7] p-3 text-zinc-900 shadow">
                      <div className="font-display text-sm font-black text-red-900">
                        {choiceTeamName} Menang Face-Off!
                      </div>
                      <p className="mb-2 text-xs font-semibold text-zinc-600">
                        Pilih Main Sendiri atau Lempar ke Tim Lawan:
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => handleStartTeamPlay(faceoffChoiceTeam)}
                          className="min-h-[40px] rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-extrabold text-white hover:bg-emerald-500"
                        >
                          Main Sendiri
                        </button>
                        <button
                          type="button"
                          onClick={() => handleStartTeamPlay(opponentOfChoice)}
                          className="min-h-[40px] rounded-xl bg-amber-400 px-3 py-1.5 text-xs font-extrabold text-zinc-950 hover:bg-amber-300"
                        >
                          Lempar ke {opponentOfChoiceName}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Feedback Status Message */}
                  {feedbackMsg && (
                    <div
                      role="status"
                      className="rounded-xl border border-amber-400/50 bg-amber-400/15 px-3 py-2 text-center text-xs font-bold text-amber-200"
                    >
                      {feedbackMsg}
                    </div>
                  )}
                </div>

                {/* Hybrid Input: Type Answer + Quick Oral Number Buttons */}
                {(phase === 'faceoff' || phase === 'playing' || phase === 'steal') && (
                  <div className="space-y-2.5">
                    <form onSubmit={handleGuessSubmit} className="space-y-2">
                      <label
                        htmlFor="answer-guess-input"
                        className="block text-[11px] font-bold uppercase tracking-wider text-amber-200/80"
                      >
                        Ketik Jawaban ({displayedActiveTeamName})
                      </label>
                      <div className="flex gap-2">
                        <input
                          id="answer-guess-input"
                          ref={guessInputRef}
                          type="text"
                          value={guessInput}
                          onChange={(e) => setGuessInput(e.target.value)}
                          placeholder="Ketik jawaban utuh lalu Enter..."
                          className="min-h-[46px] flex-1 rounded-xl border-2 border-amber-400/60 bg-zinc-900 px-3.5 text-sm sm:text-base font-bold text-white placeholder:text-zinc-400 focus:border-amber-300 focus:outline-none"
                        />
                        <button
                          type="submit"
                          className="inline-flex min-h-[46px] shrink-0 items-center justify-center gap-1.5 rounded-xl bg-amber-400 px-4 text-sm font-black text-zinc-950 shadow hover:bg-amber-300"
                        >
                          <Send className="h-4 w-4" aria-hidden="true" />
                          Submit
                        </button>
                      </div>
                    </form>

                    {/* Quick Oral Card Openers (1, 2, 3...) */}
                    <div className="rounded-xl border border-amber-400/25 bg-zinc-950/60 p-2.5">
                      <div className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-amber-200/80">
                        Mode Lisan (Klik Angka / Kartu di Papan):
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {currentQuestion.answers.map((ans, idx) => {
                          const isOpen =
                            revealedIds.includes(ans.id) || bonusRevealedIds.includes(ans.id);
                          return (
                            <button
                              key={ans.id}
                              type="button"
                              disabled={isOpen}
                              onClick={() => handleRevealAnswer(ans)}
                              title={ans.text}
                              className={`font-display flex h-9 min-w-[2.5rem] flex-1 items-center justify-center rounded-lg border text-sm font-black transition-colors ${
                                isOpen
                                  ? 'border-zinc-700 bg-zinc-800 text-zinc-500'
                                  : 'border-amber-400/70 bg-red-800 text-amber-200 hover:bg-red-700'
                              }`}
                            >
                              {idx + 1}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {/* Bottom: Claim Pot + Host Actions */}
                <div className="space-y-2 border-t border-amber-400/20 pt-2.5">
                  {phase !== 'round_end' && (
                    <button
                      type="button"
                      onClick={handleClaimPotToActiveTeam}
                      className="inline-flex min-h-[46px] w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-black text-white shadow-md hover:bg-emerald-500"
                    >
                      <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
                      Berikan Pot Poin ke {displayedActiveTeamName}
                    </button>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {(phase === 'faceoff' || phase === 'playing') && (
                      <button
                        type="button"
                        onClick={handleStrike}
                        className="inline-flex min-h-[42px] items-center justify-center gap-1.5 rounded-xl bg-red-600 px-3 py-2 text-xs sm:text-sm font-extrabold text-white hover:bg-red-500"
                      >
                        <XCircle className="h-4 w-4" aria-hidden="true" />
                        SALAH [X]
                      </button>
                    )}

                    {phase === 'steal' && (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            setFeedbackMsg(
                              `STEAL BERHASIL! ${stealingTeamName} merebut ${roundPot} poin!`
                            );
                            awardRoundPot(stealingTeam, roundPot, { celebrate: true });
                          }}
                          className="inline-flex min-h-[42px] items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-extrabold text-white hover:bg-emerald-500"
                        >
                          <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                          Steal Berhasil
                        </button>
                        <button
                          type="button"
                          onClick={handleStrike}
                          className="inline-flex min-h-[42px] items-center justify-center gap-1.5 rounded-xl bg-red-600 px-3 py-2 text-xs font-extrabold text-white hover:bg-red-500"
                        >
                          <XCircle className="h-4 w-4" aria-hidden="true" />
                          Steal Gagal (SALAH)
                        </button>
                      </>
                    )}

                    {unrevealedCount > 0 && (
                      <button
                        type="button"
                        onClick={handleRevealRemaining}
                        className="inline-flex min-h-[42px] items-center justify-center gap-1.5 rounded-xl border border-amber-400/50 bg-zinc-800 px-3 py-2 text-xs sm:text-sm font-bold text-amber-200 hover:bg-zinc-700"
                      >
                        <Eye className="h-4 w-4" aria-hidden="true" />
                        Reveal Semua ({unrevealedCount})
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={handleNextRound}
                      className={`inline-flex min-h-[42px] items-center justify-center gap-1.5 rounded-xl bg-amber-400 px-3 py-2 text-xs sm:text-sm font-black text-zinc-950 shadow hover:bg-amber-300 ${
                        unrevealedCount === 0 && phase === 'round_end' ? 'sm:col-span-2' : ''
                      }`}
                    >
                      {roundIndex + 1 < questions.length ? (
                        <>
                          Lanjut Soal Berikutnya
                          <ArrowRight className="h-4 w-4" aria-hidden="true" />
                        </>
                      ) : (
                        <>
                          Lihat Pemenang Akhir
                          <Trophy className="h-4 w-4" aria-hidden="true" />
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </section>
            </div>
          </div>
        )}
      </main>

      {/* Modals & Overlays */}
      <StrikeOverlay
        strikeCount={strikeOverlay.count}
        visible={strikeOverlay.visible}
        onClose={() => setStrikeOverlay((prev) => ({ ...prev, visible: false }))}
      />

      <RulesModal open={rulesOpen} onClose={() => setRulesOpen(false)} />

      <SettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        questions={questions}
        onUpdateQuestions={handleUpdateQuestions}
        settings={settings}
        onUpdateSettings={handleUpdateSettings}
        customAudio={customAudio}
        onSaveAudioSlot={handleSaveAudioSlot}
        onDeleteAudioSlot={handleDeleteAudioSlot}
        currentRoundIndex={roundIndex}
        onJumpToRound={(idx) => setupRound(idx, 'faceoff')}
        onResetScoresAndStartFromOne={handleResetScoresAndStartFromOne}
        onResetTotalToLobby={handleResetTotalToLobby}
      />
    </div>
  );
}
