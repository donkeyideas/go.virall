"use client";

import { useState, useRef, useTransition, useEffect } from "react";
import {
  Building2,
  Globe,
  Users,
  Save,
  UserPlus,
  Check,
  Image,
  Mail,
  Phone,
  X,
  LifeBuoy,
  Send,
  MessageCircle,
  Loader2,
} from "lucide-react";
import { BrandBillingTab } from "@/components/brand/BrandBillingTab";
import type { Organization, SubscriptionData, BillingInvoice, PricingPlan, ContactSubmission } from "@/types";
import {
  updateBrandProfile,
  uploadBrandLogo,
  inviteTeamMember,
  cancelTeamInvite,
  submitSupportMessage,
  markSupportMessageRead,
} from "@/lib/actions/settings";

interface CompanyForm {
  companyName: string;
  website: string;
  industry: string;
  companySize: string;
  description: string;
  contactEmail: string;
  contactPhone: string;
}

export interface BrandProfile {
  companyName: string;
  website: string;
  industry: string;
  companySize: string;
  description: string;
  contactEmail: string;
  contactPhone: string;
  logoUrl: string | null;
}

export interface TeamInvite {
  id: string;
  email: string;
  role: string;
  status: string;
  created_at: string;
}

const industries = [
  "Technology",
  "Fashion & Apparel",
  "Beauty & Cosmetics",
  "Food & Beverage",
  "Health & Wellness",
  "Travel & Hospitality",
  "Finance & Banking",
  "Entertainment & Media",
  "Education",
  "E-commerce",
  "Real Estate",
  "Automotive",
  "Sports & Fitness",
  "Home & Garden",
  "Other",
];

const companySizes = [
  "1-10 employees",
  "11-50 employees",
  "51-200 employees",
  "201-500 employees",
  "501-1000 employees",
  "1000+ employees",
];

export default function BrandSettingsClient({
  profile,
  initialInvites = [],
  organization = null,
  subscription = null,
  invoices = [],
  brandPlans = [],
  supportMessages = [],
  unreadSupportCount = 0,
}: {
  profile: BrandProfile;
  initialInvites?: TeamInvite[];
  organization?: Organization | null;
  subscription?: SubscriptionData | null;
  invoices?: BillingInvoice[];
  brandPlans?: PricingPlan[];
  supportMessages?: ContactSubmission[];
  unreadSupportCount?: number;
}) {
  const [form, setForm] = useState<CompanyForm>({
    companyName: profile.companyName,
    website: profile.website,
    industry: profile.industry,
    companySize: profile.companySize,
    description: profile.description,
    contactEmail: profile.contactEmail,
    contactPhone: profile.contactPhone,
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string | null>(profile.logoUrl);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("viewer");
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [inviteSent, setInviteSent] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviting, setInviting] = useState(false);
  const [invites, setInvites] = useState<TeamInvite[]>(initialInvites);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Support state
  const [supportSubject, setSupportSubject] = useState("");
  const [supportMessage, setSupportMessage] = useState("");
  const [supportSending, startSupportTransition] = useTransition();
  const [supportSent, setSupportSent] = useState(false);
  const [supportError, setSupportError] = useState<string | null>(null);
  const [expandedTicket, setExpandedTicket] = useState<string | null>(null);

  // Mark support replies as read when expanded
  useEffect(() => {
    if (!expandedTicket) return;
    const ticket = supportMessages.find((m) => m.id === expandedTicket);
    if (ticket?.admin_reply && !ticket.brand_read) {
      markSupportMessageRead(ticket.id);
    }
  }, [expandedTicket, supportMessages]);

  function handleSupportSubmit() {
    if (!supportSubject.trim() || !supportMessage.trim()) return;
    setSupportError(null);
    startSupportTransition(async () => {
      const result = await submitSupportMessage(supportSubject, supportMessage);
      if ("error" in result) {
        setSupportError(result.error);
      } else {
        setSupportSent(true);
        setSupportSubject("");
        setSupportMessage("");
        setTimeout(() => setSupportSent(false), 3000);
      }
    });
  }

  function handleChange(field: keyof CompanyForm, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setSaved(false);
  }

  async function handleSave() {
    setSaving(true);
    const result = await updateBrandProfile({
      companyName: form.companyName,
      website: form.website,
      industry: form.industry,
      companySize: form.companySize,
      description: form.description,
      contactEmail: form.contactEmail,
      contactPhone: form.contactPhone,
    });
    setSaving(false);
    if (result.success) {
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    }
  }

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadError(null);
    const formData = new FormData();
    formData.append("file", file);

    const result = await uploadBrandLogo(formData);
    setUploading(false);

    if (result.success && result.url) {
      setLogoUrl(result.url);
    } else {
      setUploadError(result.error || "Upload failed");
    }
  }

  async function handleInvite() {
    if (!inviteEmail.trim()) return;
    setInviting(true);
    setInviteError(null);

    const result = await inviteTeamMember(inviteEmail.trim(), inviteRole);

    setInviting(false);

    if (result.success) {
      setInviteSent(true);
      setInvites((prev) => [
        { id: result.inviteId || crypto.randomUUID(), email: inviteEmail.trim().toLowerCase(), role: inviteRole, status: "pending", created_at: new Date().toISOString() },
        ...prev,
      ]);
      setTimeout(() => {
        setInviteSent(false);
        setShowInviteDialog(false);
        setInviteEmail("");
        setInviteRole("viewer");
      }, 2000);
    } else {
      setInviteError(result.error || "Failed to send invite");
    }
  }

  async function handleCancelInvite(inviteId: string) {
    const result = await cancelTeamInvite(inviteId);
    if (result.success) {
      setInvites((prev) => prev.filter((i) => i.id !== inviteId));
    }
  }

  const inputStyle: React.CSSProperties = {
    width: "100%",
    background: "var(--color-surface-inset)",
    border: "1px solid rgba(75,156,211,0.12)",
    borderRadius: 8,
    padding: "10px 14px",
    fontSize: 13,
    color: "var(--color-ink)",
    fontFamily: "inherit",
    outline: "none",
  };

  const labelStyle: React.CSSProperties = {
    fontSize: 11,
    fontWeight: 700,
    color: "var(--color-ink-secondary)",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    display: "block",
    marginBottom: 6,
  };

  return (
    <div
      style={{
        fontFamily: "-apple-system,'Segoe UI','Helvetica Neue',Arial,sans-serif",
        maxWidth: 800,
        margin: "0 auto",
      }}
    >
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1
          style={{
            fontSize: 24,
            fontWeight: 800,
            color: "var(--color-ink)",
            margin: 0,
            letterSpacing: -0.5,
          }}
        >
          Brand Settings
        </h1>
        <p
          style={{
            fontSize: 13,
            color: "var(--color-ink-secondary)",
            marginTop: 6,
            fontWeight: 500,
          }}
        >
          Manage your company profile, billing, and team
        </p>
      </div>

      {/* Company Profile Section */}
      <div
        style={{
          background: "var(--color-surface-card)",
          border: "1px solid rgba(75,156,211,0.12)",
          borderRadius: 14,
          padding: 24,
          marginBottom: 20,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            marginBottom: 20,
          }}
        >
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: "rgba(75,156,211,0.08)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Building2 size={16} style={{ color: "rgba(75,156,211,0.7)" }} />
          </div>
          <h2
            style={{
              fontSize: 16,
              fontWeight: 700,
              color: "var(--color-ink)",
              margin: 0,
            }}
          >
            Company Profile
          </h2>
        </div>

        {/* Logo upload */}
        <div style={{ marginBottom: 20 }}>
          <label style={labelStyle}>Company Logo</label>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div
              onClick={() => fileInputRef.current?.click()}
              style={{
                width: 72,
                height: 72,
                borderRadius: 12,
                background: logoUrl ? "transparent" : "rgba(75,156,211,0.08)",
                border: logoUrl ? "1px solid rgba(75,156,211,0.2)" : "2px dashed rgba(75,156,211,0.2)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                flexShrink: 0,
                overflow: "hidden",
              }}
            >
              {uploading ? (
                <span style={{ fontSize: 10, color: "var(--color-ink-secondary)" }}>...</span>
              ) : logoUrl ? (
                <img
                  src={logoUrl}
                  alt="Company logo"
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              ) : (
                <>
                  <Image size={20} style={{ color: "rgba(75,156,211,0.4)" }} />
                  <span style={{ fontSize: 8, color: "var(--color-ink-secondary)", marginTop: 4 }}>
                    Upload
                  </span>
                </>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/svg+xml"
              onChange={handleLogoUpload}
              style={{ display: "none" }}
            />
            <div>
              <p
                style={{
                  fontSize: 11,
                  color: "var(--color-ink-secondary)",
                  margin: 0,
                  lineHeight: 1.5,
                }}
              >
                Upload your company logo. Recommended size: 200x200px.
                <br />
                Supports PNG, JPG, or SVG.
              </p>
              {uploadError && (
                <p style={{ fontSize: 11, color: "#EF4444", margin: "6px 0 0", fontWeight: 600 }}>
                  {uploadError}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Form fields */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <div>
            <label style={labelStyle}>Company Name</label>
            <input
              type="text"
              placeholder="Your company name"
              value={form.companyName}
              onChange={(e) => handleChange("companyName", e.target.value)}
              style={inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>Website</label>
            <div style={{ position: "relative" }}>
              <Globe
                size={14}
                style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--color-ink-secondary)" }}
              />
              <input
                type="url"
                placeholder="https://yourcompany.com"
                value={form.website}
                onChange={(e) => handleChange("website", e.target.value)}
                style={{ ...inputStyle, paddingLeft: 34 }}
              />
            </div>
          </div>
          <div>
            <label style={labelStyle}>Industry</label>
            <select
              value={form.industry}
              onChange={(e) => handleChange("industry", e.target.value)}
              style={inputStyle}
            >
              <option value="">Select industry</option>
              {industries.map((i) => (
                <option key={i} value={i}>{i}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Company Size</label>
            <select
              value={form.companySize}
              onChange={(e) => handleChange("companySize", e.target.value)}
              style={inputStyle}
            >
              <option value="">Select size</option>
              {companySizes.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Contact Email</label>
            <div style={{ position: "relative" }}>
              <Mail
                size={14}
                style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--color-ink-secondary)" }}
              />
              <input
                type="email"
                placeholder="contact@yourcompany.com"
                value={form.contactEmail}
                onChange={(e) => handleChange("contactEmail", e.target.value)}
                style={{ ...inputStyle, paddingLeft: 34 }}
              />
            </div>
          </div>
          <div>
            <label style={labelStyle}>Contact Phone</label>
            <div style={{ position: "relative" }}>
              <Phone
                size={14}
                style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--color-ink-secondary)" }}
              />
              <input
                type="tel"
                placeholder="+1 (555) 000-0000"
                value={form.contactPhone}
                onChange={(e) => handleChange("contactPhone", e.target.value)}
                style={{ ...inputStyle, paddingLeft: 34 }}
              />
            </div>
          </div>
        </div>

        <div style={{ marginTop: 16 }}>
          <label style={labelStyle}>Company Description</label>
          <textarea
            placeholder="Tell creators about your brand, values, and what you are looking for in collaborations..."
            value={form.description}
            onChange={(e) => handleChange("description", e.target.value)}
            rows={4}
            style={{ ...inputStyle, resize: "vertical", minHeight: 100, lineHeight: 1.6 }}
          />
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 12, marginTop: 20 }}>
          {saved && (
            <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 600, color: "#10B981" }}>
              <Check size={14} />
              Saved successfully
            </span>
          )}
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "10px 24px",
              background: saving ? "rgba(75,156,211,0.5)" : "var(--color-editorial-red)",
              border: "none",
              borderRadius: 10,
              fontSize: 13,
              fontWeight: 700,
              color: "#ffffff",
              cursor: saving ? "not-allowed" : "pointer",
              fontFamily: "inherit",
            }}
          >
            <Save size={15} />
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>

      {/* Billing Section */}
      <div style={{ marginBottom: 20 }}>
        <BrandBillingTab
          organization={organization}
          subscription={subscription}
          invoices={invoices}
          brandPlans={brandPlans}
        />
      </div>

      {/* Team Section */}
      <div
        style={{
          background: "var(--color-surface-card)",
          border: "1px solid rgba(75,156,211,0.12)",
          borderRadius: 14,
          padding: 24,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 32, height: 32, borderRadius: 8,
                background: "rgba(75,156,211,0.08)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}
            >
              <Users size={16} style={{ color: "rgba(75,156,211,0.7)" }} />
            </div>
            <div>
              <h2 style={{ fontSize: 16, fontWeight: 700, color: "var(--color-ink)", margin: 0 }}>Team Management</h2>
              <p style={{ fontSize: 12, color: "var(--color-ink-secondary)", margin: "2px 0 0" }}>
                Invite team members to manage campaigns and collaborations
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowInviteDialog(true)}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "8px 16px",
              background: "var(--color-editorial-red)",
              border: "none", borderRadius: 8,
              fontSize: 12, fontWeight: 700, color: "#ffffff",
              cursor: "pointer", fontFamily: "inherit",
            }}
          >
            <UserPlus size={14} />
            Invite Member
          </button>
        </div>

        {invites.length === 0 ? (
          <div
            style={{
              padding: "30px 20px",
              background: "rgba(75,156,211,0.03)",
              border: "1px dashed rgba(75,156,211,0.12)",
              borderRadius: 10,
              textAlign: "center",
            }}
          >
            <Users size={24} style={{ color: "rgba(75,156,211,0.3)", marginBottom: 8 }} />
            <p style={{ fontSize: 12, color: "var(--color-ink-secondary)", margin: 0 }}>
              No team members yet. Invite colleagues to collaborate on campaigns.
            </p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {invites.map((invite) => (
              <div
                key={invite.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "10px 14px",
                  background: "rgba(75,156,211,0.03)",
                  border: "1px solid rgba(75,156,211,0.08)",
                  borderRadius: 8,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <Mail size={14} style={{ color: "var(--color-ink-secondary)" }} />
                  <div>
                    <span style={{ fontSize: 13, color: "var(--color-ink)", fontWeight: 600 }}>{invite.email}</span>
                    <span style={{ fontSize: 11, color: "var(--color-ink-secondary)", marginLeft: 8, textTransform: "capitalize" }}>
                      {invite.role}
                    </span>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      textTransform: "uppercase",
                      letterSpacing: 0.5,
                      color: invite.status === "accepted" ? "#10B981" : "#F59E0B",
                    }}
                  >
                    {invite.status}
                  </span>
                  {invite.status === "pending" && (
                    <button
                      onClick={() => handleCancelInvite(invite.id)}
                      style={{
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        color: "var(--color-ink-secondary)",
                        padding: 4,
                      }}
                      title="Cancel invite"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Support Section */}
      <div
        style={{
          background: "var(--color-surface-card)",
          border: "1px solid rgba(75,156,211,0.12)",
          borderRadius: 14,
          padding: 24,
          marginTop: 20,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: "rgba(75,156,211,0.08)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <LifeBuoy size={16} style={{ color: "rgba(75,156,211,0.7)" }} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, color: "var(--color-ink)", margin: 0 }}>
                Support
              </h2>
              {unreadSupportCount > 0 && (
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    height: 18,
                    minWidth: 18,
                    padding: "0 5px",
                    background: "var(--color-editorial-red)",
                    color: "#ffffff",
                    fontSize: 10,
                    fontWeight: 700,
                    borderRadius: 9,
                  }}
                >
                  {unreadSupportCount}
                </span>
              )}
            </div>
            <p style={{ fontSize: 12, color: "var(--color-ink-secondary)", margin: "2px 0 0" }}>
              Contact our team with any questions or issues
            </p>
          </div>
        </div>

        {/* New Message Form */}
        <div
          style={{
            background: "rgba(75,156,211,0.03)",
            border: "1px solid rgba(75,156,211,0.1)",
            borderRadius: 10,
            padding: 16,
            marginBottom: 20,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 12 }}>
            <MessageCircle size={14} style={{ color: "rgba(75,156,211,0.6)" }} />
            <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.8, color: "var(--color-ink-secondary)" }}>
              New Message
            </span>
          </div>

          {supportSent && (
            <div style={{ marginBottom: 12, padding: 10, background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.2)", borderRadius: 8, display: "flex", alignItems: "center", gap: 8, fontSize: 12, fontWeight: 600, color: "#10B981" }}>
              <Check size={14} />
              Message sent! Our team will respond shortly.
            </div>
          )}
          {supportError && (
            <div style={{ marginBottom: 12, padding: 10, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 8, fontSize: 12, color: "#EF4444" }}>
              {supportError}
            </div>
          )}

          <input
            type="text"
            placeholder="Subject"
            value={supportSubject}
            onChange={(e) => setSupportSubject(e.target.value)}
            style={inputStyle}
          />
          <textarea
            placeholder="Describe your question or issue..."
            value={supportMessage}
            onChange={(e) => setSupportMessage(e.target.value)}
            rows={3}
            style={{ ...inputStyle, marginTop: 10, resize: "vertical", minHeight: 80, lineHeight: 1.6 }}
          />
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 10 }}>
            <button
              onClick={handleSupportSubmit}
              disabled={supportSending || !supportSubject.trim() || !supportMessage.trim()}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "8px 18px",
                background: supportSending ? "rgba(75,156,211,0.5)" : "var(--color-editorial-red)",
                border: "none",
                borderRadius: 8,
                fontSize: 12,
                fontWeight: 700,
                color: "#ffffff",
                cursor: supportSending ? "not-allowed" : "pointer",
                fontFamily: "inherit",
                opacity: (!supportSubject.trim() || !supportMessage.trim()) ? 0.5 : 1,
              }}
            >
              {supportSending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
              {supportSending ? "Sending..." : "Send Message"}
            </button>
          </div>
        </div>

        {/* Previous Tickets */}
        {supportMessages.length > 0 && (
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: "var(--color-ink-secondary)", marginBottom: 10 }}>
              Previous Messages
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {supportMessages.map((ticket) => {
                const isExpanded = expandedTicket === ticket.id;
                const hasUnreadReply = ticket.admin_reply && !ticket.brand_read;
                return (
                  <div
                    key={ticket.id}
                    style={{
                      background: hasUnreadReply ? "rgba(75,156,211,0.04)" : "transparent",
                      border: `1px solid ${hasUnreadReply ? "rgba(75,156,211,0.2)" : "rgba(75,156,211,0.08)"}`,
                      borderRadius: 10,
                      overflow: "hidden",
                    }}
                  >
                    {/* Ticket Header */}
                    <div
                      onClick={() => setExpandedTicket(isExpanded ? null : ticket.id)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "12px 14px",
                        cursor: "pointer",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, minWidth: 0 }}>
                        {hasUnreadReply && (
                          <div style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--color-editorial-red)", flexShrink: 0 }} />
                        )}
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--color-ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {ticket.subject || "No subject"}
                          </div>
                          <div style={{ fontSize: 11, color: "var(--color-ink-secondary)", marginTop: 2 }}>
                            {new Date(ticket.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                          </div>
                        </div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                        <span
                          style={{
                            fontSize: 9,
                            fontWeight: 700,
                            textTransform: "uppercase",
                            letterSpacing: 0.5,
                            color: ticket.status === "replied" ? "#10B981" : ticket.status === "new" ? "#F59E0B" : "var(--color-ink-secondary)",
                          }}
                        >
                          {ticket.status === "replied" ? "Replied" : ticket.status === "new" ? "Pending" : ticket.status}
                        </span>
                      </div>
                    </div>

                    {/* Expanded Detail */}
                    {isExpanded && (
                      <div style={{ padding: "0 14px 14px", borderTop: "1px solid rgba(75,156,211,0.08)" }}>
                        {/* Original Message */}
                        <div style={{ marginTop: 12 }}>
                          <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.8, color: "var(--color-ink-secondary)", marginBottom: 6 }}>
                            Your Message
                          </div>
                          <div
                            style={{
                              padding: 12,
                              background: "rgba(75,156,211,0.04)",
                              border: "1px solid rgba(75,156,211,0.08)",
                              borderRadius: 8,
                              fontSize: 12,
                              color: "var(--color-ink)",
                              lineHeight: 1.6,
                              whiteSpace: "pre-wrap",
                            }}
                          >
                            {ticket.message}
                          </div>
                        </div>

                        {/* Admin Reply */}
                        {ticket.admin_reply && (
                          <div style={{ marginTop: 12 }}>
                            <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.8, color: "#10B981", marginBottom: 6 }}>
                              Admin Reply
                            </div>
                            <div
                              style={{
                                padding: 12,
                                background: "rgba(16,185,129,0.04)",
                                border: "1px solid rgba(16,185,129,0.15)",
                                borderRadius: 8,
                                fontSize: 12,
                                color: "var(--color-ink)",
                                lineHeight: 1.6,
                                whiteSpace: "pre-wrap",
                              }}
                            >
                              {ticket.admin_reply}
                              {ticket.admin_reply_at && (
                                <div style={{ marginTop: 8, fontSize: 10, color: "var(--color-ink-secondary)" }}>
                                  {new Date(ticket.admin_reply_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Waiting for reply */}
                        {!ticket.admin_reply && (
                          <div style={{ marginTop: 12, padding: 10, background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.15)", borderRadius: 8, fontSize: 11, color: "#F59E0B", display: "flex", alignItems: "center", gap: 6 }}>
                            <Loader2 size={12} />
                            Waiting for admin response...
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Invite Dialog */}
      {showInviteDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => { setShowInviteDialog(false); setInviteError(null); }} />
          <div
            className="relative z-10 w-full max-w-sm rounded-2xl border border-modern-card-border bg-surface-card p-6"
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-bold text-ink">Invite Team Member</h3>
              <button onClick={() => { setShowInviteDialog(false); setInviteError(null); }} className="text-ink-secondary hover:text-ink">
                <X size={18} />
              </button>
            </div>
            <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-ink-secondary">
              Email Address
            </label>
            <input
              type="email"
              placeholder="colleague@company.com"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              className="mb-3 w-full rounded-lg border border-modern-card-border bg-surface-raised px-3 py-2.5 text-sm text-ink outline-none placeholder:text-ink-secondary/50 focus:border-editorial-red"
            />
            <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-ink-secondary">
              Role
            </label>
            <select
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value)}
              className="mb-4 w-full rounded-lg border border-modern-card-border bg-surface-raised px-3 py-2.5 text-sm text-ink outline-none"
            >
              <option value="viewer">Viewer — Can view campaigns and analytics</option>
              <option value="manager">Manager — Can manage campaigns and proposals</option>
            </select>
            {inviteError && (
              <p className="mb-3 text-xs font-semibold text-red-500">{inviteError}</p>
            )}
            <button
              onClick={handleInvite}
              disabled={!inviteEmail.trim() || inviteSent || inviting}
              className="w-full rounded-lg bg-editorial-red px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-white transition-colors hover:bg-editorial-red/90 disabled:opacity-50"
            >
              {inviteSent ? "Invite Sent!" : inviting ? "Sending..." : "Send Invite"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
