/** Scores the hook (opening line) of a post 0-100 */
export function scoreHookStrength(hook: string): {
  value: number;
  tip: string;
} {
  if (!hook || hook.trim().length === 0) {
    return { value: 0, tip: 'Add a hook -- the first line people see.' };
  }

  let score = 40; // base score for having a hook
  const lower = hook.toLowerCase().trim();

  // Length: sweet spot is 40-80 chars
  const len = hook.trim().length;
  if (len >= 40 && len <= 80) score += 15;
  else if (len >= 20 && len <= 120) score += 8;
  else if (len > 120) score -= 5;

  // Starts with a question
  if (lower.endsWith('?')) score += 10;

  // Starts with a number (listicle / specificity)
  if (/^\d/.test(lower)) score += 8;

  // Power words
  const powerWords = [
    'secret', 'mistake', 'stop', 'never', 'always', 'why', 'how',
    'truth', 'surprising', 'proven', 'free', 'warning', 'unpopular',
    'controversial', 'hack', 'trick', 'finally', 'nobody',
  ];
  const foundPower = powerWords.filter((w) => lower.includes(w));
  score += Math.min(foundPower.length * 6, 18);

  // Emotional triggers
  const emotionalTriggers = ['you', 'your', 'i ', "i'm", 'my '];
  if (emotionalTriggers.some((t) => lower.includes(t))) score += 5;

  // Caps lock abuse penalty
  const capsRatio = (hook.match(/[A-Z]/g)?.length ?? 0) / len;
  if (capsRatio > 0.5 && len > 10) score -= 10;

  // Clamp
  score = Math.max(0, Math.min(100, score));

  // Generate tip
  let tip = 'Solid hook.';
  if (score < 40) tip = 'Try starting with a question or a bold statement.';
  else if (score < 60) tip = 'Add a power word or specific number to make it pop.';
  else if (score < 80) tip = 'Good hook -- try making it more personal with "you" or "your".';

  return { value: score, tip };
}
