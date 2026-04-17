import type { Metadata } from "next";
import { MarketingNav } from "@/components/marketing/Nav";
import { MarketingFooter } from "@/components/marketing/Footer";

export const metadata: Metadata = {
  title: "Privacy Policy | Go Virall",
  description:
    "Go Virall privacy policy — how we collect, use, and protect your data.",
};

const EFFECTIVE_DATE = "April 16, 2026";
const CONTACT_EMAIL = "support@govirall.com";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen" style={{ background: "#0B1928" }}>
      <MarketingNav />

      <main className="mx-auto max-w-3xl px-6 py-24 text-gray-300 leading-relaxed">
        <h1 className="text-3xl font-bold tracking-tight text-white mb-2">
          Privacy Policy
        </h1>
        <p className="text-sm text-gray-500 mb-10">
          Effective date: {EFFECTIVE_DATE}
        </p>

        <Section title="1. Introduction">
          <p>
            Go Virall (&ldquo;we&rdquo;, &ldquo;us&rdquo;, or
            &ldquo;our&rdquo;) operates the Go Virall website and mobile
            application (the &ldquo;Service&rdquo;). This Privacy Policy
            explains how we collect, use, disclose, and safeguard your
            information when you use our Service.
          </p>
        </Section>

        <Section title="2. Information We Collect">
          <h3 className="text-white font-semibold mt-4 mb-2">
            Information you provide
          </h3>
          <ul className="list-disc list-inside space-y-1 pl-2">
            <li>
              <strong className="text-white">Account information</strong> —
              name, email address, and password when you create an account
            </li>
            <li>
              <strong className="text-white">Profile information</strong> —
              display name, bio, niche, location (city/state), and profile photo
            </li>
            <li>
              <strong className="text-white">Social media handles</strong> — the
              usernames you provide so we can retrieve your public social media
              data
            </li>
            <li>
              <strong className="text-white">User-generated content</strong> —
              scheduled posts, messages, proposals, deals, and AI chat
              conversations
            </li>
          </ul>

          <h3 className="text-white font-semibold mt-4 mb-2">
            Information collected automatically
          </h3>
          <ul className="list-disc list-inside space-y-1 pl-2">
            <li>
              <strong className="text-white">Usage data</strong> — screen views,
              feature interactions, and in-app events via our first-party
              analytics system
            </li>
            <li>
              <strong className="text-white">Device identifiers</strong> — push
              notification tokens (Expo/FCM) to deliver notifications
            </li>
          </ul>

          <h3 className="text-white font-semibold mt-4 mb-2">
            Information we do NOT collect
          </h3>
          <ul className="list-disc list-inside space-y-1 pl-2">
            <li>Precise or approximate GPS location</li>
            <li>Contacts, calendar, or phone data</li>
            <li>Advertising or tracking IDs</li>
            <li>Biometric data</li>
            <li>
              Payment card details (processed entirely by Stripe — we never see
              or store card numbers)
            </li>
          </ul>
        </Section>

        <Section title="3. How We Use Your Information">
          <ul className="list-disc list-inside space-y-1 pl-2">
            <li>Provide, operate, and maintain the Service</li>
            <li>
              Retrieve and display your public social media analytics and
              metrics
            </li>
            <li>
              Power AI-assisted features (content suggestions, chat assistant)
            </li>
            <li>Send push notifications for messages, deals, and alerts</li>
            <li>Process subscriptions and payments via Stripe</li>
            <li>Improve the Service through aggregated usage analytics</li>
            <li>Respond to support requests</li>
          </ul>
        </Section>

        <Section title="4. How We Share Your Information">
          <p>
            We do not sell your personal information. We share data only with the
            following service providers that are necessary to operate the
            Service:
          </p>
          <ul className="list-disc list-inside space-y-1 pl-2 mt-2">
            <li>
              <strong className="text-white">Supabase</strong> — database
              hosting and authentication
            </li>
            <li>
              <strong className="text-white">Stripe</strong> — payment
              processing and subscription billing
            </li>
            <li>
              <strong className="text-white">Expo / Firebase Cloud Messaging</strong>{" "}
              — push notification delivery
            </li>
            <li>
              <strong className="text-white">AI providers</strong> (OpenAI,
              Anthropic, DeepSeek, Google) — processing AI chat messages
              server-side
            </li>
            <li>
              <strong className="text-white">Resend</strong> — transactional
              email delivery
            </li>
          </ul>
        </Section>

        <Section title="5. Data Security">
          <p>
            All data transmitted between your device and our servers is encrypted
            using TLS/HTTPS. Authentication tokens are stored in your
            device&apos;s secure storage (iOS Keychain / Android Keystore). We
            use Row Level Security (RLS) policies on our database to ensure
            users can only access their own data.
          </p>
        </Section>

        <Section title="6. Data Retention and Deletion">
          <p>
            We retain your data for as long as your account is active. You can
            delete your account at any time from{" "}
            <strong className="text-white">
              Settings &rarr; Account &rarr; Delete Account
            </strong>
            . When you delete your account, all associated data is permanently
            removed from our systems. Active subscriptions are automatically
            cancelled.
          </p>
        </Section>

        <Section title="7. Your Rights">
          <ul className="list-disc list-inside space-y-1 pl-2">
            <li>Access, correct, or delete your personal data</li>
            <li>Export your data</li>
            <li>Opt out of non-essential communications</li>
            <li>Delete your account entirely</li>
          </ul>
          <p className="mt-2">
            To exercise any of these rights, contact us at{" "}
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="text-[#FFB84D] underline hover:text-[#FFD280]"
            >
              {CONTACT_EMAIL}
            </a>{" "}
            or use the in-app settings.
          </p>
        </Section>

        <Section title="8. Children's Privacy">
          <p>
            Our Service is not intended for users under the age of 13. We do not
            knowingly collect personal information from children under 13. If we
            become aware that we have collected such data, we will delete it
            promptly.
          </p>
        </Section>

        <Section title="9. Changes to This Policy">
          <p>
            We may update this Privacy Policy from time to time. We will notify
            you of material changes by posting the updated policy on this page
            and updating the effective date. Your continued use of the Service
            after changes constitutes acceptance of the updated policy.
          </p>
        </Section>

        <Section title="10. Contact Us">
          <p>
            If you have questions about this Privacy Policy, contact us at{" "}
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="text-[#FFB84D] underline hover:text-[#FFD280]"
            >
              {CONTACT_EMAIL}
            </a>
          </p>
        </Section>
      </main>

      <MarketingFooter />
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-8">
      <h2 className="text-xl font-semibold text-white mb-3">{title}</h2>
      {children}
    </section>
  );
}
