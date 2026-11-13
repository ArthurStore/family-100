export const SOUND_SLOTS = [
  {
    key: 'correct',
    label: 'Jawaban Benar ("Ding!")',
    description: 'Diputar saat jawaban benar & kartu survei terbuka.',
  },
  {
    key: 'wrong',
    label: 'Jawaban Salah (Buzzer SALAH!)',
    description: 'Diputar saat jawaban salah / tanda silang X muncul.',
  },
  {
    key: 'roundWin',
    label: 'Menang Ronde (Fanfare)',
    description: 'Diputar saat poin ronde dimenangkan atau berhasil dicuri.',
  },
  {
    key: 'victory',
    label: 'Kemenangan Akhir (Grand Fanfare)',
    description: 'Diputar saat pemenang akhir diumumkan.',
  },
];

export const BGM_PRESETS = [
  { id: 'upbeat', label: 'Upbeat Game Show Loop' },
  { id: 'tense', label: 'Tense Thinking Music' },
  { id: 'celebration', label: 'Victory Celebration' },
];

let audioCtx = null;

function getAudioContext() {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (Ctx) audioCtx = new Ctx();
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

function playSynthSfx(type, volume = 0.85) {
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const master = ctx.createGain();
  master.gain.setValueAtTime(Math.max(0.01, Math.min(1, volume)), now);
  master.connect(ctx.destination);

  if (type === 'correct') {
    const notes = [659.25, 987.77, 1318.5];
    notes.forEach((freq, idx) => {
      const start = now + idx * 0.065;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, start);
      gain.gain.setValueAtTime(0.38, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.42);
      osc.connect(gain);
      gain.connect(master);
      osc.start(start);
      osc.stop(start + 0.44);
    });
  } else if (type === 'wrong') {
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();
    osc1.type = 'sawtooth';
    osc2.type = 'square';
    osc1.frequency.setValueAtTime(125, now);
    osc1.frequency.setValueAtTime(108, now + 0.18);
    osc2.frequency.setValueAtTime(92, now);
    osc2.frequency.setValueAtTime(80, now + 0.18);
    gain.gain.setValueAtTime(0.32, now);
    gain.gain.setValueAtTime(0.32, now + 0.42);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.62);
    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(master);
    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.64);
    osc2.stop(now + 0.64);
  } else if (type === 'roundWin') {
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((freq, idx) => {
      const start = now + idx * 0.08;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, start);
      gain.gain.setValueAtTime(0.34, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.48);
      osc.connect(gain);
      gain.connect(master);
      osc.start(start);
      osc.stop(start + 0.5);
    });
  } else if (type === 'victory') {
    const sequence = [
      { f: 523.25, t: 0, d: 0.14 },
      { f: 659.25, t: 0.12, d: 0.14 },
      { f: 783.99, t: 0.24, d: 0.14 },
      { f: 1046.5, t: 0.38, d: 0.65 },
    ];
    sequence.forEach(({ f, t, d }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(f, now + t);
      gain.gain.setValueAtTime(0.4, now + t);
      gain.gain.exponentialRampToValueAtTime(0.001, now + t + d);
      osc.connect(gain);
      gain.connect(master);
      osc.start(now + t);
      osc.stop(now + t + d + 0.02);
    });
  }
}

let activeSfxAudio = null;

export function playSound(type, { enabled = true, volume = 0.85, customAudio = {} } = {}) {
  if (!enabled) return;

  const customEntry = customAudio?.[type];
  if (customEntry?.dataUrl) {
    try {
      if (activeSfxAudio) {
        activeSfxAudio.pause();
        activeSfxAudio.currentTime = 0;
      }
      const audio = new Audio(customEntry.dataUrl);
      audio.volume = Math.max(0, Math.min(1, volume));
      activeSfxAudio = audio;
      audio.play().catch(() => {
        playSynthSfx(type, volume);
      });
      return;
    } catch {
      // Fallback
    }
  }

  playSynthSfx(type, volume);
}

let bgmTimer = null;
let bgmAudioEl = null;
let bgmStep = 0;
let currentBgmVolume = 0.35;

const BGM_PATTERNS = {
  upbeat: {
    tempoMs: 220,
    notes: [261.63, 329.63, 392.0, 523.25, 392.0, 329.63, 293.66, 392.0],
    wave: 'triangle',
  },
  tense: {
    tempoMs: 300,
    notes: [220.0, 0, 233.08, 0, 220.0, 261.63, 246.94, 0],
    wave: 'sine',
  },
  celebration: {
    tempoMs: 200,
    notes: [392.0, 493.88, 587.33, 783.99, 587.33, 659.25, 783.99, 987.77],
    wave: 'triangle',
  },
};

export function stopBgm() {
  if (bgmTimer) {
    clearInterval(bgmTimer);
    bgmTimer = null;
  }
  if (bgmAudioEl) {
    bgmAudioEl.pause();
    bgmAudioEl.currentTime = 0;
    bgmAudioEl = null;
  }
}

export function setBgmVolume(vol) {
  currentBgmVolume = Math.max(0, Math.min(1, vol));
  if (bgmAudioEl) {
    bgmAudioEl.volume = currentBgmVolume;
  }
}

export function startBgm({ enabled, track = 'upbeat', volume = 0.35, customAudio = {} }) {
  stopBgm();
  if (!enabled) return;

  currentBgmVolume = Math.max(0, Math.min(1, volume));

  if (track === 'custom' && customAudio?.bgmCustom?.dataUrl) {
    try {
      const audio = new Audio(customAudio.bgmCustom.dataUrl);
      audio.loop = true;
      audio.volume = currentBgmVolume;
      bgmAudioEl = audio;
      audio.play().catch(() => {});
      return;
    } catch {
      // Fallback
    }
  }

  const pattern = BGM_PATTERNS[track] || BGM_PATTERNS.upbeat;
  bgmStep = 0;

  bgmTimer = setInterval(() => {
    const ctx = getAudioContext();
    if (!ctx) return;
    const freq = pattern.notes[bgmStep % pattern.notes.length];
    bgmStep += 1;
    if (!freq) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = pattern.wave;
    osc.frequency.setValueAtTime(freq, now);
    gain.gain.setValueAtTime(Math.max(0.005, currentBgmVolume * 0.16), now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + pattern.tempoMs / 1000);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + pattern.tempoMs / 1000 + 0.02);
  }, pattern.tempoMs);
}
