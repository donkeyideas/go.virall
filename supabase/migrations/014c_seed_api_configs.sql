-- ============================================================
-- 014c: Add usage tracking columns + Seed default API configs
-- ============================================================

-- Add usage tracking columns
alter table api_configs add column if not exists last_used_at timestamptz;
alter table api_configs add column if not exists usage_count bigint not null default 0;
alter table api_configs add column if not exists last_error text;
alter table api_configs add column if not exists last_rotated_at timestamptz;

-- Seed all known API config entries (values stay null, is_set=false)
insert into api_configs (key, label, description, category) values

-- AI Providers
('deepseek_api_key',   'DeepSeek API Key',   'Primary AI provider for content generation',    'ai_provider'),
('openai_api_key',     'OpenAI API Key',     'Fallback AI provider',                          'ai_provider'),
('anthropic_api_key',  'Anthropic API Key',  'Fallback AI provider',                          'ai_provider'),
('gemini_api_key',     'Gemini API Key',     'Fallback AI provider',                          'ai_provider'),

-- Payments
('stripe_secret_key',        'Stripe Secret Key',        'Server-side Stripe API key',           'payments'),
('stripe_publishable_key',   'Stripe Publishable Key',   'Client-side Stripe API key',           'payments'),
('stripe_webhook_secret',    'Stripe Webhook Secret',    'Webhook signature verification',       'payments'),

-- Email
('resend_api_key',    'Resend API Key',    'Transactional email delivery',    'email'),

-- Platform OAuth
('facebook_app_id',       'Facebook App ID',       'Instagram & Facebook OAuth',    'platform_oauth'),
('facebook_app_secret',   'Facebook App Secret',   'Instagram & Facebook OAuth',    'platform_oauth'),
('tiktok_client_key',     'TikTok Client Key',     'TikTok OAuth',                  'platform_oauth'),
('tiktok_client_secret',  'TikTok Client Secret',  'TikTok OAuth',                  'platform_oauth'),
('google_client_id',      'Google Client ID',      'YouTube OAuth',                 'platform_oauth'),
('google_client_secret',  'Google Client Secret',  'YouTube OAuth',                 'platform_oauth'),
('linkedin_client_id',    'LinkedIn Client ID',    'LinkedIn OAuth',                'platform_oauth'),
('linkedin_client_secret','LinkedIn Client Secret', 'LinkedIn OAuth',               'platform_oauth'),
('twitter_client_id',     'Twitter Client ID',     'X / Twitter OAuth',             'platform_oauth'),
('twitter_client_secret', 'Twitter Client Secret', 'X / Twitter OAuth',             'platform_oauth'),
('twitch_client_id',      'Twitch Client ID',      'Twitch OAuth',                  'platform_oauth'),
('twitch_client_secret',  'Twitch Client Secret',  'Twitch OAuth',                  'platform_oauth'),

-- Infrastructure
('supabase_service_role_key', 'Supabase Service Role Key',  'Bypasses RLS for server operations',      'infrastructure'),
('upstash_redis_url',         'Upstash Redis URL',          'Rate limiting & caching',                 'infrastructure'),
('upstash_redis_token',       'Upstash Redis Token',        'Rate limiting & caching auth token',      'infrastructure'),
('cron_secret',               'Cron Secret',                'Authenticates scheduled job requests',     'infrastructure')

on conflict (key) do nothing;
