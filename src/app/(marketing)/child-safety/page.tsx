import type { Metadata } from "next";
import { MarketingNav } from "@/components/marketing/Nav";
import { MarketingFooter } from "@/components/marketing/Footer";

export const metadata: Metadata = {
  title: "Child Safety Standards | Go Virall",
  description:
    "Go Virall child safety standards — our commitment to preventing child sexual abuse and exploitation (CSAE) on our platform.",
};

const EFFECTIVE_DATE = "April 17, 2026";
const CONTACT_EMAIL = "support@govirall.com";
const REPORT_EMAIL = "safety@govirall.com";

export default function ChildSafetyPage() {
  return (
    <div className="min-h-screen" style={{ background: "#0B1928" }}>
      <MarketingNav />

      <main className="mx-auto max-w-3xl px-6 py-24 text-gray-300 leading-relaxed">
        <h1 className="text-3xl font-bold tracking-tight text-white mb-2">
          Child Safety Standards
        </h1>
        <p className="text-sm text-gray-500 mb-10">
          Effective date: {EFFECTIVE_DATE}
        </p>

        <Section title="1. Our Commitment">
          <p>
            Go Virall (&ldquo;we&rdquo;, &ldquo;us&rdquo;, or
            &ldquo;our&rdquo;) is committed to providing a safe platform free
            from child sexual abuse and exploitation (CSAE). We have zero
            tolerance for any content, behavior, or activity that exploits or
            endangers minors. This policy outlines the measures we take to
            prevent, detect, and respond to CSAE on our platform.
          </p>
        </Section>

        <Section title="2. Platform Age Requirements">
          <p>
            Go Virall is designed for professional creators, influencers, and
            businesses. Our platform is intended for users aged 18 and older. We
            do not knowingly collect personal information from anyone under the
            age of 18.
          </p>
          <ul className="list-disc list-inside space-y-1 pl-2 mt-3">
            <li>
              Users must be at least 18 years old to create an account.
            </li>
            <li>
              Users must certify they meet the minimum age requirement during
              registration.
            </li>
            <li>
              Accounts found to belong to users under 18 will be immediately
              suspended and removed.
            </li>
          </ul>
        </Section>

        <Section title="3. Prohibited Content and Conduct">
          <p>
            The following are strictly prohibited on Go Virall and will result in
            immediate account termination and reporting to the relevant
            authorities:
          </p>
          <ul className="list-disc list-inside space-y-1 pl-2 mt-3">
            <li>
              Any content that depicts, promotes, or glorifies the sexual
              exploitation or abuse of minors.
            </li>
            <li>
              Sharing, distributing, or soliciting child sexual abuse material
              (CSAM) in any form.
            </li>
            <li>
              Grooming or any attempt to build a relationship with a minor for
              the purpose of sexual exploitation.
            </li>
            <li>
              Sextortion or any attempt to coerce minors through threats of
              releasing intimate content.
            </li>
            <li>
              Trafficking or any facilitation of the trafficking of minors.
            </li>
            <li>
              Any content that sexualizes minors, including fictional or
              AI-generated content.
            </li>
          </ul>
        </Section>

        <Section title="4. Detection and Prevention">
          <p>
            We employ multiple measures to detect and prevent CSAE on our
            platform:
          </p>
          <ul className="list-disc list-inside space-y-1 pl-2 mt-3">
            <li>
              <strong className="text-white">Content moderation</strong> — We
              use automated systems and manual review processes to identify and
              remove prohibited content.
            </li>
            <li>
              <strong className="text-white">User reporting</strong> — We
              provide in-app and web-based reporting tools that allow users to
              flag content or behavior that may violate our child safety
              policies.
            </li>
            <li>
              <strong className="text-white">Account verification</strong> — We
              verify user age during the registration process to prevent minors
              from accessing the platform.
            </li>
            <li>
              <strong className="text-white">AI content filtering</strong> — Our
              AI-powered content generation tools include safety filters that
              prevent the generation of any content involving minors in
              inappropriate contexts.
            </li>
          </ul>
        </Section>

        <Section title="5. Reporting Concerns">
          <p>
            If you encounter any content or behavior on Go Virall that you
            believe violates our child safety standards, please report it
            immediately using one of the following methods:
          </p>
          <ul className="list-disc list-inside space-y-1 pl-2 mt-3">
            <li>
              <strong className="text-white">In-app reporting</strong> — Use the
              report button available on messages, profiles, and content
              throughout the app.
            </li>
            <li>
              <strong className="text-white">Email</strong> — Send a detailed
              report to{" "}
              <a
                href={`mailto:${REPORT_EMAIL}`}
                className="text-[#FFB84D] underline hover:text-[#FFD280]"
              >
                {REPORT_EMAIL}
              </a>
              . Include as much information as possible, including usernames,
              content descriptions, and screenshots if available.
            </li>
            <li>
              <strong className="text-white">General support</strong> — Contact
              our support team at{" "}
              <a
                href={`mailto:${CONTACT_EMAIL}`}
                className="text-[#FFB84D] underline hover:text-[#FFD280]"
              >
                {CONTACT_EMAIL}
              </a>
              .
            </li>
          </ul>
          <p className="mt-3">
            All reports are treated with the highest priority and
            confidentiality. We review reports promptly and take appropriate
            action, including content removal, account suspension, and reporting
            to law enforcement.
          </p>
        </Section>

        <Section title="6. Law Enforcement Cooperation">
          <p>
            Go Virall cooperates fully with law enforcement agencies and relevant
            authorities in the investigation and prosecution of CSAE. Our
            practices include:
          </p>
          <ul className="list-disc list-inside space-y-1 pl-2 mt-3">
            <li>
              Reporting confirmed CSAM to the{" "}
              <strong className="text-white">
                National Center for Missing &amp; Exploited Children (NCMEC)
              </strong>{" "}
              via the CyberTipline, as required by U.S. federal law.
            </li>
            <li>
              Preserving and providing evidence to law enforcement upon valid
              legal request.
            </li>
            <li>
              Cooperating with international law enforcement agencies through
              appropriate legal channels.
            </li>
            <li>
              Maintaining records of reported incidents and actions taken for a
              minimum period as required by applicable law.
            </li>
          </ul>
        </Section>

        <Section title="7. Enforcement Actions">
          <p>
            When we identify or receive a report of a violation of our child
            safety standards, we take swift action:
          </p>
          <ul className="list-disc list-inside space-y-1 pl-2 mt-3">
            <li>
              <strong className="text-white">Immediate content removal</strong>{" "}
              — Violating content is removed as soon as it is identified.
            </li>
            <li>
              <strong className="text-white">Account termination</strong> —
              Accounts found to be in violation are permanently banned with no
              option for reinstatement.
            </li>
            <li>
              <strong className="text-white">Law enforcement referral</strong>{" "}
              — All confirmed CSAE violations are reported to the appropriate
              authorities.
            </li>
            <li>
              <strong className="text-white">IP and device blocking</strong> —
              We implement technical measures to prevent banned users from
              creating new accounts.
            </li>
          </ul>
        </Section>

        <Section title="8. Training and Awareness">
          <p>
            Our team receives regular training on child safety best practices,
            including how to identify and respond to potential CSAE. We stay
            informed about evolving threats and update our policies and tools
            accordingly.
          </p>
        </Section>

        <Section title="9. Updates to This Policy">
          <p>
            We may update this Child Safety Standards policy from time to time to
            reflect changes in our practices, technology, or legal requirements.
            Any material changes will be posted on this page with an updated
            effective date.
          </p>
        </Section>

        <Section title="10. Contact Us">
          <p>
            If you have any questions about our child safety practices, please
            contact us:
          </p>
          <ul className="list-disc list-inside space-y-1 pl-2 mt-3">
            <li>
              Child safety reports:{" "}
              <a
                href={`mailto:${REPORT_EMAIL}`}
                className="text-[#FFB84D] underline hover:text-[#FFD280]"
              >
                {REPORT_EMAIL}
              </a>
            </li>
            <li>
              General inquiries:{" "}
              <a
                href={`mailto:${CONTACT_EMAIL}`}
                className="text-[#FFB84D] underline hover:text-[#FFD280]"
              >
                {CONTACT_EMAIL}
              </a>
            </li>
            <li>
              Website:{" "}
              <a
                href="https://govirall.com"
                className="text-[#FFB84D] underline hover:text-[#FFD280]"
              >
                govirall.com
              </a>
            </li>
          </ul>
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
