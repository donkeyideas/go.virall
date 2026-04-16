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

export type AccountType = "creator" | "brand";

export type PrimaryGoal = "grow_audience" | "make_money" | "build_brand" | "drive_traffic";

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
  account_type: AccountType;
  primary_goal: PrimaryGoal | null;
  company_name: string | null;
  company_website: string | null;
  company_size: string | null;
  industry: string | null;
  brand_logo_url: string | null;
  brand_description: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  stripe_connect_id: string | null;
  stripe_connect_onboarded: boolean;
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
  ownership_verified: boolean;
  verification_code: string | null;
  verification_code_expires_at: string | null;
  ownership_verified_at: string | null;
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

export type DealPipelineStage = "lead" | "outreach" | "negotiating" | "contracted" | "in_progress" | "delivered" | "invoiced" | "paid" | "completed";

// Deal closure types (honor system)
export type DealClosureOutcomeType = "paid" | "partially_paid" | "not_paid" | "cancelled";
export type DealClosureStatus = "pending_closure" | "matched" | "disputed" | "stale";
export type DealFinalOutcome = "paid" | "partially_paid" | "not_paid" | "cancelled" | "disputed" | "stale";

export interface Deal {
  id: string;
  organization_id: string;
  brand_name: string;
  contact_email: string | null;
  status: "inquiry" | "negotiation" | "active" | "completed" | "cancelled";
  pipeline_stage: DealPipelineStage;
  total_value: number | null;
  paid_amount: number;
  notes: string | null;
  proposal_id: string | null;
  thread_id: string | null;
  brand_profile_id: string | null;
  contract_url: string | null;
  is_from_platform: boolean;
  created_at: string;
  updated_at: string;
  // Deal closure (honor system)
  closure_status: DealClosureStatus | null;
  closed_at: string | null;
  dispute_deadline: string | null;
  final_outcome: DealFinalOutcome | null;
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
  // Submission tracking
  submission_url: string | null;
  submitted_at: string | null;
  reviewed_at: string | null;
  reviewed_by: string | null;
  revision_comment: string | null;
  // Joined (loaded on demand)
  submissions?: DeliverableSubmission[];
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

// --- Deliverable Verification ---

export interface OEmbedData {
  title: string | null;
  thumbnail_url: string | null;
  author_name: string | null;
  provider_name: string | null;
  html: string | null;
  type: string | null;
}

export interface DeliverableSubmission {
  id: string;
  deliverable_id: string;
  submitted_by: string;
  url: string;
  platform_detected: string | null;
  oembed_data: OEmbedData | null;
  note: string | null;
  status: "pending" | "approved" | "revision_requested";
  reviewer_id: string | null;
  review_comment: string | null;
  reviewed_at: string | null;
  created_at: string;
  // Joined
  submitter?: Pick<Profile, "id" | "full_name" | "avatar_url">;
}

// --- Deal Closure (Honor System) ---

export interface DealClosureOutcome {
  id: string;
  deal_id: string;
  user_id: string;
  outcome: DealClosureOutcomeType;
  notes: string | null;
  submitted_at: string;
  is_locked: boolean;
}

// --- Trust & Reputation ---

export interface TrustScore {
  id: string;
  profile_id: string;
  overall_score: number;
  completion_rate: number;
  response_time_score: number;
  dispute_rate: number;
  consistency_score: number;
  deal_volume_score: number;
  total_deals_closed: number;
  total_deals_completed: number;
  total_deals_disputed: number;
  avg_response_hours: number | null;
  is_public: boolean;
  last_calculated_at: string;
  created_at: string;
  updated_at: string;
}

export interface TrustScoreHistory {
  id: string;
  profile_id: string;
  overall_score: number;
  breakdown: Record<string, unknown>;
  deal_id: string | null;
  created_at: string;
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

export interface BillingInvoiceLineItem {
  description: string;
  quantity: number;
  unit_amount: number;
  amount: number;
}

export interface BillingInvoice {
  id: string;
  number: string | null;
  date: string;
  due_date: string | null;
  description: string;
  amount: number;
  subtotal: number;
  tax: number;
  status: string;
  invoice_url: string | null;
  invoice_pdf: string | null;
  payment_method_brand: string | null;
  payment_method_last4: string | null;
  customer_name: string | null;
  customer_email: string | null;
  line_items: BillingInvoiceLineItem[];
  period_start: string | null;
  period_end: string | null;
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
  user_id?: string | null;
  organization_id?: string | null;
  admin_reply?: string | null;
  admin_reply_at?: string | null;
  brand_read?: boolean;
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
  account_type: "creator" | "brand";
  max_social_profiles: number;
  price_monthly: number;
  description: string | null;
  stripe_price_id: string | null;
  is_active: boolean;
  sort_order: number;
  features: Record<string, unknown>;
  updated_at: string;
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
  account_type: "creator" | "brand";
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
  account_type: "creator" | "brand";
  created_at: string;
}

export interface AdminStats {
  totalUsers: number;
  totalOrgs: number;
  totalProfiles: number;
  totalAnalyses: number;
  pendingDeals: number;
  creatorUsers: number;
  brandUsers: number;
  creatorOrgs: number;
  brandOrgs: number;
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

// --- Chat ---

export interface ChatConversation {
  id: string;
  organization_id: string;
  user_id: string;
  title: string | null;
  created_at: string;
  updated_at: string;
}

export interface ChatMessage {
  id: string;
  conversation_id: string;
  role: "user" | "assistant" | "system";
  content: string;
  metadata: {
    provider?: string;
    model?: string;
    tokens?: number;
    cost_usd?: number;
  } | null;
  created_at: string;
}

// --- BYOK (Bring Your Own Key) ---

export type AIProvider = "openai" | "anthropic" | "google" | "deepseek";

export interface UserApiKey {
  id: string;
  user_id: string;
  provider: AIProvider;
  api_key_encrypted: string;
  model_preference: string | null;
  is_active: boolean;
  created_at: string;
}

// --- User Events (Admin Analytics) ---

export interface UserEvent {
  id: string;
  user_id: string;
  organization_id: string;
  event_type: string;
  screen: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export interface PlatformBenchmark {
  id: string;
  platform: string;
  niche: string | null;
  follower_bracket: string;
  avg_engagement_rate: number | null;
  avg_follower_growth: number | null;
  avg_posts_per_week: number | null;
  top_content_types: Record<string, unknown> | null;
  top_hashtags: Record<string, unknown> | null;
  avg_earnings_monthly: number | null;
  sample_size: number;
  computed_at: string;
}

// --- Messaging ---

export interface MessageThread {
  id: string;
  participant_1: string;
  participant_2: string;
  last_message_at: string;
  last_message_preview: string | null;
  unread_count_1: number;
  unread_count_2: number;
  is_archived_1: boolean;
  is_archived_2: boolean;
  deal_id: string | null;
  created_at: string;
  // Joined fields
  other_user?: Pick<Profile, "id" | "full_name" | "avatar_url" | "account_type" | "company_name">;
}

export interface DirectMessage {
  id: string;
  thread_id: string;
  sender_id: string;
  content: string;
  message_type: "text" | "proposal" | "file" | "system";
  metadata: Record<string, unknown>;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
}

export interface MessageAttachment {
  id: string;
  message_id: string;
  file_name: string;
  file_url: string;
  file_type: string | null;
  file_size: number | null;
  created_at: string;
}

// --- Proposals ---

export type ProposalStatus = "draft" | "pending" | "negotiating" | "accepted" | "declined" | "expired" | "cancelled";

export interface ProposalDeliverable {
  platform: string;
  content_type: string;
  quantity: number;
  deadline: string | null;
  amount: number | null;
  description: string | null;
}

export interface Proposal {
  id: string;
  sender_id: string;
  receiver_id: string;
  deal_id: string | null;
  thread_id: string | null;
  title: string;
  description: string | null;
  proposal_type: "brand_to_creator" | "creator_to_brand";
  deliverables: ProposalDeliverable[];
  total_amount: number | null;
  currency: string;
  payment_type: "fixed" | "per_deliverable" | "revenue_share" | "product_only";
  start_date: string | null;
  end_date: string | null;
  status: ProposalStatus;
  counter_offer: Record<string, unknown> | null;
  revision_count: number;
  notes: string | null;
  attachments: Record<string, unknown>[];
  created_at: string;
  updated_at: string;
  expires_at: string | null;
  // Joined
  sender?: Pick<Profile, "id" | "full_name" | "avatar_url" | "account_type" | "company_name">;
  receiver?: Pick<Profile, "id" | "full_name" | "avatar_url" | "account_type" | "company_name">;
}

export interface ProposalEvent {
  id: string;
  proposal_id: string;
  actor_id: string;
  event_type: string;
  details: Record<string, unknown>;
  created_at: string;
}

// --- Platform Payments ---

export interface PlatformPayment {
  id: string;
  deal_id: string | null;
  proposal_id: string | null;
  payer_id: string;
  payee_id: string;
  amount: number;
  currency: string;
  platform_fee: number;
  stripe_payment_intent_id: string | null;
  stripe_transfer_id: string | null;
  status: "pending" | "processing" | "completed" | "failed" | "refunded";
  description: string | null;
  metadata: Record<string, unknown>;
  paid_at: string | null;
  created_at: string;
}

// --- Audience Quality Score ---

export type AQSGrade = "A+" | "A" | "A-" | "B+" | "B" | "B-" | "C+" | "C" | "C-" | "D+" | "D" | "D-";

export interface AudienceQualityScore {
  id: string;
  social_profile_id: string;
  overall_score: number;
  engagement_quality: number | null;
  follower_authenticity: number | null;
  growth_health: number | null;
  content_consistency: number | null;
  audience_demographics: Record<string, unknown>;
  risk_flags: string[];
  breakdown: Record<string, unknown>;
  grade: AQSGrade | null;
  calculated_at: string;
  expires_at: string | null;
}

// --- Content Optimization ---

export interface ContentOptimization {
  id: string;
  social_profile_id: string;
  user_id: string;
  draft_content: string;
  target_platform: string;
  content_type: string | null;
  predicted_engagement: number | null;
  optimized_content: string | null;
  suggestions: string[];
  hashtag_recommendations: string[];
  best_posting_time: string | null;
  tone_analysis: Record<string, unknown> | null;
  competitor_comparison: Record<string, unknown> | null;
  created_at: string;
}

// --- Competitor Insights ---

export interface CompetitorInsight {
  id: string;
  social_profile_id: string;
  competitor_id: string;
  insight_type: "weekly_summary" | "trend_alert" | "strategy_change" | "viral_content";
  title: string;
  description: string;
  actionable_tips: string[];
  data_snapshot: Record<string, unknown>;
  priority: "critical" | "high" | "medium" | "info";
  is_read: boolean;
  created_at: string;
}

// --- Creator Marketplace ---

export interface CreatorMarketplaceProfile {
  id: string;
  profile_id: string;
  is_listed: boolean;
  is_verified: boolean;
  categories: string[];
  content_types: string[];
  languages: string[];
  rate_card: Record<string, number>;
  minimum_budget: number | null;
  total_followers: number;
  avg_engagement_rate: number;
  audience_quality_score: number | null;
  platforms_active: string[];
  highlight_reel: Record<string, unknown>[];
  past_brands: string[];
  has_verified_profiles?: boolean;
  updated_at: string;
  // Joined
  profile?: Pick<Profile, "id" | "full_name" | "avatar_url" | "bio" | "niche" | "location">;
}

export interface EnrichedCreatorProfile extends CreatorMarketplaceProfile {
  social_profiles: Pick<
    SocialProfile,
    "id" | "platform" | "handle" | "followers_count" | "engagement_rate" | "posts_count" | "verified" | "avatar_url"
  >[];
  aqs_breakdown: {
    overall_score: number;
    engagement_quality: number | null;
    follower_authenticity: number | null;
    growth_health: number | null;
    content_consistency: number | null;
    grade: string | null;
    risk_flags: string[];
    audience_demographics: Record<string, unknown>;
  } | null;
  growth_metrics: {
    platform: string;
    followers_current: number | null;
    followers_previous: number | null;
    engagement_current: number | null;
    engagement_previous: number | null;
    avg_likes: number | null;
    avg_comments: number | null;
    avg_views: number | null;
  }[];
  smo_score: number | null;
  earnings_estimate: {
    monthly_low: number | null;
    monthly_high: number | null;
    per_post_low: number | null;
    per_post_high: number | null;
  } | null;
  top_content: {
    platform: string;
    url: string | null;
    likes: number | null;
  }[];
}

// --- Trending Topics ---

export interface TrendingTopic {
  id: string;
  platform: string;
  niche: string;
  topic: string;
  hashtags: string[];
  trend_score: number | null;
  volume: number | null;
  growth_rate: number | null;
  ai_analysis: string | null;
  expires_at: string | null;
  created_at: string;
}

// --- Brand-Creator Matches ---

export interface BrandCreatorMatch {
  id: string;
  brand_profile_id: string;
  creator_profile_id: string;
  match_score: number;
  match_reasons: string[];
  brand_interests: Record<string, unknown>;
  creator_strengths: Record<string, unknown>;
  status: "suggested" | "interested" | "contacted" | "dismissed";
  is_read: boolean;
  created_at: string;
  // Joined
  brand?: Pick<Profile, "id" | "full_name" | "avatar_url" | "company_name" | "industry">;
  creator?: Pick<Profile, "id" | "full_name" | "avatar_url" | "niche" | "location">;
}

// --- Scheduled Posts ---

export interface ScheduledPost {
  id: string;
  user_id: string;
  organization_id: string;
  social_profile_id: string | null;
  platform: string;
  content: string;
  media_urls: string[];
  hashtags: string[];
  scheduled_at: string;
  published_at: string | null;
  status: "draft" | "scheduled" | "publishing" | "published" | "failed" | "cancelled";
  platform_post_id: string | null;
  error_message: string | null;
  ai_optimized: boolean;
  ai_suggestions: Record<string, unknown>;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
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
