// ============================================================
// Go Virall v2 — TypeScript Types
// ============================================================

// --- Foundation ---

export interface Organization {
  id: string;
  name: string;
  slug: string | null;
  plan: string;
  subscription_status: string;
  trial_ends_at: string | null;
  max_social_profiles: number;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  stripe_price_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: string;
  organization_id: string | null;
  full_name: string | null;
  avatar_url: string | null;
  display_name: string | null;
  bio: string | null;
  niche: string | null;
  location: string | null;
  role: string;
  system_role: string;
  timezone: string;
  created_at: string;
  updated_at: string;
}

export interface UserPreferences {
  id: string;
  theme: string;
  email_notifications: boolean;
  weekly_report: boolean;
  daily_digest: boolean;
  brand_deal_updates: boolean;
  growth_milestones: boolean;
  collab_opportunities: boolean;
  marketing_updates: boolean;
  deal_room_messages: boolean;
  campaign_reminders: boolean;
  ai_analysis_complete: boolean;
  created_at: string;
  updated_at: string;
}

// --- Social Core ---

export type SocialPlatform =
  | "instagram"
  | "tiktok"
  | "youtube"
  | "twitter"
  | "linkedin"
  | "threads"
  | "pinterest"
  | "twitch";

export interface RecentPost {
  id: string;
  imageUrl: string;
  caption: string;
  likesCount: number;
  commentsCount: number;
  timestamp: string;
  isVideo: boolean;
}

export interface SocialProfile {
  id: string;
  organization_id: string;
  platform: SocialPlatform;
  handle: string;
  platform_user_id: string | null;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  followers_count: number;
  following_count: number;
  posts_count: number;
  engagement_rate: number | null;
  verified: boolean;
  niche: string | null;
  country: string | null;
  last_synced_at: string | null;
  recent_posts: RecentPost[] | null;
  platform_data: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface SocialMetrics {
  id: string;
  social_profile_id: string;
  date: string;
  followers: number | null;
  following: number | null;
  posts_count: number | null;
  avg_likes: number | null;
  avg_comments: number | null;
  avg_shares: number | null;
  avg_views: number | null;
  engagement_rate: number | null;
  top_post_url: string | null;
  top_post_likes: number | null;
  created_at: string;
}

// --- Analyses ---

export type AnalysisType =
  | "growth"
  | "content_strategy"
  | "hashtags"
  | "competitors"
  | "insights"
  | "earnings_forecast"
  | "thirty_day_plan"
  | "smo_score"
  | "audience"
  | "network"
  | "campaign_ideas"
  | "content_generator"
  | "recommendations";

export interface SocialAnalysis {
  id: string;
  social_profile_id: string;
  analysis_type: AnalysisType;
  result: Record<string, unknown>;
  ai_provider: string | null;
  tokens_used: number;
  cost_cents: number;
  expires_at: string | null;
  created_at: string;
}

// --- Competitors ---

export interface SocialCompetitor {
  id: string;
  social_profile_id: string;
  platform: string;
  handle: string;
  display_name: string | null;
  followers_count: number | null;
  engagement_rate: number | null;
  avg_views: number | null;
  niche: string | null;
  last_synced_at: string | null;
  created_at: string;
}

// --- Goals ---

export interface SocialGoal {
  id: string;
  social_profile_id: string;
  primary_objective: string | null;
  target_value: number | null;
  target_days: number | null;
  content_niche: string | null;
  monetization_goal: string | null;
  posting_commitment: string | null;
  target_audience: string | null;
  competitive_aspiration: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// --- Deals & Campaigns ---

export interface Deal {
  id: string;
  organization_id: string;
  brand_name: string;
  contact_email: string | null;
  status: "inquiry" | "negotiation" | "active" | "completed" | "cancelled";
  total_value: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface DealDeliverable {
  id: string;
  deal_id: string;
  title: string;
  platform: string | null;
  content_type: string | null;
  deadline: string | null;
  status: "pending" | "in_progress" | "submitted" | "revision" | "approved";
  payment_amount: number | null;
  created_at: string;
}

export interface Campaign {
  id: string;
  organization_id: string;
  name: string;
  status: "draft" | "active" | "paused" | "completed";
  start_date: string | null;
  end_date: string | null;
  budget: number | null;
  target_reach: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

// --- Platform Config ---

export interface PlatformApiConfig {
  id: string;
  provider: string;
  display_name: string;
  api_key: string | null;
  base_url: string | null;
  is_active: boolean;
  config: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

// --- Notifications ---

export interface Notification {
  id: string;
  organization_id: string;
  title: string;
  body: string | null;
  type: string;
  is_read: boolean;
  created_at: string;
}

// --- Billing ---

export interface SubscriptionData {
  status: string;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  payment_method_last4: string | null;
  payment_method_brand: string | null;
}

export interface BillingInvoice {
  id: string;
  date: string;
  description: string;
  amount: number;
  status: string;
  invoice_url: string | null;
}

// --- Admin Dashboard ---

export interface AuditLog {
  id: string;
  user_id: string | null;
  organization_id: string | null;
  action: string;
  resource_type: string | null;
  resource_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface BillingEvent {
  id: string;
  organization_id: string | null;
  event_type: string;
  stripe_event_id: string | null;
  amount_cents: number;
  currency: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface ContactSubmission {
  id: string;
  name: string;
  email: string;
  subject: string | null;
  message: string;
  status: "new" | "read" | "replied" | "archived";
  created_at: string;
}

export interface SiteContent {
  id: string;
  page: string;
  section: string;
  content: Record<string, unknown>;
  sort_order: number;
  is_active: boolean;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Post {
  id: string;
  type: "blog" | "guide" | "tutorial";
  title: string;
  slug: string;
  excerpt: string | null;
  content: string;
  cover_image: string | null;
  author_id: string | null;
  status: "draft" | "published" | "archived";
  tags: string[];
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ChangelogEntry {
  id: string;
  title: string;
  description: string;
  type: "feature" | "improvement" | "fix" | "breaking";
  is_published: boolean;
  published_at: string | null;
  created_at: string;
}

export interface RoadmapItem {
  id: string;
  title: string;
  description: string | null;
  status: "planned" | "in_progress" | "completed" | "cancelled";
  category: string | null;
  votes: number;
  target_date: string | null;
  completed_at: string | null;
  created_at: string;
}

export interface JobListing {
  id: string;
  title: string;
  department: string | null;
  location: string | null;
  type: string;
  description: string;
  requirements: string | null;
  salary_range: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body_html: string;
  variables: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface SocialPost {
  id: string;
  platform: string;
  content: string;
  media_url: string | null;
  scheduled_at: string | null;
  published_at: string | null;
  status: "draft" | "scheduled" | "published";
  created_at: string;
}

export interface AIInteraction {
  id: string;
  organization_id: string | null;
  user_id: string | null;
  feature: string;
  sub_type: string | null;
  prompt_text: string;
  response_text: string | null;
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  cost_usd: number;
  provider: string;
  model: string | null;
  response_time_ms: number | null;
  is_success: boolean;
  error_message: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface PlatformInsight {
  id: string;
  insight_type: "health_score" | "anomaly" | "trend" | "recommendation" | "prediction" | "summary";
  category: "revenue" | "engagement" | "growth" | "churn" | "feature_adoption" | "system" | "ai_usage" | "overall";
  title: string;
  description: string;
  severity: "critical" | "warning" | "info" | "positive";
  confidence: number;
  data_snapshot: Record<string, unknown>;
  recommendations: Array<Record<string, unknown>>;
  is_active: boolean;
  is_dismissed: boolean;
  generated_at: string;
  expires_at: string | null;
}

export interface PricingPlan {
  id: string;
  name: string;
  max_social_profiles: number;
  price_monthly: number;
  features: Record<string, unknown>;
}

// Admin composite types
export interface UserRow {
  id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
  role: string;
  system_role: string;
  org_name: string | null;
  org_plan: string | null;
  provider: string | null;
  created_at: string;
}

export interface OrgRow {
  id: string;
  name: string;
  slug: string | null;
  plan: string;
  subscription_status: string;
  member_count: number;
  profile_count: number;
  deal_count: number;
  stripe_customer_id: string | null;
  created_at: string;
}

export interface AdminStats {
  totalUsers: number;
  totalOrgs: number;
  totalProfiles: number;
  totalAnalyses: number;
  pendingDeals: number;
}

export interface AdminNotification {
  id: string;
  type: "signup" | "billing" | "audit" | "contact";
  title: string;
  description: string;
  created_at: string;
}

export interface APICallLog {
  id: string;
  provider: string;
  endpoint: string | null;
  status_code: number | null;
  response_time_ms: number | null;
  tokens_used: number | null;
  cost_usd: number | null;
  is_success: boolean;
  error_message: string | null;
  created_at: string;
}

// --- Platform Display Config ---

export const PLATFORM_CONFIG: Record<
  SocialPlatform,
  { label: string; color: string; icon: string; heroStat: string }
> = {
  instagram: {
    label: "Instagram",
    color: "#E1306C",
    icon: "instagram",
    heroStat: "Followers",
  },
  tiktok: {
    label: "TikTok",
    color: "#00f2ea",
    icon: "music",
    heroStat: "Followers",
  },
  youtube: {
    label: "YouTube",
    color: "#FF0000",
    icon: "youtube",
    heroStat: "Subscribers",
  },
  twitter: {
    label: "X (Twitter)",
    color: "#1DA1F2",
    icon: "twitter",
    heroStat: "Followers",
  },
  linkedin: {
    label: "LinkedIn",
    color: "#0A66C2",
    icon: "linkedin",
    heroStat: "Connections",
  },
  threads: {
    label: "Threads",
    color: "#000000",
    icon: "at-sign",
    heroStat: "Followers",
  },
  pinterest: {
    label: "Pinterest",
    color: "#E60023",
    icon: "pin",
    heroStat: "Monthly Views",
  },
  twitch: {
    label: "Twitch",
    color: "#9146FF",
    icon: "twitch",
    heroStat: "Followers",
  },
};

export const ANALYSIS_TYPES: {
  type: AnalysisType;
  label: string;
  description: string;
}[] = [
  { type: "growth", label: "Growth Tips", description: "Actionable growth strategies" },
  { type: "content_strategy", label: "Content Strategy", description: "Posting schedule & content mix" },
  { type: "hashtags", label: "Hashtags", description: "Optimized hashtag sets" },
  { type: "competitors", label: "Competitors", description: "Competitive benchmarking" },
  { type: "insights", label: "AI Insights", description: "Strategic analysis & trends" },
  { type: "earnings_forecast", label: "Earnings Forecast", description: "Revenue projections" },
  { type: "thirty_day_plan", label: "30-Day Plan", description: "Day-by-day action plan" },
  { type: "smo_score", label: "SMO Score", description: "Social media optimization score" },
  { type: "audience", label: "Audience", description: "Demographics & quality" },
  { type: "network", label: "Network", description: "Collaboration opportunities" },
  { type: "campaign_ideas", label: "Campaign Ideas", description: "Campaign recommendations" },
  { type: "content_generator", label: "Content Generator", description: "Generated content" },
  { type: "recommendations", label: "Recommendations", description: "Actionable recommendations" },
];
