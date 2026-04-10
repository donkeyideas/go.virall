"use client";

import { useState, useTransition, useRef } from "react";
import { Loader2, Camera } from "lucide-react";
import { updateProfile, updatePassword, deleteAccount, uploadAvatar } from "@/lib/actions/settings";
import type { Profile } from "@/types";

interface AccountTabProps {
  profile: Profile | null;
  userEmail: string | null;
}

export function AccountTab({ profile, userEmail }: AccountTabProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Form state
  const [fullName, setFullName] = useState(profile?.full_name ?? "");
  const [displayName, setDisplayName] = useState(profile?.display_name ?? "");
  const [bio, setBio] = useState(profile?.bio ?? "");
  const [niche, setNiche] = useState(profile?.niche ?? "");
  const [location, setLocation] = useState(profile?.location ?? "");

  // Avatar upload
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url ?? null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Password modal state
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [passwordPending, startPasswordTransition] = useTransition();

  // Delete confirmation
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletePending, startDeleteTransition] = useTransition();

  const initial = (profile?.full_name ?? userEmail ?? "U")[0].toUpperCase();

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadError(null);
    const formData = new FormData();
    formData.append("file", file);

    const result = await uploadAvatar(formData);
    setUploading(false);

    if (result.success && result.url) {
      setAvatarUrl(result.url);
    } else {
      setUploadError(result.error || "Upload failed");
    }
  }

  function handleSave() {
    setError(null);
    setSuccess(false);
    const fd = new FormData();
    fd.set("fullName", fullName);
    fd.set("displayName", displayName);
    fd.set("bio", bio);
    fd.set("niche", niche);
    fd.set("location", location);

    startTransition(async () => {
      const result = await updateProfile(fd);
      if (result.error) {
        setError(result.error);
      } else {
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
      }
    });
  }

  function handlePasswordChange() {
    setPasswordError(null);
    setPasswordSuccess(false);
    const fd = new FormData();
    fd.set("newPassword", newPassword);
    fd.set("confirmPassword", confirmPassword);

    startPasswordTransition(async () => {
      const result = await updatePassword(fd);
      if (result.error) {
        setPasswordError(result.error);
      } else {
        setPasswordSuccess(true);
        setNewPassword("");
        setConfirmPassword("");
        setTimeout(() => {
          setPasswordSuccess(false);
          setShowPasswordForm(false);
        }, 2000);
      }
    });
  }

  function handleDelete() {
    startDeleteTransition(async () => {
      await deleteAccount();
    });
  }

  return (
    <div>
      {/* Profile Information */}
      <h3 className="font-serif text-lg font-bold text-ink mb-6">
        Profile Information
      </h3>

      {error && (
        <div className="mb-4 border border-rule bg-surface-raised px-3 py-2 text-xs text-editorial-red">
          {error}
        </div>
      )}
      {success && (
        <div className="mb-4 border border-rule bg-surface-raised px-3 py-2 text-xs text-editorial-green">
          Settings saved successfully
        </div>
      )}

      <div className="flex items-start gap-6 mb-8">
        {/* Avatar with upload */}
        <div className="flex flex-col items-center gap-2 shrink-0">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={handleAvatarUpload}
            className="hidden"
          />
          <div
            onClick={() => fileInputRef.current?.click()}
            className="relative flex h-20 w-20 items-center justify-center rounded-full border-2 border-rule bg-surface-raised cursor-pointer overflow-hidden group"
          >
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt="Profile"
                className="h-full w-full object-cover"
              />
            ) : (
              <span className="font-serif text-2xl font-bold text-ink-muted">
                {initial}
              </span>
            )}
            {/* Hover overlay */}
            <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity">
              {uploading ? (
                <Loader2 size={18} className="animate-spin text-white" />
              ) : (
                <Camera size={18} className="text-white" />
              )}
            </div>
          </div>
          {uploadError && (
            <span className="text-[10px] text-editorial-red max-w-[100px] text-center">
              {uploadError}
            </span>
          )}
        </div>

        {/* Name & Handle */}
        <div className="pt-3">
          <p className="font-serif text-base font-bold text-ink">
            {profile?.full_name ?? "Your Name"}
          </p>
          <p className="text-xs text-ink-muted">
            @{profile?.display_name ?? "username"}
          </p>
        </div>

        {/* Bio (right side on desktop) */}
        <div className="hidden sm:block ml-auto w-1/2">
          <label className="editorial-overline mb-1.5 block">Bio</label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Tell brands about yourself..."
            rows={3}
            className="w-full border border-rule bg-surface-raised px-3 py-2 text-sm text-ink outline-none focus:border-ink-muted resize-y"
          />
        </div>
      </div>

      {/* Form Grid */}
      <div className="grid grid-cols-1 gap-x-8 gap-y-5 sm:grid-cols-2 mb-8">
        <div>
          <label className="editorial-overline mb-1.5 block">Full Name</label>
          <input
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Your full name"
            className="w-full border border-rule bg-surface-raised px-3 py-2 text-sm text-ink outline-none focus:border-ink-muted"
          />
        </div>

        <div className="sm:hidden">
          <label className="editorial-overline mb-1.5 block">Bio</label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Tell brands about yourself..."
            rows={3}
            className="w-full border border-rule bg-surface-raised px-3 py-2 text-sm text-ink outline-none focus:border-ink-muted resize-y"
          />
        </div>

        <div>
          <label className="editorial-overline mb-1.5 block">
            Niche / Category
          </label>
          <input
            type="text"
            value={niche}
            onChange={(e) => setNiche(e.target.value)}
            placeholder="e.g. Lifestyle & Fashion"
            className="w-full border border-rule bg-surface-raised px-3 py-2 text-sm text-ink outline-none focus:border-ink-muted"
          />
        </div>

        <div>
          <label className="editorial-overline mb-1.5 block">
            Email Address
          </label>
          <input
            type="email"
            value={userEmail ?? ""}
            disabled
            className="w-full border border-rule bg-surface-inset px-3 py-2 text-sm text-ink-muted outline-none opacity-70 cursor-not-allowed"
          />
        </div>

        <div>
          <label className="editorial-overline mb-1.5 block">Location</label>
          <input
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="e.g. New York, NY"
            className="w-full border border-rule bg-surface-raised px-3 py-2 text-sm text-ink outline-none focus:border-ink-muted"
          />
        </div>

        <div>
          <label className="editorial-overline mb-1.5 block">
            Display Name
          </label>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Your display name"
            className="w-full border border-rule bg-surface-raised px-3 py-2 text-sm text-ink outline-none focus:border-ink-muted"
          />
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-rule my-6" />

      {/* Two-Factor Authentication */}
      <div className="flex items-center justify-between py-4 border-b border-rule">
        <div>
          <p className="text-sm font-semibold text-ink">
            Two-Factor Authentication
          </p>
          <p className="text-xs text-ink-muted mt-0.5">
            Add an extra layer of security to your account
          </p>
        </div>
        <button className="border border-rule px-4 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-ink-secondary hover:text-ink hover:border-ink-muted transition-colors">
          Enable
        </button>
      </div>

      {/* Change Password */}
      <div className="py-4 border-b border-rule">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-ink">Change Password</p>
            <p className="text-xs text-ink-muted mt-0.5">
              Update your account password
            </p>
          </div>
          <button
            onClick={() => setShowPasswordForm(!showPasswordForm)}
            className="border border-rule px-4 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-ink-secondary hover:text-ink hover:border-ink-muted transition-colors"
          >
            Update
          </button>
        </div>

        {showPasswordForm && (
          <div className="mt-4 max-w-sm space-y-3">
            {passwordError && (
              <div className="border border-rule bg-surface-raised px-3 py-2 text-xs text-editorial-red">
                {passwordError}
              </div>
            )}
            {passwordSuccess && (
              <div className="border border-rule bg-surface-raised px-3 py-2 text-xs text-editorial-green">
                Password updated
              </div>
            )}
            <div>
              <label className="editorial-overline mb-1 block">
                New Password
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Min. 8 characters"
                className="w-full border border-rule bg-surface-raised px-3 py-2 text-sm text-ink outline-none focus:border-ink-muted"
              />
            </div>
            <div>
              <label className="editorial-overline mb-1 block">
                Confirm Password
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repeat password"
                className="w-full border border-rule bg-surface-raised px-3 py-2 text-sm text-ink outline-none focus:border-ink-muted"
              />
            </div>
            <button
              onClick={handlePasswordChange}
              disabled={passwordPending}
              className="inline-flex items-center gap-1.5 bg-ink px-4 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-surface-cream hover:bg-ink/80 disabled:opacity-50 transition-colors"
            >
              {passwordPending && (
                <Loader2 size={11} className="animate-spin" />
              )}
              {passwordPending ? "Updating..." : "Update Password"}
            </button>
          </div>
        )}
      </div>

      {/* Footer Actions */}
      <div className="mt-8 flex items-center justify-between">
        <button
          onClick={handleSave}
          disabled={isPending}
          className="inline-flex items-center gap-1.5 bg-ink px-5 py-2.5 text-[10px] font-semibold uppercase tracking-widest text-surface-cream hover:bg-ink/80 disabled:opacity-50 transition-colors"
        >
          {isPending && <Loader2 size={11} className="animate-spin" />}
          {isPending ? "Saving..." : "Save Changes"}
        </button>

        {!showDeleteConfirm ? (
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="border border-editorial-red px-4 py-2 text-[10px] font-semibold uppercase tracking-widest text-editorial-red hover:bg-editorial-red/5 transition-colors"
          >
            Delete Account
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <span className="text-xs text-editorial-red">Are you sure?</span>
            <button
              onClick={handleDelete}
              disabled={deletePending}
              className="bg-editorial-red px-4 py-2 text-[10px] font-semibold uppercase tracking-widest text-white hover:bg-editorial-red/90 disabled:opacity-50 transition-colors"
            >
              {deletePending ? "Deleting..." : "Yes, Delete"}
            </button>
            <button
              onClick={() => setShowDeleteConfirm(false)}
              className="border border-rule px-4 py-2 text-[10px] font-semibold uppercase tracking-widest text-ink-secondary hover:text-ink transition-colors"
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
