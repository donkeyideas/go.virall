/**
 * Go Virall — Resend email client.
 *
 * Re-exports the core sendEmail from the existing email module
 * and adds report-specific helpers with the correct from address.
 *
 * From address: "Go Virall <hello@govirall.com>" with fallback to onboarding@resend.dev
 */

import { sendEmail } from "@/lib/email";

const REPORT_FROM = "Go Virall <hello@govirall.com>";
const FALLBACK_FROM = "Go Virall <onboarding@resend.dev>";

/**
 * Send a report email with automatic from-address fallback.
 * If the primary domain fails (not verified), retries with onboarding@resend.dev.
 */
export async function sendReportEmail({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}): Promise<{ success: true; id: string } | { error: string }> {
  // Try with verified domain first
  const result = await sendEmail({
    to,
    subject,
    html,
    from: REPORT_FROM,
  });

  // If domain verification error, retry with fallback
  if ("error" in result && result.error.toLowerCase().includes("domain")) {
    console.warn("[sendReportEmail] Primary domain failed, using fallback from address");
    return sendEmail({
      to,
      subject,
      html,
      from: FALLBACK_FROM,
    });
  }

  return result;
}

export { sendEmail };
