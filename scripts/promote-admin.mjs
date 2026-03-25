import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";

const envFile = readFileSync(".env.local", "utf-8");
const env = {};
for (const line of envFile.split(/\r?\n/)) {
  const match = line.match(/^([^#=]+)=(.*)$/);
  if (match) env[match[1].trim()] = match[2].trim().replace(/\r$/, "");
}

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// 1. Revert test account
console.log("Reverting test account to regular user...");
await supabase
  .from("profiles")
  .update({ system_role: "user" })
  .eq("id", "38a6ce12-1f05-486b-9db0-3d9ddb67e254");
console.log("✓ Done");

// 2. Check if info@donkeyideas.com already exists
const ADMIN_EMAIL = "info@donkeyideas.com";
const { data: authData } = await supabase.auth.admin.listUsers({ perPage: 1000 });
let authUser = authData?.users?.find((u) => u.email === ADMIN_EMAIL);

if (authUser) {
  console.log(`\nUser already exists: ${authUser.id}`);
} else {
  // Create org first
  console.log("\nCreating organization...");
  const { data: org, error: orgErr } = await supabase
    .from("organizations")
    .insert({
      name: "Go Virall Admin",
      slug: `govirall-admin-${Date.now().toString(36)}`,
      plan: "enterprise",
      subscription_status: "active",
    })
    .select("id")
    .single();

  if (orgErr) {
    console.error("Org creation failed:", orgErr.message);
    process.exit(1);
  }
  console.log(`✓ Org created: ${org.id}`);

  // Now create auth user
  console.log("Creating auth user...");
  const { data: newUser, error: createErr } = await supabase.auth.admin.createUser({
    email: ADMIN_EMAIL,
    password: "Seminole!1",
    email_confirm: true,
    user_metadata: { full_name: "Admin" },
  });

  if (createErr) {
    console.error("Auth user creation failed:", createErr.message);
    // Try alternative: maybe there's a trigger that needs the profile to exist
    // Let's try signUp approach
    console.log("Trying signUp approach...");
    const { data: signUpData, error: signUpErr } = await supabase.auth.admin.createUser({
      email: ADMIN_EMAIL,
      password: "Seminole!1",
      email_confirm: true,
    });
    if (signUpErr) {
      console.error("SignUp also failed:", signUpErr.message);
      process.exit(1);
    }
    authUser = signUpData.user;
  } else {
    authUser = newUser.user;
  }

  console.log(`✓ Auth user created: ${authUser.id}`);

  // Create profile
  console.log("Creating profile...");
  const { error: profErr } = await supabase.from("profiles").insert({
    id: authUser.id,
    organization_id: org.id,
    full_name: "Admin",
    role: "owner",
    system_role: "superadmin",
  });

  if (profErr) {
    console.error("Profile creation failed:", profErr.message);
    // Profile might have been auto-created by trigger, try update instead
    await supabase
      .from("profiles")
      .update({ system_role: "superadmin", organization_id: org.id })
      .eq("id", authUser.id);
  }
}

// 3. Ensure superadmin role
if (authUser) {
  await supabase
    .from("profiles")
    .update({ system_role: "superadmin" })
    .eq("id", authUser.id);
}

// 4. Verify
const { data: profile } = await supabase
  .from("profiles")
  .select("id, full_name, system_role, organization_id")
  .eq("id", authUser.id)
  .single();

console.log("\nFinal profile:", profile);
console.log(`\n✓ ${ADMIN_EMAIL} is superadmin`);
console.log("Login at http://localhost:3600/login then navigate to /admin");
