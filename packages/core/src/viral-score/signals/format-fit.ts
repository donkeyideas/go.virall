/** Scores how well the post format fits the platform 0-100 */
export function scoreFormatFit(
  platform: string,
  format: string,
): { value: number; tip: string } {
  const fitMap: Record<string, Record<string, number>> = {
    instagram: {
      reel: 95,
      carousel: 90,
      story: 70,
      static: 50,
      'long-video': 30,
      short: 80,
      thread: 20,
      article: 10,
    },
    tiktok: {
      short: 95,
      reel: 90,
      story: 60,
      carousel: 40,
      static: 20,
      'long-video': 50,
      thread: 10,
      article: 10,
    },
    youtube: {
      'long-video': 95,
      short: 85,
      reel: 70,
      static: 30,
      carousel: 20,
      story: 20,
      thread: 10,
      article: 40,
    },
    linkedin: {
      article: 95,
      carousel: 85,
      static: 70,
      thread: 60,
      'long-video': 50,
      short: 40,
      reel: 30,
      story: 20,
    },
    x: {
      thread: 90,
      static: 80,
      short: 60,
      article: 50,
      reel: 40,
      carousel: 30,
      'long-video': 20,
      story: 15,
    },
    facebook: {
      reel: 90,
      story: 80,
      static: 75,
      'long-video': 65,
      short: 60,
      carousel: 50,
      article: 40,
      thread: 20,
    },
    twitch: {
      'long-video': 95,
      short: 60,
      static: 40,
      reel: 30,
      story: 20,
      carousel: 15,
      thread: 10,
      article: 10,
    },
  };

  const platformFit = fitMap[platform];
  if (!platformFit) {
    return { value: 50, tip: 'Unknown platform -- format fit not scored.' };
  }

  const value = platformFit[format] ?? 40;

  let tip = 'Great format choice for this platform.';
  if (value < 40) {
    const best = Object.entries(platformFit)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 2)
      .map(([f]) => f);
    tip = `This format underperforms on ${platform}. Try ${best.join(' or ')} instead.`;
  } else if (value < 70) {
    tip = 'Decent format -- but there are higher-performing options for this platform.';
  }

  return { value, tip };
}
