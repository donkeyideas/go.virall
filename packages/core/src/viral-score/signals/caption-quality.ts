/** Scores caption quality 0-100 */
export function scoreCaptionQuality(
  caption: string,
  platform: string,
): { value: number; tip: string } {
  if (!caption || caption.trim().length === 0) {
    return { value: 10, tip: 'Add a caption to boost engagement.' };
  }

  let score = 30;
  const len = caption.trim().length;

  // Platform-specific ideal lengths
  const idealRange: Record<string, [number, number]> = {
    instagram: [100, 500],
    tiktok: [50, 200],
    youtube: [200, 1000],
    linkedin: [200, 800],
    x: [50, 280],
  };

  const [min, max] = idealRange[platform] ?? [100, 500];
  if (len >= min && len <= max) score += 20;
  else if (len >= min * 0.5 && len <= max * 1.5) score += 10;

  // Has a CTA (call to action)
  const ctaPatterns = [
    'follow', 'save', 'share', 'comment', 'link in bio', 'subscribe',
    'tap', 'click', 'check out', 'let me know', 'what do you think',
    'drop a', 'tell me', 'dm me',
  ];
  if (ctaPatterns.some((p) => caption.toLowerCase().includes(p))) score += 15;

  // Has line breaks (readability)
  const lineBreaks = (caption.match(/\n/g) ?? []).length;
  if (lineBreaks >= 2 && lineBreaks <= 10) score += 10;

  // Has emoji (engagement signal)
  const emojiCount = (caption.match(/[\u{1F300}-\u{1F9FF}]/gu) ?? []).length;
  if (emojiCount >= 1 && emojiCount <= 8) score += 5;
  else if (emojiCount > 15) score -= 5;

  // Starts with a hook pattern (not repeating the title hook)
  if (/^[A-Z]/.test(caption.trim())) score += 3;

  // Penalty: wall of text (no line breaks for long caption)
  if (len > 300 && lineBreaks < 2) score -= 10;

  score = Math.max(0, Math.min(100, score));

  let tip = 'Great caption.';
  if (score < 30) tip = 'Write a longer caption with a clear call-to-action.';
  else if (score < 50) tip = 'Break your caption into shorter paragraphs and add a CTA.';
  else if (score < 70) tip = 'Consider adding a call-to-action like "Save this for later".';

  return { value: score, tip };
}
