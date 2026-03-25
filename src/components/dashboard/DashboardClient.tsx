"use client";

import { useState } from "react";
import { ProfileSelector } from "./ProfileSelector";
import { AddProfileModal } from "./AddProfileModal";
import type { SocialProfile, AnalysisType } from "@/types";

interface DashboardClientProps {
  profiles: SocialProfile[];
  children: (props: {
    selectedProfileId: string | null;
    selectedProfile: SocialProfile | null;
  }) => React.ReactNode;
}

export function DashboardClient({ profiles, children }: DashboardClientProps) {
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(
    profiles[0]?.id ?? null,
  );
  const [showOnboarding, setShowOnboarding] = useState(profiles.length === 0);

  const selectedProfile =
    profiles.find((p) => p.id === selectedProfileId) ?? null;

  return (
    <>
      {/* Profile selector bar */}
      {profiles.length > 0 && (
        <ProfileSelector
          profiles={profiles}
          selectedId={selectedProfileId}
          onSelect={setSelectedProfileId}
        />
      )}

      {/* Content */}
      {children({ selectedProfileId, selectedProfile })}

      {/* Onboarding modal */}
      <AddProfileModal
        open={showOnboarding}
        onClose={() => setShowOnboarding(false)}
        onboarding
      />
    </>
  );
}
