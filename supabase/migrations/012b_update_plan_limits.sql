-- 012b: Update plan limits for multi-account support
-- Changes from "X connected platforms" to "Up to X accounts" since users can now have multiple accounts per platform

update subscription_plans set
  features = ARRAY['3 connected accounts','10 analyses per month','5 content generations','5 AI strategist msgs / day','Viral score on every post'],
  max_platforms = 3
where tier = 'free';

update subscription_plans set
  features = ARRAY['Up to 10 accounts','Unlimited analyses','Unlimited content generations','Full AI strategist access','Audience intelligence','Revenue tracking'],
  max_platforms = 10
where tier = 'creator';

update subscription_plans set
  features = ARRAY['Up to 20 accounts','Advanced Analytics','AI Content Studio','Viral Score','Audience Intelligence','Competitor Analysis'],
  max_platforms = 20
where tier = 'pro';

update subscription_plans set
  features = ARRAY['Unlimited accounts','Full Analytics Suite','Priority AI','Team Collaboration','White-label Reports','API Access'],
  max_platforms = -1
where tier = 'agency';
