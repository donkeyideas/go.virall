-- ============================================================
-- 012 — Seed all platform email templates
-- ============================================================
-- These templates are used by sendTemplateEmail() in src/lib/email.ts.
-- Variables use {{variable_name}} syntax and are interpolated at send time.
-- ============================================================

-- Helper: upsert so this migration is idempotent
-- (won't fail if a template already exists)

INSERT INTO email_templates (name, subject, body_html, variables, is_active) VALUES

-- ────────────────────────────────────────────────────────────
-- 1. WELCOME — sent after signup
-- Variables: name, app_url
-- ────────────────────────────────────────────────────────────
(
  'welcome',
  'Welcome to Go Virall, {{name}}!',
  '<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#0F0A1E;font-family:-apple-system,BlinkMacSystemFont,''Segoe UI'',Roboto,Helvetica,Arial,sans-serif;">
  <div style="display:none;font-size:1px;color:#0F0A1E;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">Your social intelligence journey starts now.</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#0F0A1E;padding:24px 16px;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
        <!-- Header -->
        <tr><td align="center" style="padding:32px 0 24px;">
          <span style="font-size:28px;font-weight:800;color:#F0EDF5;">Go <span style="color:#DC2626;">Virall</span></span>
        </td></tr>
        <!-- Body -->
        <tr><td>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#1A1035;border:1px solid #2D2252;border-radius:12px;">
            <tr><td style="padding:40px;">
              <h1 style="margin:0 0 8px;color:#F0EDF5;font-size:24px;font-weight:700;">Welcome aboard, {{name}}!</h1>
              <p style="margin:0 0 24px;color:#8B8A9E;font-size:15px;line-height:1.6;">
                You''ve just joined the smartest platform for creators. Go Virall gives you AI-powered analytics, content optimization, and growth intelligence — all in one place.
              </p>
              <h3 style="margin:0 0 12px;color:#F0EDF5;font-size:16px;font-weight:600;">Here''s what to do first:</h3>
              <!-- Step 1 -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:16px;">
                <tr>
                  <td style="width:36px;vertical-align:top;padding-top:2px;">
                    <div style="width:28px;height:28px;background-color:#8B5CF6;border-radius:50%;text-align:center;line-height:28px;font-size:14px;font-weight:700;color:#fff;">1</div>
                  </td>
                  <td style="padding-left:12px;">
                    <p style="margin:0 0 2px;font-size:15px;font-weight:600;color:#F0EDF5;">Connect your social accounts</p>
                    <p style="margin:0;font-size:13px;color:#8B8A9E;">Link Instagram, TikTok, YouTube, or any platform you use.</p>
                  </td>
                </tr>
              </table>
              <!-- Step 2 -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:16px;">
                <tr>
                  <td style="width:36px;vertical-align:top;padding-top:2px;">
                    <div style="width:28px;height:28px;background-color:#8B5CF6;border-radius:50%;text-align:center;line-height:28px;font-size:14px;font-weight:700;color:#fff;">2</div>
                  </td>
                  <td style="padding-left:12px;">
                    <p style="margin:0 0 2px;font-size:15px;font-weight:600;color:#F0EDF5;">Run your first analysis</p>
                    <p style="margin:0;font-size:13px;color:#8B8A9E;">Get AI-powered insights about your audience, content, and growth.</p>
                  </td>
                </tr>
              </table>
              <!-- Step 3 -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
                <tr>
                  <td style="width:36px;vertical-align:top;padding-top:2px;">
                    <div style="width:28px;height:28px;background-color:#8B5CF6;border-radius:50%;text-align:center;line-height:28px;font-size:14px;font-weight:700;color:#fff;">3</div>
                  </td>
                  <td style="padding-left:12px;">
                    <p style="margin:0 0 2px;font-size:15px;font-weight:600;color:#F0EDF5;">Explore your dashboard</p>
                    <p style="margin:0;font-size:13px;color:#8B8A9E;">Track performance, discover trends, and optimize your strategy.</p>
                  </td>
                </tr>
              </table>
              <!-- CTA -->
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                <tr><td align="center">
                  <a href="{{app_url}}/dashboard" target="_blank" style="display:inline-block;padding:14px 32px;background-color:#DC2626;color:#fff;font-size:15px;font-weight:700;text-decoration:none;border-radius:8px;">Go to Dashboard</a>
                </td></tr>
              </table>
            </td></tr>
          </table>
        </td></tr>
        <!-- Footer -->
        <tr><td style="padding:32px 0 16px;text-align:center;border-top:1px solid #2D2252;margin-top:24px;">
          <p style="margin:0 0 8px;font-size:13px;color:#8B8A9E;">Go Virall &mdash; Social Intelligence for Creators</p>
          <p style="margin:0;font-size:11px;color:#8B8A9E;opacity:0.7;">&copy; 2026 Go Virall. All rights reserved.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>',
  ARRAY['name', 'app_url'],
  true
),

-- ────────────────────────────────────────────────────────────
-- 2. TEAM INVITE — sent when a brand invites a team member
-- Variables: inviter_name, org_name, invite_url, role
-- ────────────────────────────────────────────────────────────
(
  'team_invite',
  '{{inviter_name}} invited you to join {{org_name}} on Go Virall',
  '<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#0F0A1E;font-family:-apple-system,BlinkMacSystemFont,''Segoe UI'',Roboto,Helvetica,Arial,sans-serif;">
  <div style="display:none;font-size:1px;color:#0F0A1E;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">You have been invited to collaborate on Go Virall.</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#0F0A1E;padding:24px 16px;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
        <tr><td align="center" style="padding:32px 0 24px;">
          <span style="font-size:28px;font-weight:800;color:#F0EDF5;">Go <span style="color:#DC2626;">Virall</span></span>
        </td></tr>
        <tr><td>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#1A1035;border:1px solid #2D2252;border-radius:12px;">
            <tr><td style="padding:40px;">
              <h1 style="margin:0 0 8px;color:#F0EDF5;font-size:22px;font-weight:700;">You''re invited to join a team</h1>
              <p style="margin:0 0 24px;color:#8B8A9E;font-size:15px;line-height:1.6;">
                <strong style="color:#F0EDF5;">{{inviter_name}}</strong> has invited you to collaborate on
                <strong style="color:#F0EDF5;">{{org_name}}</strong> as a <strong style="color:#8B5CF6;">{{role}}</strong>.
              </p>
              <!-- CTA -->
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:24px;">
                <tr><td align="center">
                  <a href="{{invite_url}}" target="_blank" style="display:inline-block;padding:14px 32px;background-color:#8B5CF6;color:#fff;font-size:15px;font-weight:700;text-decoration:none;border-radius:8px;">Accept Invitation</a>
                </td></tr>
              </table>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td style="border-top:1px solid #2D2252;padding-top:16px;">
                <p style="margin:0 0 8px;color:#8B8A9E;font-size:13px;">This invitation expires in 7 days. If you didn''t expect this email, you can safely ignore it.</p>
                <p style="margin:0;color:#8B8A9E;font-size:12px;">Button not working? Copy this link:<br>
                  <a href="{{invite_url}}" style="color:#818CF8;word-break:break-all;font-size:12px;">{{invite_url}}</a>
                </p>
              </td></tr></table>
            </td></tr>
          </table>
        </td></tr>
        <tr><td style="padding:32px 0 16px;text-align:center;">
          <p style="margin:0 0 8px;font-size:13px;color:#8B8A9E;">Go Virall &mdash; Social Intelligence for Creators</p>
          <p style="margin:0;font-size:11px;color:#8B8A9E;opacity:0.7;">&copy; 2026 Go Virall. All rights reserved.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>',
  ARRAY['inviter_name', 'org_name', 'invite_url', 'role'],
  true
),

-- ────────────────────────────────────────────────────────────
-- 3. PASSWORD RESET — sent when user requests password reset
-- Variables: name, reset_url
-- ────────────────────────────────────────────────────────────
(
  'password_reset',
  'Reset your Go Virall password',
  '<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#0F0A1E;font-family:-apple-system,BlinkMacSystemFont,''Segoe UI'',Roboto,Helvetica,Arial,sans-serif;">
  <div style="display:none;font-size:1px;color:#0F0A1E;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">Reset your password to regain access.</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#0F0A1E;padding:24px 16px;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
        <tr><td align="center" style="padding:32px 0 24px;">
          <span style="font-size:28px;font-weight:800;color:#F0EDF5;">Go <span style="color:#DC2626;">Virall</span></span>
        </td></tr>
        <tr><td>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#1A1035;border:1px solid #2D2252;border-radius:12px;">
            <tr><td style="padding:40px;">
              <h1 style="margin:0 0 8px;color:#F0EDF5;font-size:22px;font-weight:700;">Reset your password</h1>
              <p style="margin:0 0 24px;color:#8B8A9E;font-size:15px;line-height:1.6;">
                Hi {{name}}, we received a request to reset your password. Click the button below to create a new one.
              </p>
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:24px;">
                <tr><td align="center">
                  <a href="{{reset_url}}" target="_blank" style="display:inline-block;padding:14px 32px;background-color:#DC2626;color:#fff;font-size:15px;font-weight:700;text-decoration:none;border-radius:8px;">Reset Password</a>
                </td></tr>
              </table>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td style="border-top:1px solid #2D2252;padding-top:16px;">
                <p style="margin:0 0 8px;color:#8B8A9E;font-size:13px;">This link expires in 1 hour. If you didn''t request a password reset, you can safely ignore this email.</p>
                <p style="margin:0;color:#8B8A9E;font-size:12px;">Button not working? Copy this link:<br>
                  <a href="{{reset_url}}" style="color:#818CF8;word-break:break-all;font-size:12px;">{{reset_url}}</a>
                </p>
              </td></tr></table>
            </td></tr>
          </table>
        </td></tr>
        <tr><td style="padding:32px 0 16px;text-align:center;">
          <p style="margin:0 0 8px;font-size:13px;color:#8B8A9E;">Go Virall &mdash; Social Intelligence for Creators</p>
          <p style="margin:0;font-size:11px;color:#8B8A9E;opacity:0.7;">&copy; 2026 Go Virall. All rights reserved.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>',
  ARRAY['name', 'reset_url'],
  true
),

-- ────────────────────────────────────────────────────────────
-- 4. EMAIL VERIFICATION — confirm email address
-- Variables: name, verification_url
-- ────────────────────────────────────────────────────────────
(
  'email_verification',
  'Verify your email — Go Virall',
  '<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#0F0A1E;font-family:-apple-system,BlinkMacSystemFont,''Segoe UI'',Roboto,Helvetica,Arial,sans-serif;">
  <div style="display:none;font-size:1px;color:#0F0A1E;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">Confirm your email to get started.</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#0F0A1E;padding:24px 16px;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
        <tr><td align="center" style="padding:32px 0 24px;">
          <span style="font-size:28px;font-weight:800;color:#F0EDF5;">Go <span style="color:#DC2626;">Virall</span></span>
        </td></tr>
        <tr><td>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#1A1035;border:1px solid #2D2252;border-radius:12px;">
            <tr><td style="padding:40px;text-align:center;">
              <h1 style="margin:0 0 8px;color:#F0EDF5;font-size:22px;font-weight:700;">Verify your email</h1>
              <p style="margin:0 0 24px;color:#8B8A9E;font-size:15px;line-height:1.6;">
                Hi {{name}}, please confirm your email address to activate your Go Virall account.
              </p>
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:24px;">
                <tr><td align="center">
                  <a href="{{verification_url}}" target="_blank" style="display:inline-block;padding:14px 32px;background-color:#22C55E;color:#fff;font-size:15px;font-weight:700;text-decoration:none;border-radius:8px;">Verify Email</a>
                </td></tr>
              </table>
              <p style="margin:0;color:#8B8A9E;font-size:13px;">This link expires in 24 hours.</p>
            </td></tr>
          </table>
        </td></tr>
        <tr><td style="padding:32px 0 16px;text-align:center;">
          <p style="margin:0 0 8px;font-size:13px;color:#8B8A9E;">Go Virall &mdash; Social Intelligence for Creators</p>
          <p style="margin:0;font-size:11px;color:#8B8A9E;opacity:0.7;">&copy; 2026 Go Virall. All rights reserved.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>',
  ARRAY['name', 'verification_url'],
  true
),

-- ────────────────────────────────────────────────────────────
-- 5. DAILY DIGEST — daily activity summary
-- Variables: name, app_url, date, new_followers, engagement_rate, top_post_title, top_post_likes, notifications_count
-- ────────────────────────────────────────────────────────────
(
  'daily_digest',
  'Your daily digest for {{date}} — Go Virall',
  '<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#0F0A1E;font-family:-apple-system,BlinkMacSystemFont,''Segoe UI'',Roboto,Helvetica,Arial,sans-serif;">
  <div style="display:none;font-size:1px;color:#0F0A1E;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">Here''s what happened yesterday on your profiles.</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#0F0A1E;padding:24px 16px;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
        <tr><td align="center" style="padding:32px 0 24px;">
          <span style="font-size:28px;font-weight:800;color:#F0EDF5;">Go <span style="color:#DC2626;">Virall</span></span>
        </td></tr>
        <tr><td>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#1A1035;border:1px solid #2D2252;border-radius:12px;">
            <tr><td style="padding:40px;">
              <h1 style="margin:0 0 4px;color:#F0EDF5;font-size:22px;font-weight:700;">Daily Digest</h1>
              <p style="margin:0 0 24px;color:#8B8A9E;font-size:14px;">{{date}}</p>
              <p style="margin:0 0 20px;color:#8B8A9E;font-size:15px;line-height:1.6;">Hi {{name}}, here''s a quick snapshot of your activity.</p>
              <!-- Stats Row -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="8" style="margin-bottom:20px;">
                <tr>
                  <td style="width:50%;padding:16px;background-color:#0F0A1E;border:1px solid #2D2252;border-radius:8px;text-align:center;">
                    <div style="font-size:11px;font-weight:600;color:#8B8A9E;text-transform:uppercase;letter-spacing:0.5px;">New Followers</div>
                    <div style="font-size:24px;font-weight:700;color:#22C55E;margin-top:4px;">+{{new_followers}}</div>
                  </td>
                  <td style="width:50%;padding:16px;background-color:#0F0A1E;border:1px solid #2D2252;border-radius:8px;text-align:center;">
                    <div style="font-size:11px;font-weight:600;color:#8B8A9E;text-transform:uppercase;letter-spacing:0.5px;">Engagement Rate</div>
                    <div style="font-size:24px;font-weight:700;color:#8B5CF6;margin-top:4px;">{{engagement_rate}}</div>
                  </td>
                </tr>
              </table>
              <!-- Top Post -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#0F0A1E;border:1px solid #2D2252;border-radius:8px;margin-bottom:20px;">
                <tr><td style="padding:16px;">
                  <div style="font-size:11px;font-weight:600;color:#8B8A9E;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px;">Top Performing Post</div>
                  <p style="margin:0 0 4px;font-size:14px;color:#F0EDF5;font-weight:600;">{{top_post_title}}</p>
                  <p style="margin:0;font-size:13px;color:#DC2626;font-weight:600;">&hearts; {{top_post_likes}} likes</p>
                </td></tr>
              </table>
              <p style="margin:0 0 20px;color:#8B8A9E;font-size:14px;">You have <strong style="color:#F0EDF5;">{{notifications_count}}</strong> new notifications waiting.</p>
              <!-- CTA -->
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                <tr><td align="center">
                  <a href="{{app_url}}/dashboard" target="_blank" style="display:inline-block;padding:14px 32px;background-color:#DC2626;color:#fff;font-size:15px;font-weight:700;text-decoration:none;border-radius:8px;">View Dashboard</a>
                </td></tr>
              </table>
            </td></tr>
          </table>
        </td></tr>
        <tr><td style="padding:32px 0 16px;text-align:center;">
          <p style="margin:0 0 8px;font-size:13px;color:#8B8A9E;">Go Virall &mdash; Social Intelligence for Creators</p>
          <p style="margin:0 0 8px;font-size:12px;color:#8B8A9E;"><a href="{{app_url}}/dashboard/settings" style="color:#818CF8;text-decoration:underline;">Manage email preferences</a></p>
          <p style="margin:0;font-size:11px;color:#8B8A9E;opacity:0.7;">&copy; 2026 Go Virall. All rights reserved.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>',
  ARRAY['name', 'app_url', 'date', 'new_followers', 'engagement_rate', 'top_post_title', 'top_post_likes', 'notifications_count'],
  true
),

-- ────────────────────────────────────────────────────────────
-- 6. BRAND DEAL UPDATE — deal status change notification
-- Variables: name, app_url, brand_name, deal_title, status, message
-- ────────────────────────────────────────────────────────────
(
  'brand_deal_update',
  'Deal update: {{deal_title}} — {{status}}',
  '<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#0F0A1E;font-family:-apple-system,BlinkMacSystemFont,''Segoe UI'',Roboto,Helvetica,Arial,sans-serif;">
  <div style="display:none;font-size:1px;color:#0F0A1E;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">There''s an update on your deal with {{brand_name}}.</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#0F0A1E;padding:24px 16px;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
        <tr><td align="center" style="padding:32px 0 24px;">
          <span style="font-size:28px;font-weight:800;color:#F0EDF5;">Go <span style="color:#DC2626;">Virall</span></span>
        </td></tr>
        <tr><td>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#1A1035;border:1px solid #2D2252;border-radius:12px;">
            <tr><td style="padding:40px;">
              <h1 style="margin:0 0 8px;color:#F0EDF5;font-size:22px;font-weight:700;">Deal Update</h1>
              <p style="margin:0 0 20px;color:#8B8A9E;font-size:15px;line-height:1.6;">Hi {{name}}, there''s a status change on one of your deals.</p>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#0F0A1E;border:1px solid #2D2252;border-radius:8px;margin-bottom:20px;">
                <tr><td style="padding:20px;">
                  <div style="font-size:11px;font-weight:600;color:#8B8A9E;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">Brand</div>
                  <div style="font-size:16px;font-weight:700;color:#F0EDF5;margin-bottom:12px;">{{brand_name}}</div>
                  <div style="font-size:11px;font-weight:600;color:#8B8A9E;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">Deal</div>
                  <div style="font-size:16px;font-weight:600;color:#F0EDF5;margin-bottom:12px;">{{deal_title}}</div>
                  <div style="font-size:11px;font-weight:600;color:#8B8A9E;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">Status</div>
                  <span style="display:inline-block;padding:4px 12px;background-color:#8B5CF6;color:#fff;font-size:13px;font-weight:600;border-radius:6px;">{{status}}</span>
                </td></tr>
              </table>
              <p style="margin:0 0 20px;color:#8B8A9E;font-size:14px;line-height:1.6;">{{message}}</p>
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                <tr><td align="center">
                  <a href="{{app_url}}/dashboard/deals" target="_blank" style="display:inline-block;padding:14px 32px;background-color:#DC2626;color:#fff;font-size:15px;font-weight:700;text-decoration:none;border-radius:8px;">View Deal</a>
                </td></tr>
              </table>
            </td></tr>
          </table>
        </td></tr>
        <tr><td style="padding:32px 0 16px;text-align:center;">
          <p style="margin:0 0 8px;font-size:13px;color:#8B8A9E;">Go Virall &mdash; Social Intelligence for Creators</p>
          <p style="margin:0 0 8px;font-size:12px;color:#8B8A9E;"><a href="{{app_url}}/dashboard/settings" style="color:#818CF8;text-decoration:underline;">Manage email preferences</a></p>
          <p style="margin:0;font-size:11px;color:#8B8A9E;opacity:0.7;">&copy; 2026 Go Virall. All rights reserved.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>',
  ARRAY['name', 'app_url', 'brand_name', 'deal_title', 'status', 'message'],
  true
),

-- ────────────────────────────────────────────────────────────
-- 7. GROWTH MILESTONE — follower/engagement milestone achieved
-- Variables: name, app_url, milestone, metric, value, message
-- ────────────────────────────────────────────────────────────
(
  'growth_milestone',
  'Congratulations! You hit {{milestone}} — Go Virall',
  '<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#0F0A1E;font-family:-apple-system,BlinkMacSystemFont,''Segoe UI'',Roboto,Helvetica,Arial,sans-serif;">
  <div style="display:none;font-size:1px;color:#0F0A1E;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">You just reached a new milestone! Keep going.</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#0F0A1E;padding:24px 16px;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
        <tr><td align="center" style="padding:32px 0 24px;">
          <span style="font-size:28px;font-weight:800;color:#F0EDF5;">Go <span style="color:#DC2626;">Virall</span></span>
        </td></tr>
        <tr><td>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#1A1035;border:1px solid #2D2252;border-radius:12px;">
            <tr><td style="padding:40px;text-align:center;">
              <div style="font-size:48px;margin-bottom:8px;">&#127881;</div>
              <h1 style="margin:0 0 8px;color:#F0EDF5;font-size:24px;font-weight:700;">Milestone reached!</h1>
              <p style="margin:0 0 24px;color:#8B8A9E;font-size:15px;line-height:1.6;">
                Congrats {{name}}, you just hit a major milestone.
              </p>
              <!-- Milestone Card -->
              <table role="presentation" width="280" cellpadding="0" cellspacing="0" style="margin:0 auto 24px;background-color:#0F0A1E;border:2px solid #8B5CF6;border-radius:12px;">
                <tr><td style="padding:24px;text-align:center;">
                  <div style="font-size:12px;font-weight:600;color:#8B8A9E;text-transform:uppercase;letter-spacing:0.5px;">{{metric}}</div>
                  <div style="font-size:36px;font-weight:800;color:#22C55E;margin:8px 0;">{{value}}</div>
                  <div style="font-size:14px;font-weight:600;color:#8B5CF6;">{{milestone}}</div>
                </td></tr>
              </table>
              <p style="margin:0 0 24px;color:#8B8A9E;font-size:14px;line-height:1.6;">{{message}}</p>
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                <tr><td align="center">
                  <a href="{{app_url}}/dashboard/analytics" target="_blank" style="display:inline-block;padding:14px 32px;background-color:#DC2626;color:#fff;font-size:15px;font-weight:700;text-decoration:none;border-radius:8px;">View Analytics</a>
                </td></tr>
              </table>
            </td></tr>
          </table>
        </td></tr>
        <tr><td style="padding:32px 0 16px;text-align:center;">
          <p style="margin:0 0 8px;font-size:13px;color:#8B8A9E;">Go Virall &mdash; Social Intelligence for Creators</p>
          <p style="margin:0 0 8px;font-size:12px;color:#8B8A9E;"><a href="{{app_url}}/dashboard/settings" style="color:#818CF8;text-decoration:underline;">Manage email preferences</a></p>
          <p style="margin:0;font-size:11px;color:#8B8A9E;opacity:0.7;">&copy; 2026 Go Virall. All rights reserved.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>',
  ARRAY['name', 'app_url', 'milestone', 'metric', 'value', 'message'],
  true
),

-- ────────────────────────────────────────────────────────────
-- 8. COLLAB OPPORTUNITY — new collaboration match
-- Variables: name, app_url, brand_name, opportunity_title, match_score, description
-- ────────────────────────────────────────────────────────────
(
  'collab_opportunity',
  'New opportunity: {{brand_name}} wants to collaborate',
  '<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#0F0A1E;font-family:-apple-system,BlinkMacSystemFont,''Segoe UI'',Roboto,Helvetica,Arial,sans-serif;">
  <div style="display:none;font-size:1px;color:#0F0A1E;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">A brand wants to work with you. Check out the opportunity.</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#0F0A1E;padding:24px 16px;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
        <tr><td align="center" style="padding:32px 0 24px;">
          <span style="font-size:28px;font-weight:800;color:#F0EDF5;">Go <span style="color:#DC2626;">Virall</span></span>
        </td></tr>
        <tr><td>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#1A1035;border:1px solid #2D2252;border-radius:12px;">
            <tr><td style="padding:40px;">
              <h1 style="margin:0 0 8px;color:#F0EDF5;font-size:22px;font-weight:700;">New Collaboration Opportunity</h1>
              <p style="margin:0 0 20px;color:#8B8A9E;font-size:15px;line-height:1.6;">Hi {{name}}, we found a brand that matches your profile.</p>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#0F0A1E;border:1px solid #2D2252;border-radius:8px;margin-bottom:20px;">
                <tr><td style="padding:20px;">
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td style="vertical-align:top;">
                        <div style="font-size:18px;font-weight:700;color:#F0EDF5;margin-bottom:4px;">{{brand_name}}</div>
                        <div style="font-size:15px;font-weight:600;color:#8B5CF6;margin-bottom:8px;">{{opportunity_title}}</div>
                        <p style="margin:0;font-size:13px;color:#8B8A9E;line-height:1.5;">{{description}}</p>
                      </td>
                      <td style="width:80px;vertical-align:top;text-align:center;">
                        <div style="width:56px;height:56px;background-color:#8B5CF6;border-radius:50%;text-align:center;line-height:56px;font-size:16px;font-weight:800;color:#fff;margin:0 auto;">{{match_score}}%</div>
                        <div style="font-size:10px;color:#8B8A9E;margin-top:4px;text-transform:uppercase;font-weight:600;">Match</div>
                      </td>
                    </tr>
                  </table>
                </td></tr>
              </table>
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                <tr><td align="center">
                  <a href="{{app_url}}/dashboard/opportunities" target="_blank" style="display:inline-block;padding:14px 32px;background-color:#8B5CF6;color:#fff;font-size:15px;font-weight:700;text-decoration:none;border-radius:8px;">View Opportunity</a>
                </td></tr>
              </table>
            </td></tr>
          </table>
        </td></tr>
        <tr><td style="padding:32px 0 16px;text-align:center;">
          <p style="margin:0 0 8px;font-size:13px;color:#8B8A9E;">Go Virall &mdash; Social Intelligence for Creators</p>
          <p style="margin:0 0 8px;font-size:12px;color:#8B8A9E;"><a href="{{app_url}}/dashboard/settings" style="color:#818CF8;text-decoration:underline;">Manage email preferences</a></p>
          <p style="margin:0;font-size:11px;color:#8B8A9E;opacity:0.7;">&copy; 2026 Go Virall. All rights reserved.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>',
  ARRAY['name', 'app_url', 'brand_name', 'opportunity_title', 'match_score', 'description'],
  true
),

-- ────────────────────────────────────────────────────────────
-- 9. DEAL ROOM MESSAGE — new message in deal room
-- Variables: name, app_url, sender_name, deal_title, message_preview
-- ────────────────────────────────────────────────────────────
(
  'deal_room_message',
  '{{sender_name}} sent you a message about "{{deal_title}}"',
  '<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#0F0A1E;font-family:-apple-system,BlinkMacSystemFont,''Segoe UI'',Roboto,Helvetica,Arial,sans-serif;">
  <div style="display:none;font-size:1px;color:#0F0A1E;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">You have a new message in your deal room.</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#0F0A1E;padding:24px 16px;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
        <tr><td align="center" style="padding:32px 0 24px;">
          <span style="font-size:28px;font-weight:800;color:#F0EDF5;">Go <span style="color:#DC2626;">Virall</span></span>
        </td></tr>
        <tr><td>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#1A1035;border:1px solid #2D2252;border-radius:12px;">
            <tr><td style="padding:40px;">
              <h1 style="margin:0 0 8px;color:#F0EDF5;font-size:22px;font-weight:700;">New Message</h1>
              <p style="margin:0 0 20px;color:#8B8A9E;font-size:15px;line-height:1.6;">Hi {{name}}, you have a new message regarding a deal.</p>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#0F0A1E;border:1px solid #2D2252;border-radius:8px;margin-bottom:20px;">
                <tr><td style="padding:20px;">
                  <div style="font-size:11px;font-weight:600;color:#8B8A9E;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">Deal</div>
                  <div style="font-size:15px;font-weight:600;color:#8B5CF6;margin-bottom:16px;">{{deal_title}}</div>
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td style="width:36px;vertical-align:top;">
                        <div style="width:32px;height:32px;background-color:#8B5CF6;border-radius:50%;text-align:center;line-height:32px;font-size:14px;font-weight:700;color:#fff;">&#9993;</div>
                      </td>
                      <td style="padding-left:12px;vertical-align:top;">
                        <div style="font-size:14px;font-weight:600;color:#F0EDF5;margin-bottom:4px;">{{sender_name}}</div>
                        <p style="margin:0;font-size:14px;color:#8B8A9E;line-height:1.5;font-style:italic;">"{{message_preview}}"</p>
                      </td>
                    </tr>
                  </table>
                </td></tr>
              </table>
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                <tr><td align="center">
                  <a href="{{app_url}}/dashboard/messages" target="_blank" style="display:inline-block;padding:14px 32px;background-color:#DC2626;color:#fff;font-size:15px;font-weight:700;text-decoration:none;border-radius:8px;">Reply Now</a>
                </td></tr>
              </table>
            </td></tr>
          </table>
        </td></tr>
        <tr><td style="padding:32px 0 16px;text-align:center;">
          <p style="margin:0 0 8px;font-size:13px;color:#8B8A9E;">Go Virall &mdash; Social Intelligence for Creators</p>
          <p style="margin:0 0 8px;font-size:12px;color:#8B8A9E;"><a href="{{app_url}}/dashboard/settings" style="color:#818CF8;text-decoration:underline;">Manage email preferences</a></p>
          <p style="margin:0;font-size:11px;color:#8B8A9E;opacity:0.7;">&copy; 2026 Go Virall. All rights reserved.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>',
  ARRAY['name', 'app_url', 'sender_name', 'deal_title', 'message_preview'],
  true
),

-- ────────────────────────────────────────────────────────────
-- 10. CAMPAIGN REMINDER — upcoming campaign deadline
-- Variables: name, app_url, campaign_name, brand_name, due_date, days_remaining
-- ────────────────────────────────────────────────────────────
(
  'campaign_reminder',
  'Reminder: "{{campaign_name}}" is due in {{days_remaining}} days',
  '<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#0F0A1E;font-family:-apple-system,BlinkMacSystemFont,''Segoe UI'',Roboto,Helvetica,Arial,sans-serif;">
  <div style="display:none;font-size:1px;color:#0F0A1E;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">Your campaign deadline is approaching. Don''t miss it.</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#0F0A1E;padding:24px 16px;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
        <tr><td align="center" style="padding:32px 0 24px;">
          <span style="font-size:28px;font-weight:800;color:#F0EDF5;">Go <span style="color:#DC2626;">Virall</span></span>
        </td></tr>
        <tr><td>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#1A1035;border:1px solid #2D2252;border-radius:12px;">
            <tr><td style="padding:40px;">
              <h1 style="margin:0 0 8px;color:#F0EDF5;font-size:22px;font-weight:700;">&#9200; Campaign Reminder</h1>
              <p style="margin:0 0 20px;color:#8B8A9E;font-size:15px;line-height:1.6;">Hi {{name}}, a campaign deadline is coming up.</p>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#0F0A1E;border:1px solid #2D2252;border-radius:8px;margin-bottom:20px;">
                <tr><td style="padding:20px;">
                  <div style="font-size:11px;font-weight:600;color:#8B8A9E;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">Campaign</div>
                  <div style="font-size:16px;font-weight:700;color:#F0EDF5;margin-bottom:12px;">{{campaign_name}}</div>
                  <div style="font-size:11px;font-weight:600;color:#8B8A9E;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">Brand</div>
                  <div style="font-size:15px;font-weight:600;color:#F0EDF5;margin-bottom:12px;">{{brand_name}}</div>
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td style="width:50%;">
                        <div style="font-size:11px;font-weight:600;color:#8B8A9E;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">Due Date</div>
                        <div style="font-size:15px;font-weight:600;color:#F0EDF5;">{{due_date}}</div>
                      </td>
                      <td style="width:50%;">
                        <div style="font-size:11px;font-weight:600;color:#8B8A9E;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">Days Left</div>
                        <div style="font-size:24px;font-weight:800;color:#FACC15;">{{days_remaining}}</div>
                      </td>
                    </tr>
                  </table>
                </td></tr>
              </table>
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                <tr><td align="center">
                  <a href="{{app_url}}/dashboard/deals" target="_blank" style="display:inline-block;padding:14px 32px;background-color:#DC2626;color:#fff;font-size:15px;font-weight:700;text-decoration:none;border-radius:8px;">View Campaign</a>
                </td></tr>
              </table>
            </td></tr>
          </table>
        </td></tr>
        <tr><td style="padding:32px 0 16px;text-align:center;">
          <p style="margin:0 0 8px;font-size:13px;color:#8B8A9E;">Go Virall &mdash; Social Intelligence for Creators</p>
          <p style="margin:0 0 8px;font-size:12px;color:#8B8A9E;"><a href="{{app_url}}/dashboard/settings" style="color:#818CF8;text-decoration:underline;">Manage email preferences</a></p>
          <p style="margin:0;font-size:11px;color:#8B8A9E;opacity:0.7;">&copy; 2026 Go Virall. All rights reserved.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>',
  ARRAY['name', 'app_url', 'campaign_name', 'brand_name', 'due_date', 'days_remaining'],
  true
),

-- ────────────────────────────────────────────────────────────
-- 11. AI ANALYSIS COMPLETE — AI analysis finished
-- Variables: name, app_url, analysis_type, profile_name, platform, summary
-- ────────────────────────────────────────────────────────────
(
  'ai_analysis_complete',
  'Your {{analysis_type}} analysis is ready — Go Virall',
  '<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#0F0A1E;font-family:-apple-system,BlinkMacSystemFont,''Segoe UI'',Roboto,Helvetica,Arial,sans-serif;">
  <div style="display:none;font-size:1px;color:#0F0A1E;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">Your AI analysis has finished processing. View the results.</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#0F0A1E;padding:24px 16px;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
        <tr><td align="center" style="padding:32px 0 24px;">
          <span style="font-size:28px;font-weight:800;color:#F0EDF5;">Go <span style="color:#DC2626;">Virall</span></span>
        </td></tr>
        <tr><td>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#1A1035;border:1px solid #2D2252;border-radius:12px;">
            <tr><td style="padding:40px;">
              <h1 style="margin:0 0 8px;color:#F0EDF5;font-size:22px;font-weight:700;">&#9989; Analysis Complete</h1>
              <p style="margin:0 0 20px;color:#8B8A9E;font-size:15px;line-height:1.6;">Hi {{name}}, your AI analysis has finished processing.</p>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#0F0A1E;border:1px solid #2D2252;border-radius:8px;margin-bottom:20px;">
                <tr><td style="padding:20px;">
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td style="width:50%;">
                        <div style="font-size:11px;font-weight:600;color:#8B8A9E;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">Analysis Type</div>
                        <div style="font-size:15px;font-weight:600;color:#8B5CF6;">{{analysis_type}}</div>
                      </td>
                      <td style="width:50%;">
                        <div style="font-size:11px;font-weight:600;color:#8B8A9E;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">Profile</div>
                        <div style="font-size:15px;font-weight:600;color:#F0EDF5;">{{profile_name}}</div>
                      </td>
                    </tr>
                  </table>
                  <div style="margin-top:12px;font-size:11px;font-weight:600;color:#8B8A9E;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">Platform</div>
                  <span style="display:inline-block;padding:3px 10px;background-color:#8B5CF6;color:#fff;font-size:11px;font-weight:700;border-radius:4px;text-transform:uppercase;">{{platform}}</span>
                </td></tr>
              </table>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#0F0A1E;border-left:3px solid #8B5CF6;border-radius:4px;margin-bottom:20px;">
                <tr><td style="padding:16px 20px;">
                  <div style="font-size:11px;font-weight:600;color:#8B8A9E;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px;">Key Insight</div>
                  <p style="margin:0;font-size:14px;color:#F0EDF5;line-height:1.6;">{{summary}}</p>
                </td></tr>
              </table>
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                <tr><td align="center">
                  <a href="{{app_url}}/dashboard/analytics" target="_blank" style="display:inline-block;padding:14px 32px;background-color:#DC2626;color:#fff;font-size:15px;font-weight:700;text-decoration:none;border-radius:8px;">View Full Analysis</a>
                </td></tr>
              </table>
            </td></tr>
          </table>
        </td></tr>
        <tr><td style="padding:32px 0 16px;text-align:center;">
          <p style="margin:0 0 8px;font-size:13px;color:#8B8A9E;">Go Virall &mdash; Social Intelligence for Creators</p>
          <p style="margin:0 0 8px;font-size:12px;color:#8B8A9E;"><a href="{{app_url}}/dashboard/settings" style="color:#818CF8;text-decoration:underline;">Manage email preferences</a></p>
          <p style="margin:0;font-size:11px;color:#8B8A9E;opacity:0.7;">&copy; 2026 Go Virall. All rights reserved.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>',
  ARRAY['name', 'app_url', 'analysis_type', 'profile_name', 'platform', 'summary'],
  true
),

-- ────────────────────────────────────────────────────────────
-- 12. MARKETING UPDATE — platform feature / marketing announcement
-- Variables: name, app_url, headline, body, cta_text, cta_url
-- ────────────────────────────────────────────────────────────
(
  'marketing_update',
  '{{headline}} — Go Virall',
  '<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#0F0A1E;font-family:-apple-system,BlinkMacSystemFont,''Segoe UI'',Roboto,Helvetica,Arial,sans-serif;">
  <div style="display:none;font-size:1px;color:#0F0A1E;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">{{headline}}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#0F0A1E;padding:24px 16px;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
        <tr><td align="center" style="padding:32px 0 24px;">
          <span style="font-size:28px;font-weight:800;color:#F0EDF5;">Go <span style="color:#DC2626;">Virall</span></span>
        </td></tr>
        <tr><td>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#1A1035;border:1px solid #2D2252;border-radius:12px;">
            <tr><td style="padding:40px;">
              <h1 style="margin:0 0 16px;color:#F0EDF5;font-size:24px;font-weight:700;">{{headline}}</h1>
              <p style="margin:0 0 24px;color:#8B8A9E;font-size:15px;line-height:1.7;">Hi {{name}},</p>
              <p style="margin:0 0 24px;color:#8B8A9E;font-size:15px;line-height:1.7;">{{body}}</p>
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                <tr><td align="center">
                  <a href="{{cta_url}}" target="_blank" style="display:inline-block;padding:14px 32px;background-color:#DC2626;color:#fff;font-size:15px;font-weight:700;text-decoration:none;border-radius:8px;">{{cta_text}}</a>
                </td></tr>
              </table>
            </td></tr>
          </table>
        </td></tr>
        <tr><td style="padding:32px 0 16px;text-align:center;">
          <p style="margin:0 0 8px;font-size:13px;color:#8B8A9E;">Go Virall &mdash; Social Intelligence for Creators</p>
          <p style="margin:0 0 8px;font-size:12px;color:#8B8A9E;"><a href="{{app_url}}/dashboard/settings" style="color:#818CF8;text-decoration:underline;">Unsubscribe from marketing emails</a></p>
          <p style="margin:0;font-size:11px;color:#8B8A9E;opacity:0.7;">&copy; 2026 Go Virall. All rights reserved.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>',
  ARRAY['name', 'app_url', 'headline', 'body', 'cta_text', 'cta_url'],
  true
),

-- ────────────────────────────────────────────────────────────
-- 13. SUBSCRIPTION CONFIRMED — new plan activated
-- Variables: name, app_url, plan_name, price, billing_cycle, features
-- ────────────────────────────────────────────────────────────
(
  'subscription_confirmed',
  'Your {{plan_name}} plan is active — Go Virall',
  '<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#0F0A1E;font-family:-apple-system,BlinkMacSystemFont,''Segoe UI'',Roboto,Helvetica,Arial,sans-serif;">
  <div style="display:none;font-size:1px;color:#0F0A1E;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">Your subscription is confirmed. Welcome to {{plan_name}}.</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#0F0A1E;padding:24px 16px;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
        <tr><td align="center" style="padding:32px 0 24px;">
          <span style="font-size:28px;font-weight:800;color:#F0EDF5;">Go <span style="color:#DC2626;">Virall</span></span>
        </td></tr>
        <tr><td>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#1A1035;border:1px solid #2D2252;border-radius:12px;">
            <tr><td style="padding:40px;text-align:center;">
              <div style="font-size:48px;margin-bottom:8px;">&#127775;</div>
              <h1 style="margin:0 0 8px;color:#F0EDF5;font-size:24px;font-weight:700;">You''re on {{plan_name}}!</h1>
              <p style="margin:0 0 24px;color:#8B8A9E;font-size:15px;line-height:1.6;">
                Thanks for upgrading, {{name}}. Your new plan is now active.
              </p>
              <table role="presentation" width="280" cellpadding="0" cellspacing="0" style="margin:0 auto 24px;background-color:#0F0A1E;border:2px solid #8B5CF6;border-radius:12px;">
                <tr><td style="padding:24px;text-align:center;">
                  <div style="font-size:12px;font-weight:600;color:#8B8A9E;text-transform:uppercase;letter-spacing:0.5px;">Your Plan</div>
                  <div style="font-size:24px;font-weight:800;color:#8B5CF6;margin:8px 0;">{{plan_name}}</div>
                  <div style="font-size:18px;font-weight:700;color:#F0EDF5;">{{price}}/{{billing_cycle}}</div>
                </td></tr>
              </table>
              <p style="margin:0 0 24px;color:#8B8A9E;font-size:14px;line-height:1.7;text-align:left;">{{features}}</p>
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                <tr><td align="center">
                  <a href="{{app_url}}/dashboard" target="_blank" style="display:inline-block;padding:14px 32px;background-color:#DC2626;color:#fff;font-size:15px;font-weight:700;text-decoration:none;border-radius:8px;">Explore Your Dashboard</a>
                </td></tr>
              </table>
            </td></tr>
          </table>
        </td></tr>
        <tr><td style="padding:32px 0 16px;text-align:center;">
          <p style="margin:0 0 8px;font-size:13px;color:#8B8A9E;">Go Virall &mdash; Social Intelligence for Creators</p>
          <p style="margin:0;font-size:11px;color:#8B8A9E;opacity:0.7;">&copy; 2026 Go Virall. All rights reserved.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>',
  ARRAY['name', 'app_url', 'plan_name', 'price', 'billing_cycle', 'features'],
  true
),

-- ────────────────────────────────────────────────────────────
-- 14. SUBSCRIPTION CANCELLED — plan cancelled
-- Variables: name, app_url, plan_name, end_date
-- ────────────────────────────────────────────────────────────
(
  'subscription_cancelled',
  'Your {{plan_name}} subscription has been cancelled',
  '<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#0F0A1E;font-family:-apple-system,BlinkMacSystemFont,''Segoe UI'',Roboto,Helvetica,Arial,sans-serif;">
  <div style="display:none;font-size:1px;color:#0F0A1E;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">Your subscription has been cancelled. You can resubscribe any time.</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#0F0A1E;padding:24px 16px;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
        <tr><td align="center" style="padding:32px 0 24px;">
          <span style="font-size:28px;font-weight:800;color:#F0EDF5;">Go <span style="color:#DC2626;">Virall</span></span>
        </td></tr>
        <tr><td>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#1A1035;border:1px solid #2D2252;border-radius:12px;">
            <tr><td style="padding:40px;">
              <h1 style="margin:0 0 8px;color:#F0EDF5;font-size:22px;font-weight:700;">Subscription Cancelled</h1>
              <p style="margin:0 0 20px;color:#8B8A9E;font-size:15px;line-height:1.6;">
                Hi {{name}}, we''re sorry to see you go. Your <strong style="color:#F0EDF5;">{{plan_name}}</strong> plan has been cancelled.
              </p>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#0F0A1E;border:1px solid #2D2252;border-radius:8px;margin-bottom:20px;">
                <tr><td style="padding:20px;text-align:center;">
                  <div style="font-size:12px;font-weight:600;color:#8B8A9E;text-transform:uppercase;letter-spacing:0.5px;">Access until</div>
                  <div style="font-size:20px;font-weight:700;color:#FACC15;margin-top:8px;">{{end_date}}</div>
                </td></tr>
              </table>
              <p style="margin:0 0 20px;color:#8B8A9E;font-size:14px;line-height:1.6;">
                You''ll keep your current features until the end of your billing period. After that, your account will switch to the Free plan. You can resubscribe at any time.
              </p>
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                <tr><td align="center">
                  <a href="{{app_url}}/dashboard/settings" target="_blank" style="display:inline-block;padding:14px 32px;background-color:#8B5CF6;color:#fff;font-size:15px;font-weight:700;text-decoration:none;border-radius:8px;">Resubscribe</a>
                </td></tr>
              </table>
            </td></tr>
          </table>
        </td></tr>
        <tr><td style="padding:32px 0 16px;text-align:center;">
          <p style="margin:0 0 8px;font-size:13px;color:#8B8A9E;">Go Virall &mdash; Social Intelligence for Creators</p>
          <p style="margin:0;font-size:11px;color:#8B8A9E;opacity:0.7;">&copy; 2026 Go Virall. All rights reserved.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>',
  ARRAY['name', 'app_url', 'plan_name', 'end_date'],
  true
),

-- ────────────────────────────────────────────────────────────
-- 15. PAYMENT FAILED — failed payment notification
-- Variables: name, app_url, plan_name, amount, retry_date
-- ────────────────────────────────────────────────────────────
(
  'payment_failed',
  'Payment failed for your Go Virall subscription',
  '<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#0F0A1E;font-family:-apple-system,BlinkMacSystemFont,''Segoe UI'',Roboto,Helvetica,Arial,sans-serif;">
  <div style="display:none;font-size:1px;color:#0F0A1E;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">We couldn''t process your payment. Please update your billing info.</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#0F0A1E;padding:24px 16px;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
        <tr><td align="center" style="padding:32px 0 24px;">
          <span style="font-size:28px;font-weight:800;color:#F0EDF5;">Go <span style="color:#DC2626;">Virall</span></span>
        </td></tr>
        <tr><td>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#1A1035;border:1px solid #2D2252;border-radius:12px;">
            <tr><td style="padding:40px;">
              <h1 style="margin:0 0 8px;color:#EF4444;font-size:22px;font-weight:700;">&#9888; Payment Failed</h1>
              <p style="margin:0 0 20px;color:#8B8A9E;font-size:15px;line-height:1.6;">
                Hi {{name}}, we weren''t able to process your payment of <strong style="color:#F0EDF5;">{{amount}}</strong> for your <strong style="color:#F0EDF5;">{{plan_name}}</strong> plan.
              </p>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#0F0A1E;border:1px solid #EF4444;border-radius:8px;margin-bottom:20px;">
                <tr><td style="padding:20px;">
                  <p style="margin:0 0 4px;color:#8B8A9E;font-size:13px;">We''ll try again on <strong style="color:#F0EDF5;">{{retry_date}}</strong>. To avoid any disruption to your service, please update your payment method.</p>
                </td></tr>
              </table>
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                <tr><td align="center">
                  <a href="{{app_url}}/dashboard/settings" target="_blank" style="display:inline-block;padding:14px 32px;background-color:#DC2626;color:#fff;font-size:15px;font-weight:700;text-decoration:none;border-radius:8px;">Update Payment Method</a>
                </td></tr>
              </table>
            </td></tr>
          </table>
        </td></tr>
        <tr><td style="padding:32px 0 16px;text-align:center;">
          <p style="margin:0 0 8px;font-size:13px;color:#8B8A9E;">Go Virall &mdash; Social Intelligence for Creators</p>
          <p style="margin:0;font-size:11px;color:#8B8A9E;opacity:0.7;">&copy; 2026 Go Virall. All rights reserved.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>',
  ARRAY['name', 'app_url', 'plan_name', 'amount', 'retry_date'],
  true
),

-- ────────────────────────────────────────────────────────────
-- 16. TRIAL EXPIRING — trial ending soon
-- Variables: name, app_url, days_remaining, plan_name
-- ────────────────────────────────────────────────────────────
(
  'trial_expiring',
  'Your free trial ends in {{days_remaining}} days — Go Virall',
  '<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#0F0A1E;font-family:-apple-system,BlinkMacSystemFont,''Segoe UI'',Roboto,Helvetica,Arial,sans-serif;">
  <div style="display:none;font-size:1px;color:#0F0A1E;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">Don''t lose access — upgrade before your trial ends.</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#0F0A1E;padding:24px 16px;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
        <tr><td align="center" style="padding:32px 0 24px;">
          <span style="font-size:28px;font-weight:800;color:#F0EDF5;">Go <span style="color:#DC2626;">Virall</span></span>
        </td></tr>
        <tr><td>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#1A1035;border:1px solid #2D2252;border-radius:12px;">
            <tr><td style="padding:40px;text-align:center;">
              <h1 style="margin:0 0 8px;color:#F0EDF5;font-size:22px;font-weight:700;">Your trial is ending soon</h1>
              <p style="margin:0 0 24px;color:#8B8A9E;font-size:15px;line-height:1.6;">
                Hi {{name}}, you have <strong style="color:#FACC15;">{{days_remaining}} days</strong> left on your free trial.
              </p>
              <!-- Countdown -->
              <table role="presentation" width="200" cellpadding="0" cellspacing="0" style="margin:0 auto 24px;background-color:#0F0A1E;border:2px solid #FACC15;border-radius:12px;">
                <tr><td style="padding:20px;text-align:center;">
                  <div style="font-size:40px;font-weight:800;color:#FACC15;">{{days_remaining}}</div>
                  <div style="font-size:12px;font-weight:600;color:#8B8A9E;text-transform:uppercase;letter-spacing:1px;">Days Left</div>
                </td></tr>
              </table>
              <p style="margin:0 0 24px;color:#8B8A9E;font-size:14px;line-height:1.6;">
                Upgrade to <strong style="color:#8B5CF6;">{{plan_name}}</strong> to keep all your data, analytics, and AI features. Don''t lose your progress.
              </p>
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                <tr><td align="center">
                  <a href="{{app_url}}/dashboard/settings" target="_blank" style="display:inline-block;padding:14px 32px;background-color:#DC2626;color:#fff;font-size:15px;font-weight:700;text-decoration:none;border-radius:8px;">Upgrade Now</a>
                </td></tr>
              </table>
            </td></tr>
          </table>
        </td></tr>
        <tr><td style="padding:32px 0 16px;text-align:center;">
          <p style="margin:0 0 8px;font-size:13px;color:#8B8A9E;">Go Virall &mdash; Social Intelligence for Creators</p>
          <p style="margin:0;font-size:11px;color:#8B8A9E;opacity:0.7;">&copy; 2026 Go Virall. All rights reserved.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>',
  ARRAY['name', 'app_url', 'days_remaining', 'plan_name'],
  true
),

-- ────────────────────────────────────────────────────────────
-- 17. ACCOUNT DELETED — account deletion confirmation
-- Variables: name
-- ────────────────────────────────────────────────────────────
(
  'account_deleted',
  'Your Go Virall account has been deleted',
  '<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#0F0A1E;font-family:-apple-system,BlinkMacSystemFont,''Segoe UI'',Roboto,Helvetica,Arial,sans-serif;">
  <div style="display:none;font-size:1px;color:#0F0A1E;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">Your account and data have been permanently deleted.</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#0F0A1E;padding:24px 16px;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
        <tr><td align="center" style="padding:32px 0 24px;">
          <span style="font-size:28px;font-weight:800;color:#F0EDF5;">Go <span style="color:#DC2626;">Virall</span></span>
        </td></tr>
        <tr><td>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#1A1035;border:1px solid #2D2252;border-radius:12px;">
            <tr><td style="padding:40px;">
              <h1 style="margin:0 0 8px;color:#F0EDF5;font-size:22px;font-weight:700;">Account Deleted</h1>
              <p style="margin:0 0 20px;color:#8B8A9E;font-size:15px;line-height:1.6;">
                Hi {{name}}, your Go Virall account has been permanently deleted as requested. All your data has been removed from our systems.
              </p>
              <p style="margin:0 0 20px;color:#8B8A9E;font-size:14px;line-height:1.6;">
                We''re sorry to see you go. If you ever want to come back, you can create a new account at any time.
              </p>
              <p style="margin:0;color:#8B8A9E;font-size:13px;">
                If you didn''t request this deletion, please contact us immediately at <a href="mailto:support@govirall.com" style="color:#818CF8;">support@govirall.com</a>.
              </p>
            </td></tr>
          </table>
        </td></tr>
        <tr><td style="padding:32px 0 16px;text-align:center;">
          <p style="margin:0 0 8px;font-size:13px;color:#8B8A9E;">Go Virall &mdash; Social Intelligence for Creators</p>
          <p style="margin:0;font-size:11px;color:#8B8A9E;opacity:0.7;">&copy; 2026 Go Virall. All rights reserved.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>',
  ARRAY['name'],
  true
),

-- ────────────────────────────────────────────────────────────
-- 18. PROPOSAL RECEIVED — creator receives a proposal from a brand
-- Variables: name, app_url, brand_name, proposal_title, budget, deadline, message
-- ────────────────────────────────────────────────────────────
(
  'proposal_received',
  '{{brand_name}} sent you a proposal: "{{proposal_title}}"',
  '<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#0F0A1E;font-family:-apple-system,BlinkMacSystemFont,''Segoe UI'',Roboto,Helvetica,Arial,sans-serif;">
  <div style="display:none;font-size:1px;color:#0F0A1E;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">A brand sent you a new collaboration proposal.</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#0F0A1E;padding:24px 16px;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
        <tr><td align="center" style="padding:32px 0 24px;">
          <span style="font-size:28px;font-weight:800;color:#F0EDF5;">Go <span style="color:#DC2626;">Virall</span></span>
        </td></tr>
        <tr><td>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#1A1035;border:1px solid #2D2252;border-radius:12px;">
            <tr><td style="padding:40px;">
              <h1 style="margin:0 0 8px;color:#F0EDF5;font-size:22px;font-weight:700;">New Proposal</h1>
              <p style="margin:0 0 20px;color:#8B8A9E;font-size:15px;line-height:1.6;">Hi {{name}}, you''ve received a collaboration proposal.</p>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#0F0A1E;border:1px solid #2D2252;border-radius:8px;margin-bottom:20px;">
                <tr><td style="padding:20px;">
                  <div style="font-size:11px;font-weight:600;color:#8B8A9E;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">Brand</div>
                  <div style="font-size:16px;font-weight:700;color:#F0EDF5;margin-bottom:12px;">{{brand_name}}</div>
                  <div style="font-size:11px;font-weight:600;color:#8B8A9E;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">Proposal</div>
                  <div style="font-size:16px;font-weight:600;color:#8B5CF6;margin-bottom:12px;">{{proposal_title}}</div>
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td style="width:50%;">
                        <div style="font-size:11px;font-weight:600;color:#8B8A9E;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">Budget</div>
                        <div style="font-size:18px;font-weight:700;color:#22C55E;">{{budget}}</div>
                      </td>
                      <td style="width:50%;">
                        <div style="font-size:11px;font-weight:600;color:#8B8A9E;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">Deadline</div>
                        <div style="font-size:15px;font-weight:600;color:#F0EDF5;">{{deadline}}</div>
                      </td>
                    </tr>
                  </table>
                </td></tr>
              </table>
              <p style="margin:0 0 20px;color:#8B8A9E;font-size:14px;line-height:1.6;font-style:italic;">"{{message}}"</p>
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                <tr><td align="center">
                  <a href="{{app_url}}/dashboard/proposals" target="_blank" style="display:inline-block;padding:14px 32px;background-color:#DC2626;color:#fff;font-size:15px;font-weight:700;text-decoration:none;border-radius:8px;">View Proposal</a>
                </td></tr>
              </table>
            </td></tr>
          </table>
        </td></tr>
        <tr><td style="padding:32px 0 16px;text-align:center;">
          <p style="margin:0 0 8px;font-size:13px;color:#8B8A9E;">Go Virall &mdash; Social Intelligence for Creators</p>
          <p style="margin:0 0 8px;font-size:12px;color:#8B8A9E;"><a href="{{app_url}}/dashboard/settings" style="color:#818CF8;text-decoration:underline;">Manage email preferences</a></p>
          <p style="margin:0;font-size:11px;color:#8B8A9E;opacity:0.7;">&copy; 2026 Go Virall. All rights reserved.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>',
  ARRAY['name', 'app_url', 'brand_name', 'proposal_title', 'budget', 'deadline', 'message'],
  true
),

-- ────────────────────────────────────────────────────────────
-- 19. PAYOUT PROCESSED — creator payment processed
-- Variables: name, app_url, amount, method, reference_id
-- ────────────────────────────────────────────────────────────
(
  'payout_processed',
  'Your payout of {{amount}} has been processed — Go Virall',
  '<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#0F0A1E;font-family:-apple-system,BlinkMacSystemFont,''Segoe UI'',Roboto,Helvetica,Arial,sans-serif;">
  <div style="display:none;font-size:1px;color:#0F0A1E;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">Your earnings have been sent to your account.</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#0F0A1E;padding:24px 16px;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
        <tr><td align="center" style="padding:32px 0 24px;">
          <span style="font-size:28px;font-weight:800;color:#F0EDF5;">Go <span style="color:#DC2626;">Virall</span></span>
        </td></tr>
        <tr><td>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#1A1035;border:1px solid #2D2252;border-radius:12px;">
            <tr><td style="padding:40px;text-align:center;">
              <div style="font-size:48px;margin-bottom:8px;">&#128176;</div>
              <h1 style="margin:0 0 8px;color:#F0EDF5;font-size:22px;font-weight:700;">Payout Processed</h1>
              <p style="margin:0 0 24px;color:#8B8A9E;font-size:15px;line-height:1.6;">
                Hi {{name}}, your payout has been sent successfully.
              </p>
              <table role="presentation" width="280" cellpadding="0" cellspacing="0" style="margin:0 auto 24px;background-color:#0F0A1E;border:2px solid #22C55E;border-radius:12px;">
                <tr><td style="padding:24px;text-align:center;">
                  <div style="font-size:12px;font-weight:600;color:#8B8A9E;text-transform:uppercase;letter-spacing:0.5px;">Amount</div>
                  <div style="font-size:32px;font-weight:800;color:#22C55E;margin:8px 0;">{{amount}}</div>
                  <div style="font-size:13px;color:#8B8A9E;">via {{method}}</div>
                </td></tr>
              </table>
              <p style="margin:0 0 20px;color:#8B8A9E;font-size:13px;">Reference: {{reference_id}}</p>
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                <tr><td align="center">
                  <a href="{{app_url}}/dashboard/revenue" target="_blank" style="display:inline-block;padding:14px 32px;background-color:#DC2626;color:#fff;font-size:15px;font-weight:700;text-decoration:none;border-radius:8px;">View Revenue</a>
                </td></tr>
              </table>
            </td></tr>
          </table>
        </td></tr>
        <tr><td style="padding:32px 0 16px;text-align:center;">
          <p style="margin:0 0 8px;font-size:13px;color:#8B8A9E;">Go Virall &mdash; Social Intelligence for Creators</p>
          <p style="margin:0;font-size:11px;color:#8B8A9E;opacity:0.7;">&copy; 2026 Go Virall. All rights reserved.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>',
  ARRAY['name', 'app_url', 'amount', 'method', 'reference_id'],
  true
)

ON CONFLICT (name) DO UPDATE SET
  subject = EXCLUDED.subject,
  body_html = EXCLUDED.body_html,
  variables = EXCLUDED.variables,
  is_active = EXCLUDED.is_active,
  updated_at = now();
