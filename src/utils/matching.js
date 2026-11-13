// Strict phrase normalization: lowercase and strip all spaces & special characters
export function normalizeStrict(str) {
  return (str || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

export function levenshtein(a, b) {
  const s = a || '';
  const t = b || '';
  const m = s.length;
  const n = t.length;
  if (m === 0) return n;
  if (n === 0) return m;

  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = s[i - 1] === t[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost
      );
    }
  }
  return dp[m][n];
}

/**
 * Strict Phrase Matching:
 * - Forbids 1-word partial matching.
 * - Compares normalized whole phrase against answer.text or any item in answer.aliases.
 * - Light typo tolerance (Levenshtein distance <= 1 for short/medium, <= 2 for >= 12 chars)
 *   ONLY when input length >= 80% of target phrase length.
 */
export function findBestAnswerMatch(guess, answers, excludeIds = []) {
  const normGuess = normalizeStrict(guess);
  if (!normGuess) return null;

  let bestMatch = null;
  let bestDistance = Infinity;

  answers.forEach((ans, idx) => {
    if (excludeIds.includes(ans.id)) return;

    const candidates = [ans.text, ...(ans.aliases || ans.keywords || [])];

    for (const cand of candidates) {
      const normCand = normalizeStrict(cand);
      if (!normCand) continue;

      if (normGuess === normCand) {
        if (0 < bestDistance) {
          bestDistance = 0;
          bestMatch = { answer: ans, rankIndex: idx, distance: 0 };
        }
        continue;
      }

      // Typo tolerance only if input phrase length >= 80% of target phrase length
      if (normGuess.length >= normCand.length * 0.8) {
        const maxAllowedDist = normCand.length >= 12 ? 2 : 1;
        const dist = levenshtein(normGuess, normCand);
        if (dist <= maxAllowedDist && dist < bestDistance) {
          bestDistance = dist;
          bestMatch = { answer: ans, rankIndex: idx, distance: dist };
        }
      }
    }
  });

  return bestMatch;
}

/**
 * Generates an underscore-based masked clue like "K _ N _ _ _ G"
 * NEVER uses asterisks (*).
 */
export function generateMaskedClue(text) {
  const words = (text || '').toUpperCase().split(' ');
  return words
    .map((word) => {
      if (word.length <= 2) {
        return word
          .split('')
          .map((ch) => (/[A-Z0-9]/.test(ch) ? '_' : ch))
          .join(' ');
      }
      return word
        .split('')
        .map((ch, idx) => {
          if (!/[A-Z0-9]/.test(ch)) return ch;
          if (idx === 0 || idx === word.length - 1) return ch;
          return Math.random() < 0.32 ? ch : '_';
        })
        .join(' ');
    })
    .join('   ');
}
