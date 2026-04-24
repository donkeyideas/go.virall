-- ============================================================
-- 014b: Seed default email templates
-- ============================================================

insert into email_templates (key, name, subject, html_body, text_body, variables, category) values

-- 1. Welcome
('welcome', 'Welcome Email', 'Welcome to Go Virall, {{user_name}}!',
'<div style="max-width:600px;margin:0 auto;font-family:system-ui,sans-serif;background:#111;color:#e2e4ea;padding:40px 32px;border-radius:8px">
<h1 style="font-size:28px;font-weight:700;margin:0 0 16px;color:#d1ff1a">Welcome to Go Virall</h1>
<p style="font-size:15px;line-height:1.6;margin:0 0 24px">Hey {{user_name}}, thanks for joining! Your creator dashboard is ready.</p>
<a href="{{login_url}}" style="display:inline-block;padding:12px 28px;background:#d1ff1a;color:#111;font-weight:700;font-size:14px;border-radius:999px;text-decoration:none">Open Dashboard</a>
<p style="font-size:12px;color:#6b6e7b;margin:32px 0 0">Go Virall - The Creator OS</p>
</div>',
'Welcome to Go Virall, {{user_name}}! Open your dashboard: {{login_url}}',
ARRAY['user_name', 'login_url'], 'transactional'),

-- 2. Email Verification
('verify_email', 'Email Verification', 'Verify your email address',
'<div style="max-width:600px;margin:0 auto;font-family:system-ui,sans-serif;background:#111;color:#e2e4ea;padding:40px 32px;border-radius:8px">
<h1 style="font-size:28px;font-weight:700;margin:0 0 16px;color:#d1ff1a">Verify Your Email</h1>
<p style="font-size:15px;line-height:1.6;margin:0 0 24px">Hey {{user_name}}, click below to verify your email address.</p>
<a href="{{verify_url}}" style="display:inline-block;padding:12px 28px;background:#d1ff1a;color:#111;font-weight:700;font-size:14px;border-radius:999px;text-decoration:none">Verify Email</a>
<p style="font-size:12px;color:#6b6e7b;margin:32px 0 0">If you did not create an account, ignore this email.</p>
</div>',
'Verify your email: {{verify_url}}',
ARRAY['user_name', 'verify_url'], 'transactional'),

-- 3. Password Reset
('password_reset', 'Password Reset', 'Reset your Go Virall password',
'<div style="max-width:600px;margin:0 auto;font-family:system-ui,sans-serif;background:#111;color:#e2e4ea;padding:40px 32px;border-radius:8px">
<h1 style="font-size:28px;font-weight:700;margin:0 0 16px;color:#d1ff1a">Password Reset</h1>
<p style="font-size:15px;line-height:1.6;margin:0 0 24px">Hey {{user_name}}, click below to reset your password. This link expires in 1 hour.</p>
<a href="{{reset_url}}" style="display:inline-block;padding:12px 28px;background:#d1ff1a;color:#111;font-weight:700;font-size:14px;border-radius:999px;text-decoration:none">Reset Password</a>
<p style="font-size:12px;color:#6b6e7b;margin:32px 0 0">If you did not request this, ignore this email.</p>
</div>',
'Reset your password: {{reset_url}}',
ARRAY['user_name', 'reset_url'], 'transactional'),

-- 4. Subscription Confirmed
('subscription_confirmed', 'Subscription Confirmed', 'You''re on the {{plan_name}} plan!',
'<div style="max-width:600px;margin:0 auto;font-family:system-ui,sans-serif;background:#111;color:#e2e4ea;padding:40px 32px;border-radius:8px">
<h1 style="font-size:28px;font-weight:700;margin:0 0 16px;color:#d1ff1a">Subscription Confirmed</h1>
<p style="font-size:15px;line-height:1.6;margin:0 0 8px">Hey {{user_name}}, your <strong>{{plan_name}}</strong> subscription is active.</p>
<p style="font-size:15px;line-height:1.6;margin:0 0 24px">Amount: <strong>{{amount}}</strong>/month</p>
<p style="font-size:12px;color:#6b6e7b;margin:32px 0 0">Manage your subscription in Settings > Billing.</p>
</div>',
'Your {{plan_name}} subscription is active. Amount: {{amount}}/month.',
ARRAY['user_name', 'plan_name', 'amount'], 'transactional'),

-- 5. Subscription Cancelled
('subscription_cancelled', 'Subscription Cancelled', 'Your {{plan_name}} subscription has been cancelled',
'<div style="max-width:600px;margin:0 auto;font-family:system-ui,sans-serif;background:#111;color:#e2e4ea;padding:40px 32px;border-radius:8px">
<h1 style="font-size:28px;font-weight:700;margin:0 0 16px;color:#e2e4ea">Subscription Cancelled</h1>
<p style="font-size:15px;line-height:1.6;margin:0 0 8px">Hey {{user_name}}, your <strong>{{plan_name}}</strong> plan has been cancelled.</p>
<p style="font-size:15px;line-height:1.6;margin:0 0 24px">You will have access until <strong>{{end_date}}</strong>.</p>
<p style="font-size:12px;color:#6b6e7b;margin:32px 0 0">You can resubscribe anytime from Settings > Billing.</p>
</div>',
'Your {{plan_name}} plan has been cancelled. Access until {{end_date}}.',
ARRAY['user_name', 'plan_name', 'end_date'], 'transactional'),

-- 6. Deal Created
('deal_created', 'New Deal', 'New deal: {{deal_title}}',
'<div style="max-width:600px;margin:0 auto;font-family:system-ui,sans-serif;background:#111;color:#e2e4ea;padding:40px 32px;border-radius:8px">
<h1 style="font-size:28px;font-weight:700;margin:0 0 16px;color:#d1ff1a">New Deal Created</h1>
<p style="font-size:15px;line-height:1.6;margin:0 0 8px">Hey {{user_name}}, a new deal has been created:</p>
<p style="font-size:18px;font-weight:700;margin:0 0 8px">{{deal_title}}</p>
<p style="font-size:15px;line-height:1.6;margin:0 0 24px">Brand: <strong>{{brand_name}}</strong></p>
<p style="font-size:12px;color:#6b6e7b;margin:32px 0 0">View details in your Revenue dashboard.</p>
</div>',
'New deal created: {{deal_title}} with {{brand_name}}.',
ARRAY['user_name', 'deal_title', 'brand_name'], 'transactional'),

-- 7. Payment Received
('payment_received', 'Payment Received', 'Payment of {{amount}} received',
'<div style="max-width:600px;margin:0 auto;font-family:system-ui,sans-serif;background:#111;color:#e2e4ea;padding:40px 32px;border-radius:8px">
<h1 style="font-size:28px;font-weight:700;margin:0 0 16px;color:#d1ff1a">Payment Received</h1>
<p style="font-size:15px;line-height:1.6;margin:0 0 8px">Hey {{user_name}}, you received a payment of <strong>{{amount}}</strong>.</p>
<p style="font-size:15px;line-height:1.6;margin:0 0 24px">Deal: <strong>{{deal_title}}</strong></p>
<p style="font-size:12px;color:#6b6e7b;margin:32px 0 0">Track all payments in Revenue > Transactions.</p>
</div>',
'Payment received: {{amount}} for {{deal_title}}.',
ARRAY['user_name', 'amount', 'deal_title'], 'transactional'),

-- 8. Weekly Digest
('weekly_digest', 'Weekly Digest', 'Your weekly Go Virall digest',
'<div style="max-width:600px;margin:0 auto;font-family:system-ui,sans-serif;background:#111;color:#e2e4ea;padding:40px 32px;border-radius:8px">
<h1 style="font-size:28px;font-weight:700;margin:0 0 16px;color:#d1ff1a">Weekly Digest</h1>
<p style="font-size:15px;line-height:1.6;margin:0 0 24px">Hey {{user_name}}, here is your weekly summary:</p>
<div style="padding:16px;background:#1a1b20;border-radius:8px;margin:0 0 24px">
<p style="font-size:13px;color:#6b6e7b;margin:0 0 8px">SMO SCORE</p>
<p style="font-size:32px;font-weight:700;margin:0 0 16px;color:#d1ff1a">{{smo_score}}</p>
<p style="font-size:13px;color:#6b6e7b;margin:0 0 4px">TOP POST</p>
<p style="font-size:14px;margin:0 0 16px">{{top_post}}</p>
<p style="font-size:13px;color:#6b6e7b;margin:0 0 4px">GROWTH</p>
<p style="font-size:14px;margin:0">{{growth_pct}}% this week</p>
</div>
<p style="font-size:12px;color:#6b6e7b;margin:0">Go Virall - The Creator OS</p>
</div>',
'Weekly digest: SMO Score {{smo_score}}, Growth {{growth_pct}}%, Top post: {{top_post}}',
ARRAY['user_name', 'smo_score', 'top_post', 'growth_pct'], 'marketing'),

-- 9. New Feature
('new_feature', 'New Feature Announcement', 'New feature: {{feature_name}}',
'<div style="max-width:600px;margin:0 auto;font-family:system-ui,sans-serif;background:#111;color:#e2e4ea;padding:40px 32px;border-radius:8px">
<h1 style="font-size:28px;font-weight:700;margin:0 0 16px;color:#d1ff1a">New Feature</h1>
<p style="font-size:20px;font-weight:600;margin:0 0 12px">{{feature_name}}</p>
<p style="font-size:15px;line-height:1.6;margin:0 0 24px">{{feature_description}}</p>
<p style="font-size:12px;color:#6b6e7b;margin:0">Go Virall - The Creator OS</p>
</div>',
'New feature: {{feature_name}} - {{feature_description}}',
ARRAY['user_name', 'feature_name', 'feature_description'], 'marketing'),

-- 10. System Maintenance
('system_maintenance', 'System Maintenance', 'Scheduled maintenance notification',
'<div style="max-width:600px;margin:0 auto;font-family:system-ui,sans-serif;background:#111;color:#e2e4ea;padding:40px 32px;border-radius:8px">
<h1 style="font-size:28px;font-weight:700;margin:0 0 16px;color:#e2e4ea">Scheduled Maintenance</h1>
<p style="font-size:15px;line-height:1.6;margin:0 0 16px">{{description}}</p>
<div style="padding:16px;background:#1a1b20;border-radius:8px;margin:0 0 24px">
<p style="font-size:13px;color:#6b6e7b;margin:0 0 4px">START</p>
<p style="font-size:14px;font-weight:600;margin:0 0 12px">{{start_time}}</p>
<p style="font-size:13px;color:#6b6e7b;margin:0 0 4px">END</p>
<p style="font-size:14px;font-weight:600;margin:0">{{end_time}}</p>
</div>
<p style="font-size:12px;color:#6b6e7b;margin:0">Go Virall - The Creator OS</p>
</div>',
'Scheduled maintenance: {{description}}. Start: {{start_time}}, End: {{end_time}}',
ARRAY['start_time', 'end_time', 'description'], 'system')

on conflict (key) do nothing;
