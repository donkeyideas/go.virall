import type { Metadata } from "next";
import Link from "next/link";
import { MarketingNav } from "@/components/marketing/Nav";
import { MarketingFooter } from "@/components/marketing/Footer";

export const metadata: Metadata = {
  title: "Delete Your Account | Go Virall",
  description:
    "Learn how to delete your Go Virall account and all associated data.",
  robots: { index: false, follow: false },
};

export default function DeleteAccountPage() {
  return (
    <div className="min-h-screen" style={{ background: "#0B1928" }}>
      <MarketingNav />

      <main className="mx-auto max-w-2xl px-6 py-24 text-white">
        <h1 className="text-3xl font-bold tracking-tight mb-8">
          Delete Your Account
        </h1>

        <div className="space-y-6 text-gray-300 leading-relaxed">
          <p>
            We&apos;re sorry to see you go. If you&apos;d like to delete your Go
            Virall account and all associated data, follow the steps below.
          </p>

          <h2 className="text-xl font-semibold text-white mt-8">
            How to delete your account
          </h2>

          <ol className="list-decimal list-inside space-y-3 pl-2">
            <li>
              Log in to your Go Virall account at{" "}
              <Link
                href="/login"
                className="text-[#FFB84D] underline hover:text-[#FFD280]"
              >
                govirall.com/login
              </Link>
            </li>
            <li>
              Navigate to{" "}
              <strong className="text-white">Settings &rarr; Account</strong>
            </li>
            <li>
              Scroll to the <strong className="text-white">Danger Zone</strong>{" "}
              section at the bottom of the page
            </li>
            <li>
              Click{" "}
              <strong className="text-white">
                &ldquo;Delete Account&rdquo;
              </strong>{" "}
              and confirm
            </li>
          </ol>

          <h2 className="text-xl font-semibold text-white mt-8">
            What gets deleted
          </h2>

          <ul className="list-disc list-inside space-y-2 pl-2">
            <li>Your profile and account information</li>
            <li>Connected social media accounts and metrics</li>
            <li>Chat and message history</li>
            <li>Deals, proposals, and deliverables</li>
            <li>Scheduled posts and content drafts</li>
            <li>Billing and subscription data</li>
            <li>Push notification tokens</li>
            <li>All other data associated with your account</li>
          </ul>

          <div
            className="mt-8 rounded-lg border border-[#FFB84D]/30 p-4"
            style={{ background: "rgba(255,184,77,0.08)" }}
          >
            <p className="text-sm text-[#FFD280]">
              <strong>Note:</strong> Account deletion is permanent and cannot be
              undone. All data is removed immediately upon confirmation. If you
              have an active subscription, it will be cancelled automatically.
            </p>
          </div>

          <h2 className="text-xl font-semibold text-white mt-8">
            Need help?
          </h2>

          <p>
            If you&apos;re having trouble deleting your account or have
            questions, contact us at{" "}
            <a
              href="mailto:support@govirall.com"
              className="text-[#FFB84D] underline hover:text-[#FFD280]"
            >
              support@govirall.com
            </a>
          </p>
        </div>
      </main>

      <MarketingFooter />
    </div>
  );
}
