"use client";

import { useState, useEffect } from "react";
import { X, UserPlus, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { inviteTeamMember, getTeamInvites, cancelTeamInvite } from "@/lib/actions/settings";
import type { Profile, Organization } from "@/types";

type Role = "owner" | "manager" | "viewer";

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: Role;
  status: "online" | "offline" | "pending";
  lastActive: string;
}

const ROLE_LABELS: Record<Role, string> = { owner: "Owner", manager: "Manager", viewer: "Viewer" };

const ROLE_COLORS: Record<Role, string> = {
  owner: "bg-editorial-red/10 text-editorial-red",
  manager: "bg-editorial-blue/10 text-editorial-blue",
  viewer: "bg-editorial-gold/10 text-editorial-gold",
};

const STATUS_COLORS: Record<string, string> = {
  online: "bg-editorial-green/10 text-editorial-green",
  offline: "bg-surface-raised text-ink-muted",
  pending: "bg-editorial-gold/10 text-editorial-gold",
};

const ROLE_DESCRIPTIONS = [
  { role: "Owner", perms: "Full access — billing, team, all features, data export, account deletion" },
  { role: "Manager", perms: "All features — content, deals, campaigns, messages. No billing or team changes" },
  { role: "Viewer", perms: "Read-only — view analytics, reports, and content. No edits or actions" },
];

export function TeamTab({
  profile,
  organization,
  userEmail,
}: {
  profile: Profile | null;
  organization: Organization | null;
  userEmail: string | null;
}) {
  const plan = organization?.plan ?? "free";
  const canInvite = plan === "business" || plan === "enterprise";

  // Owner is always the first member
  const [members, setMembers] = useState<TeamMember[]>([
    {
      id: "owner",
      name: profile?.full_name ?? "You",
      email: userEmail ?? "",
      role: "owner",
      status: "online",
      lastActive: "Now",
    },
  ]);

  // Invite form
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [inviteRole, setInviteRole] = useState<Role>("manager");
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteSuccess, setInviteSuccess] = useState<string | null>(null);
  const [inviting, setInviting] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);

  // Editing role
  const [editingRoleId, setEditingRoleId] = useState<string | null>(null);

  // Fetch existing invites from DB on mount
  useEffect(() => {
    async function loadInvites() {
      const invites = await getTeamInvites();
      if (invites && invites.length > 0) {
        const dbMembers: TeamMember[] = invites.map((inv) => ({
          id: inv.id,
          name: inv.email.split("@")[0],
          email: inv.email,
          role: (inv.role as Role) ?? "viewer",
          status: inv.status === "accepted" ? ("online" as const) : ("pending" as const),
          lastActive:
            inv.status === "accepted"
              ? "Accepted"
              : `Invited ${new Date(inv.created_at).toLocaleDateString()}`,
        }));
        setMembers((prev) => {
          const owner = prev.find((m) => m.id === "owner");
          // Merge: owner + DB invites (avoid duplicates)
          const existingEmails = new Set(dbMembers.map((m) => m.email.toLowerCase()));
          const kept = owner ? [owner] : [];
          return [...kept, ...dbMembers.filter((m) => !existingEmails.has(owner?.email?.toLowerCase() ?? ""))];
        });
      }
    }
    loadInvites();
  }, []);

  async function handleInvite() {
    setInviteError(null);
    setInviteSuccess(null);

    if (!inviteEmail.trim() || !inviteEmail.includes("@")) {
      setInviteError("Please enter a valid email address.");
      return;
    }

    if (members.some((m) => m.email.toLowerCase() === inviteEmail.trim().toLowerCase())) {
      setInviteError("This email is already on the team.");
      return;
    }

    setInviting(true);
    try {
      const result = await inviteTeamMember(inviteEmail.trim().toLowerCase(), inviteRole);

      if ("error" in result && result.error) {
        setInviteError(result.error);
        return;
      }

      // Add to local state
      const newMember: TeamMember = {
        id: result.inviteId ?? crypto.randomUUID(),
        name: inviteName.trim() || inviteEmail.split("@")[0],
        email: inviteEmail.trim().toLowerCase(),
        role: inviteRole,
        status: "pending",
        lastActive: "Invited just now",
      };

      setMembers([...members, newMember]);
      setInviteEmail("");
      setInviteName("");
      setInviteRole("manager");
      setShowInviteForm(false);

      if (result.emailSent) {
        setInviteSuccess(`Invite sent to ${newMember.email}`);
      } else {
        setInviteSuccess(`Invite created for ${newMember.email} (email delivery pending — check Resend API key)`);
      }

      setTimeout(() => setInviteSuccess(null), 6000);
    } finally {
      setInviting(false);
    }
  }

  async function handleRemove(id: string) {
    if (id === "owner") return;
    if (!confirm("Remove this team member?")) return;

    setRemoving(id);
    try {
      const result = await cancelTeamInvite(id);
      if ("error" in result && result.error) {
        setInviteError(result.error);
        return;
      }
      setMembers(members.filter((m) => m.id !== id));
    } finally {
      setRemoving(null);
    }
  }

  function handleRoleChange(id: string, role: Role) {
    if (id === "owner") return;
    setMembers(members.map((m) => (m.id === id ? { ...m, role } : m)));
    setEditingRoleId(null);
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="font-serif text-lg font-bold text-ink">Team Management</h3>
        <button
          onClick={() => setShowInviteForm(true)}
          className="inline-flex items-center gap-1.5 bg-ink px-4 py-2 text-[10px] font-semibold uppercase tracking-widest text-surface-cream hover:bg-ink/80 transition-colors"
        >
          <UserPlus size={12} /> Invite Member
        </button>
      </div>

      {/* Plan banner */}
      {!canInvite && (
        <div className="border border-editorial-gold/30 bg-editorial-gold/5 p-4 mb-6 flex items-start gap-3">
          <span className="bg-editorial-gold/20 text-editorial-gold text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 shrink-0 mt-0.5">
            Info
          </span>
          <div>
            <p className="text-sm font-semibold text-ink">
              Team feature available on Business and Enterprise plans
            </p>
            <p className="text-xs text-ink-muted mt-0.5">
              Your current {plan} plan supports 1 user. Invited members will be
              saved locally until you upgrade.
            </p>
          </div>
        </div>
      )}

      {/* Success message */}
      {inviteSuccess && (
        <div className="border border-editorial-green/30 bg-editorial-green/5 px-4 py-3 mb-4 text-xs font-semibold text-editorial-green">
          {inviteSuccess}
        </div>
      )}

      {/* Invite Form */}
      {showInviteForm && (
        <div className="border border-rule bg-surface-raised p-4 mb-6">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold text-ink">Invite a New Member</p>
            <button
              onClick={() => { setShowInviteForm(false); setInviteError(null); }}
              className="text-ink-muted hover:text-ink transition-colors"
            >
              <X size={16} />
            </button>
          </div>

          {inviteError && (
            <div className="mb-3 border border-rule bg-surface-card px-3 py-2 text-xs text-editorial-red">
              {inviteError}
            </div>
          )}

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 mb-3">
            <div>
              <label className="editorial-overline mb-1 block">Email</label>
              <input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="teammate@company.com"
                className="w-full border border-rule bg-surface-card px-3 py-2 text-sm text-ink outline-none focus:border-ink-muted"
              />
            </div>
            <div>
              <label className="editorial-overline mb-1 block">Name (optional)</label>
              <input
                type="text"
                value={inviteName}
                onChange={(e) => setInviteName(e.target.value)}
                placeholder="Their name"
                className="w-full border border-rule bg-surface-card px-3 py-2 text-sm text-ink outline-none focus:border-ink-muted"
              />
            </div>
            <div>
              <label className="editorial-overline mb-1 block">Role</label>
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value as Role)}
                className="w-full border border-rule bg-surface-card px-3 py-2 text-sm text-ink outline-none focus:border-ink-muted"
              >
                <option value="manager">Manager</option>
                <option value="viewer">Viewer</option>
              </select>
            </div>
          </div>

          <button
            onClick={handleInvite}
            disabled={inviting}
            className="inline-flex items-center gap-1.5 bg-ink px-4 py-2 text-[10px] font-semibold uppercase tracking-widest text-surface-cream hover:bg-ink/80 transition-colors disabled:opacity-50"
          >
            {inviting ? <Loader2 size={11} className="animate-spin" /> : <UserPlus size={11} />}
            {inviting ? "Sending..." : "Send Invite"}
          </button>
        </div>
      )}

      {/* Member Table */}
      <div className="border border-rule mb-8">
        {/* Header */}
        <div className="grid grid-cols-12 gap-2 px-4 py-2.5 border-b border-rule bg-surface-raised">
          <span className="editorial-overline col-span-4">Member</span>
          <span className="editorial-overline col-span-2">Role</span>
          <span className="editorial-overline col-span-2">Status</span>
          <span className="editorial-overline col-span-2">Last Active</span>
          <span className="editorial-overline col-span-2 text-right">Actions</span>
        </div>

        {members.map((member) => (
          <div
            key={member.id}
            className="grid grid-cols-12 gap-2 px-4 py-3 border-b border-rule last:border-b-0 items-center"
          >
            {/* Member info */}
            <div className="col-span-4 flex items-center gap-3 min-w-0">
              <div className="flex h-8 w-8 items-center justify-center rounded-full border border-rule bg-surface-raised shrink-0">
                <span className="text-xs font-bold text-ink-muted">
                  {(member.name[0] ?? "?").toUpperCase()}
                </span>
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-ink truncate">{member.name}</p>
                <p className="text-[10px] text-ink-muted font-mono truncate">{member.email}</p>
              </div>
            </div>

            {/* Role */}
            <div className="col-span-2 relative">
              {member.id === "owner" ? (
                <span className={cn("text-[9px] font-bold uppercase tracking-widest px-2 py-0.5", ROLE_COLORS[member.role])}>
                  {ROLE_LABELS[member.role]}
                </span>
              ) : editingRoleId === member.id ? (
                <select
                  autoFocus
                  value={member.role}
                  onChange={(e) => handleRoleChange(member.id, e.target.value as Role)}
                  onBlur={() => setEditingRoleId(null)}
                  className="border border-rule bg-surface-card px-2 py-0.5 text-xs text-ink outline-none focus:border-ink-muted"
                >
                  <option value="manager">Manager</option>
                  <option value="viewer">Viewer</option>
                </select>
              ) : (
                <button
                  onClick={() => setEditingRoleId(member.id)}
                  className={cn(
                    "text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 cursor-pointer hover:opacity-70 transition-opacity",
                    ROLE_COLORS[member.role],
                  )}
                  title="Click to change role"
                >
                  {ROLE_LABELS[member.role]}
                </button>
              )}
            </div>

            {/* Status */}
            <div className="col-span-2">
              <span className={cn("text-[9px] font-bold uppercase tracking-widest px-2 py-0.5", STATUS_COLORS[member.status])}>
                {member.status === "pending" ? "Pending" : member.status === "online" ? "Online" : "Offline"}
              </span>
            </div>

            {/* Last Active */}
            <div className="col-span-2">
              <span className="text-xs text-ink font-mono">{member.lastActive}</span>
            </div>

            {/* Actions */}
            <div className="col-span-2 text-right">
              {member.id !== "owner" && (
                <button
                  onClick={() => handleRemove(member.id)}
                  disabled={removing === member.id}
                  className="text-[10px] font-semibold uppercase tracking-widest text-editorial-red hover:text-editorial-red/70 transition-colors disabled:opacity-50"
                >
                  {removing === member.id ? "Removing..." : "Remove"}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Role Permissions */}
      <p className="editorial-overline mb-4">Role Permissions</p>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {ROLE_DESCRIPTIONS.map((r) => (
          <div key={r.role} className="border border-rule p-4">
            <h4 className="font-serif text-sm font-bold text-ink mb-2">{r.role}</h4>
            <p className="text-xs text-ink-secondary leading-relaxed">{r.perms}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
