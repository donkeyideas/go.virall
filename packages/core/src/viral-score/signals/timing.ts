/** Scores posting time quality 0-100 */
export function scoreTiming(
  scheduledAt: string | undefined,
  platform: string,
): { value: number; tip: string } {
  if (!scheduledAt) {
    return { value: 50, tip: 'Schedule your post for optimal timing.' };
  }

  const date = new Date(scheduledAt);
  const hour = date.getUTCHours();
  const dayOfWeek = date.getUTCDay(); // 0=Sun

  // Peak hours by platform (UTC approximation -- ideally would use user timezone)
  const peakHours: Record<string, number[]> = {
    instagram: [11, 12, 13, 17, 18, 19],
    tiktok: [10, 11, 14, 15, 19, 20, 21],
    youtube: [12, 13, 14, 15, 16, 17],
    linkedin: [7, 8, 9, 10, 11, 12],
    x: [8, 9, 12, 13, 17, 18],
  };

  const peaks = peakHours[platform] ?? [12, 13, 17, 18];
  const isPeak = peaks.includes(hour);
  const isNearPeak = peaks.some((p) => Math.abs(p - hour) <= 1);
  const isWeekday = dayOfWeek >= 1 && dayOfWeek <= 5;

  let score = 40;
  if (isPeak) score += 35;
  else if (isNearPeak) score += 20;
  if (isWeekday && platform === 'linkedin') score += 15;
  else if (!isWeekday && (platform === 'instagram' || platform === 'tiktok')) score += 10;
  else if (isWeekday) score += 5;

  score = Math.max(0, Math.min(100, score));

  let tip = 'Good posting time.';
  if (score < 50) {
    const peakStr = peaks.slice(0, 3).map((h) => `${h}:00`).join(', ');
    tip = `Consider posting around ${peakStr} UTC for better reach.`;
  }

  return { value: score, tip };
}
