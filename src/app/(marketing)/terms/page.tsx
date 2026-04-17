import type { Metadata } from "next";
import Link from "next/link";
import { MarketingNav } from "@/components/marketing/Nav";
import { MarketingFooter } from "@/components/marketing/Footer";

export const metadata: Metadata = {
  title: "Terms of Service | Go Virall",
  description: "Go Virall terms of service — rules and guidelines for using our platform.",
};

const EFFECTIVE_DATE = "April 16, 2026";
const CONTACT_EMAIL = "support@govirall.com";

export default function TermsPage() {
  return (
    <div className="min-h-screen" style={{ background: "#0B1928" }}>
      <MarketingNav />

      <main className="mx-auto max-w-3xl px-6 py-24 text-gray-300 leading-relaxed">
        <h1 className="text-3xl font-bold tracking-tight text-white mb-2">
          Terms of Service
        </h1>
        <p className="text-sm text-gray-500 mb-10">
          Effective date: {EFFECTIVE_DATE}
        </p>

        <Section title="1. Acceptance of Terms">
          <p>
            By accessing or using the Go Virall website and mobile application
            (the &ldquo;Service&rdquo;), you agree to be bound by these Terms of
            Service (&ldquo;Terms&rdquo;). If you do not agree, do not use the
            Service. Go Virall (&ldquo;we&rdquo;, &ldquo;us&rdquo;, or
            &ldquo;our&rdquo;) reserves the right to update these Terms at any
            time.
          </p>
        </Section>

        <Section title="2. Eligibility">
          <p>
            You must be at least 13 years old to use the Service. By creating an
            account, you represent that you meet this age requirement and that
            the information you provide is accurate and complete.
          </p>
        </Section>

        <Section title="3. Account Responsibilities">
          <ul className="list-disc list-inside space-y-1 pl-2">
            <li>
              You are responsible for maintaining the security of your account
              credentials
            </li>
            <li>
              You are responsible for all activity that occurs under your account
            </li>
            <li>
              You must notify us immediately of any unauthorized access at{" "}
              <a
                href={`mailto:${CONTACT_EMAIL}`}
                className="text-[#FFB84D] underline hover:text-[#FFD280]"
              >
                {CONTACT_EMAIL}
              </a>
            </li>
            <li>
              One person or entity per account — sharing accounts is not
              permitted
            </li>
          </ul>
        </Section>

        <Section title="4. Acceptable Use">
          <p>You agree not to:</p>
          <ul className="list-disc list-inside space-y-1 pl-2 mt-2">
            <li>Use the Service for any unlawful purpose</li>
            <li>Impersonate another person or entity</li>
            <li>
              Submit false, misleading, or fraudulent information (including
              fabricated social media metrics)
            </li>
            <li>
              Attempt to gain unauthorized access to any part of the Service
            </li>
            <li>
              Scrape, crawl, or use automated tools to extract data from the
              Service beyond what is provided through your account
            </li>
            <li>
              Interfere with or disrupt the integrity or performance of the
              Service
            </li>
            <li>
              Use the Service to send spam or unsolicited communications
            </li>
          </ul>
        </Section>

        <Section title="5. Social Media Data">
          <p>
            Go Virall retrieves publicly available data from social media
            platforms (Instagram, TikTok, YouTube, X, LinkedIn, and others)
            based on the handles you provide. We do not access your private
            social media accounts or store your social media login credentials.
            You represent that you have the right to provide the social media
            handles you connect and that those accounts belong to you or your
            organization.
          </p>
        </Section>

        <Section title="6. Subscriptions and Payments">
          <ul className="list-disc list-inside space-y-1 pl-2">
            <li>
              The Service offers free and paid subscription plans
            </li>
            <li>
              Payments are processed securely by Stripe — we never store your
              payment card information
            </li>
            <li>
              Paid subscriptions renew automatically unless cancelled before the
              renewal date
            </li>
            <li>
              You can manage or cancel your subscription from Settings &rarr;
              Billing or through the Stripe customer portal
            </li>
            <li>
              Refunds are handled on a case-by-case basis — contact us at{" "}
              <a
                href={`mailto:${CONTACT_EMAIL}`}
                className="text-[#FFB84D] underline hover:text-[#FFD280]"
              >
                {CONTACT_EMAIL}
              </a>
            </li>
          </ul>
        </Section>

        <Section title="7. Intellectual Property">
          <p>
            The Service, including its design, features, code, and branding, is
            owned by Go Virall and protected by intellectual property laws. You
            retain ownership of any content you create or upload through the
            Service. By uploading content, you grant us a limited license to
            store, display, and process it as necessary to provide the Service.
          </p>
        </Section>

        <Section title="8. AI-Generated Content">
          <p>
            The Service includes AI-powered features such as content
            suggestions, analytics insights, and a chat assistant. AI-generated
            content is provided &ldquo;as is&rdquo; for informational purposes.
            You are solely responsible for reviewing and approving any
            AI-generated content before publishing it. We make no guarantees
            about the accuracy or suitability of AI outputs.
          </p>
        </Section>

        <Section title="9. Deals and Payments Between Users">
          <p>
            Go Virall facilitates connections and deal management between
            creators and brands. We are not a party to any agreement between
            users. We provide tools for tracking deliverables and processing
            payments via Stripe Connect, but we are not responsible for the
            performance or fulfillment of any deal between users. Platform
            payment processing fees (5%) apply to payments made through our
            platform.
          </p>
        </Section>

        <Section title="10. Termination">
          <p>
            You may delete your account at any time from Settings &rarr; Account
            or by visiting our{" "}
            <Link
              href="/delete-account"
              className="text-[#FFB84D] underline hover:text-[#FFD280]"
            >
              account deletion page
            </Link>
            . We reserve the right to suspend or terminate accounts that violate
            these Terms, with or without notice. Upon termination, your data
            will be permanently deleted in accordance with our{" "}
            <Link
              href="/privacy"
              className="text-[#FFB84D] underline hover:text-[#FFD280]"
            >
              Privacy Policy
            </Link>
            .
          </p>
        </Section>

        <Section title="11. Disclaimers">
          <p>
            The Service is provided &ldquo;as is&rdquo; and &ldquo;as
            available&rdquo; without warranties of any kind, whether express or
            implied. We do not warrant that the Service will be uninterrupted,
            error-free, or that social media metrics will be 100% accurate.
            Social media data is sourced from public profiles and may be subject
            to delays or platform API limitations.
          </p>
        </Section>

        <Section title="12. Limitation of Liability">
          <p>
            To the maximum extent permitted by law, Go Virall shall not be
            liable for any indirect, incidental, special, consequential, or
            punitive damages, or any loss of profits or revenues, whether
            incurred directly or indirectly, or any loss of data, use, or
            goodwill arising out of your use of the Service.
          </p>
        </Section>

        <Section title="13. Changes to These Terms">
          <p>
            We may modify these Terms at any time. We will notify you of
            material changes by posting the updated Terms on this page and
            updating the effective date. Continued use of the Service after
            changes constitutes acceptance of the new Terms.
          </p>
        </Section>

        <Section title="14. Contact Us">
          <p>
            If you have questions about these Terms, contact us at{" "}
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
