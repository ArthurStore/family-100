import { DEFAULT_QUESTIONS, DEFAULT_SETTINGS } from '../data/defaultQuestions';

const KEYS = {
  QUESTIONS: 'f100_questions_v3',
  SETTINGS: 'f100_settings_v3',
  GAME_STATE: 'f100_gamestate_v3',
};

export function loadQuestions() {
  try {
    const raw = localStorage.getItem(KEYS.QUESTIONS);
    if (!raw) return DEFAULT_QUESTIONS;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    return DEFAULT_QUESTIONS;
  } catch {
    return DEFAULT_QUESTIONS;
  }
}

export function saveQuestions(questions) {
  try {
    localStorage.setItem(KEYS.QUESTIONS, JSON.stringify(questions));
    return true;
  } catch {
    return false;
  }
}

export function loadSettings() {
  try {
    const raw = localStorage.getItem(KEYS.SETTINGS);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_SETTINGS, ...parsed };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings) {
  try {
    localStorage.setItem(KEYS.SETTINGS, JSON.stringify(settings));
    return true;
  } catch {
    return false;
  }
}

export function loadGameState() {
  try {
    const raw = localStorage.getItem(KEYS.GAME_STATE);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function saveGameState(state) {
  try {
    localStorage.setItem(KEYS.GAME_STATE, JSON.stringify(state));
  } catch {
    // Ignore transient storage errors
  }
}

export function clearGameState() {
  try {
    localStorage.removeItem(KEYS.GAME_STATE);
  } catch {
    // Ignore
  }
}
