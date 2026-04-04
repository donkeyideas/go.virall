"use server";

import { Resend } from "resend";
import { createAdminClient } from "@/lib/supabase/admin";

const FROM_DEFAULT = "Go Virall <noreply@govirall.com>";

// Lazy-initialized Resend client — reads key from DB first, falls back to env
let _resend: Resend | null = null;

async function getResendClient(): Promise<Resend> {
  if (_resend) return _resend;

  // Try DB first
  let apiKey: string | null = null;
  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("platform_api_configs")
      .select("api_key")
      .eq("provider", "resend")
      .eq("is_active", true)
      .single();
    apiKey = data?.api_key ?? null;
  } catch {
    // DB lookup failed, fall through
  }

  // Fallback to env
  if (!apiKey) {
    apiKey = process.env.RESEND_API_KEY ?? null;
  }

  if (!apiKey) {
    throw new Error("Resend API key not configured. Add it in Admin > API Management.");
  }

  _resend = new Resend(apiKey);
  return _resend;
}

// Reset cached client (call after key rotation)
export function resetEmailClient() {
  _resend = null;
}

// ─── Core send function ──────────────────────────────────────

export async function sendEmail({
  to,
  subject,
  html,
  from,
  replyTo,
}: {
  to: string | string[];
  subject: string;
  html: string;
  from?: string;
  replyTo?: string;
}): Promise<{ success: true; id: string } | { error: string }> {
  try {
    const resend = await getResendClient();
    const { data, error } = await resend.emails.send({
      from: from ?? FROM_DEFAULT,
      to: Array.isArray(to) ? to : [to],
      subject,
      html,
      replyTo,
    });

    if (error) return { error: error.message };
    return { success: true, id: data?.id ?? "" };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to send email" };
  }
}

// ─── Template-based send ─────────────────────────────────────
// Fetches an email template from DB and interpolates variables

export async function sendTemplateEmail({
  templateName,
  to,
  variables,
  from,
  replyTo,
}: {
  templateName: string;
  to: string | string[];
  variables?: Record<string, string>;
  from?: string;
  replyTo?: string;
}): Promise<{ success: true; id: string } | { error: string }> {
  try {
    const admin = createAdminClient();
    const { data: template } = await admin
      .from("email_templates")
      .select("subject, body_html")
      .eq("name", templateName)
      .eq("is_active", true)
      .single();

    if (!template) {
      return { error: `Email template "${templateName}" not found or inactive.` };
    }

    let { subject, body_html: html } = template;

    // Interpolate {{variable}} placeholders
    if (variables) {
      for (const [key, value] of Object.entries(variables)) {
        const pattern = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, "g");
        subject = subject.replace(pattern, value);
        html = html.replace(pattern, value);
      }
    }

    return sendEmail({ to, subject, html, from, replyTo });
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to send template email" };
  }
}

// ─── Convenience helpers ─────────────────────────────────────

export async function sendWelcomeEmail(email: string, name: string) {
  return sendTemplateEmail({
    templateName: "welcome",
    to: email,
    variables: { name, app_url: process.env.NEXT_PUBLIC_APP_URL || "https://govirall.com" },
  });
}

export async function sendTeamInviteEmail(email: string, inviterName: string, orgName: string, inviteUrl: string) {
  return sendTemplateEmail({
    templateName: "team_invite",
    to: email,
    variables: { inviter_name: inviterName, org_name: orgName, invite_url: inviteUrl },
  });
}

export async function sendReportEmail(email: string, name: string, reportHtml: string) {
  return sendEmail({
    to: email,
    subject: `Your Go Virall Weekly Report`,
    html: reportHtml,
  });
}
