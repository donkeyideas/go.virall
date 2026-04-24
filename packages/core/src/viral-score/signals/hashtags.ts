/** Scores hashtag strategy 0-100 */
export function scoreHashtags(
  hashtags: string[],
  platform: string,
): { value: number; tip: string } {
  const count = hashtags.length;

  if (count === 0) {
    if (platform === 'linkedin' || platform === 'x') {
      return { value: 50, tip: 'Adding 2-3 relevant hashtags can improve discoverability.' };
    }
    return { value: 20, tip: 'Add hashtags to boost discoverability.' };
  }

  // Ideal count by platform
  const idealRange: Record<string, [number, number]> = {
    instagram: [5, 15],
    tiktok: [3, 8],
    youtube: [3, 10],
    linkedin: [2, 5],
    x: [1, 3],
  };

  const [min, max] = idealRange[platform] ?? [3, 10];
  let score = 40;

  if (count >= min && count <= max) score += 30;
  else if (count < min) score += 15;
  else if (count > max && count <= max * 2) score += 10;
  else score -= 10; // way too many

  // Check for variety (not all the same length -- proxy for diversity)
  const lengths = hashtags.map((h) => h.length);
  const uniqueLengths = new Set(lengths).size;
  if (uniqueLengths >= Math.min(3, count)) score += 10;

  // Penalty for very long hashtags (spammy)
  if (hashtags.some((h) => h.length > 30)) score -= 5;

  // Bonus for mid-length (niche) hashtags
  const midLength = hashtags.filter((h) => h.length >= 8 && h.length <= 20);
  if (midLength.length >= 2) score += 10;

  score = Math.max(0, Math.min(100, score));

  let tip = 'Good hashtag mix.';
  if (count < min) tip = `Add ${min - count} more hashtags for better reach.`;
  else if (count > max * 1.5) tip = `Too many hashtags -- trim to ${max} or fewer.`;

  return { value: score, tip };
}
