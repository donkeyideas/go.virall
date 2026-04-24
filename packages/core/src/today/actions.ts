/**
 * Opinionation engine for the Today page.
 * Generates prioritized action lists based on user state.
 */

export type ActionItem = {
  id: string;
  title: string;
  description: string;
  href: string;
  priority: 'do_now' | 'compounds' | 'wins';
};

export type UserState = {
  hasPlatformConnected: boolean;
  hasDraft: boolean;
  hasScheduledPost: boolean;
  hasCompletedProfile: boolean;
  hasMediaKit: boolean;
  hasDeal: boolean;
  hasInvoice: boolean;
  postCount: number;
  lastSyncAt: string | null;
  daysSinceLastPost: number | null;
  followerCount: number;
};

export function generateTodayActions(state: UserState): ActionItem[] {
  const actions: ActionItem[] = [];

  // DO NOW: time-sensitive, blocking
  if (!state.hasPlatformConnected) {
    actions.push({
      id: 'connect-platform',
      title: 'Connect your first platform',
      description: 'Link a social account to start tracking your metrics.',
      href: '/settings#platforms',
      priority: 'do_now',
    });
  }

  if (state.hasPlatformConnected && !state.hasDraft && !state.hasScheduledPost) {
    actions.push({
      id: 'write-draft',
      title: 'Write your first draft',
      description: 'Open the Compose tab and start scoring your content.',
      href: '/compose',
      priority: 'do_now',
    });
  }

  if (state.daysSinceLastPost !== null && state.daysSinceLastPost >= 3) {
    actions.push({
      id: 'post-overdue',
      title: `You haven't posted in ${state.daysSinceLastPost} days`,
      description: 'Consistency matters -- draft a quick post to keep your streak.',
      href: '/compose',
      priority: 'do_now',
    });
  }

  if (state.hasDraft && !state.hasScheduledPost) {
    actions.push({
      id: 'schedule-draft',
      title: 'Schedule your draft',
      description: 'Your draft is ready -- pick a time and lock it in.',
      href: '/compose',
      priority: 'do_now',
    });
  }

  // COMPOUNDS: medium effort, recurring value
  if (!state.hasCompletedProfile) {
    actions.push({
      id: 'complete-profile',
      title: 'Complete your profile',
      description: 'A full profile helps us give better scoring and suggestions.',
      href: '/settings#account',
      priority: 'compounds',
    });
  }

  if (!state.hasMediaKit) {
    actions.push({
      id: 'create-media-kit',
      title: 'Set up your media kit',
      description: 'Create a professional profile that brands can discover.',
      href: '/settings#media-kit',
      priority: 'compounds',
    });
  }

  if (state.postCount >= 3 && !state.hasDeal) {
    actions.push({
      id: 'start-pipeline',
      title: 'Add your first brand deal',
      description: 'Start tracking brand partnerships in your pipeline.',
      href: '/revenue',
      priority: 'compounds',
    });
  }

  if (state.hasDeal && !state.hasInvoice) {
    actions.push({
      id: 'create-invoice',
      title: 'Send your first invoice',
      description: 'Get paid faster with professional invoicing.',
      href: '/revenue',
      priority: 'compounds',
    });
  }

  // WINS: celebrate momentum
  if (state.postCount >= 1 && state.postCount <= 3) {
    actions.push({
      id: 'first-posts',
      title: `${state.postCount} post${state.postCount > 1 ? 's' : ''} created`,
      description: 'You are building momentum. Keep it going.',
      href: '/compose',
      priority: 'wins',
    });
  }

  if (state.followerCount >= 100) {
    actions.push({
      id: 'follower-milestone',
      title: `${state.followerCount.toLocaleString()} followers`,
      description: 'Your audience is growing. Check your analytics for insights.',
      href: '/audience',
      priority: 'wins',
    });
  }

  return actions;
}

export function getDoNow(actions: ActionItem[]): ActionItem[] {
  return actions.filter((a) => a.priority === 'do_now').slice(0, 3);
}

export function getCompounds(actions: ActionItem[]): ActionItem[] {
  return actions.filter((a) => a.priority === 'compounds').slice(0, 3);
}

export function getWins(actions: ActionItem[]): ActionItem[] {
  return actions.filter((a) => a.priority === 'wins').slice(0, 2);
}
