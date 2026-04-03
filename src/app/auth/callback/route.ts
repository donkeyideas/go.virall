import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=missing_code`);
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !data.user) {
    console.error("[auth/callback] exchangeCodeForSession failed:", error);
    return NextResponse.redirect(`${origin}/login?error=auth_failed`);
  }

  // Check if this user already has a profile (returning user)
  const admin = createAdminClient();
  const { data: existingProfile } = await admin
    .from("profiles")
    .select("id")
    .eq("id", data.user.id)
    .single();

  if (!existingProfile) {
    // New OAuth user — create organization + profile
    const fullName =
      data.user.user_metadata?.full_name ||
      data.user.user_metadata?.name ||
      data.user.email?.split("@")[0] ||
      "User";

    const slug = fullName
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "-")
      .slice(0, 30);

    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + 14);

    const { data: org } = await admin
      .from("organizations")
      .insert({
        name: `${fullName}'s Dashboard`,
        slug: `${slug}-${Date.now().toString(36)}`,
        plan: "free",
        max_social_profiles: 1,
        subscription_status: "trialing",
        trial_ends_at: trialEndsAt.toISOString(),
      })
      .select("id")
      .single();

    if (org) {
      await admin.from("profiles").insert({
        id: data.user.id,
        organization_id: org.id,
        full_name: fullName,
        avatar_url: data.user.user_metadata?.avatar_url || null,
        role: "owner",
      });
    }

    return NextResponse.redirect(`${origin}/welcome`);
  }

  return NextResponse.redirect(`${origin}${next}`);
}
