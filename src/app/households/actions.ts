"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { sendInvitationEmail } from "@/lib/email";

export async function createHousehold(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  // Routed through a SECURITY DEFINER RPC because the direct INSERT was
  // rejected by RLS on production even though created_by = auth.uid(). The
  // RPC reads auth.uid() server-side and bypasses the WITH CHECK.
  const { data: householdId, error } = await supabase.rpc("create_household", {
    p_name: name,
  });
  if (error || !householdId) {
    throw new Error(error?.message ?? "Failed to create household");
  }

  revalidatePath("/households");
  redirect(`/households/${householdId}`);
}

export async function inviteToHousehold(
  householdId: string,
  formData: FormData,
) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!email) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const { data: invitation, error } = await supabase
    .from("household_invitations")
    .insert({
      household_id: householdId,
      email,
      invited_by: user.id,
    })
    .select("token, household_id")
    .single();
  if (error || !invitation) throw new Error(error?.message ?? "insert failed");

  // Best-effort email send; failure is non-fatal — owner can still copy the link
  try {
    const [{ data: householdRow }, { data: profileRow }, hdrs] =
      await Promise.all([
        supabase
          .from("households")
          .select("name")
          .eq("id", householdId)
          .maybeSingle(),
        supabase
          .from("profiles")
          .select("display_name, email")
          .eq("id", user.id)
          .maybeSingle(),
        headers(),
      ]);
    const proto = hdrs.get("x-forwarded-proto") ?? "https";
    const host = hdrs.get("host") ?? "www.my-fi-app.com";
    const inviterName =
      profileRow?.display_name ?? profileRow?.email ?? user.email ?? "Someone";
    await sendInvitationEmail({
      to: email,
      householdName: householdRow?.name ?? "a household",
      inviterName,
      acceptUrl: `${proto}://${host}/invitations/${invitation.token}`,
    });
  } catch {
    // intentional — UI still shows the copy-link fallback
  }

  revalidatePath(`/households/${householdId}`);
}

export async function leaveHousehold(householdId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const { error } = await supabase
    .from("household_members")
    .delete()
    .eq("household_id", householdId)
    .eq("user_id", user.id);
  if (error) throw new Error(error.message);

  revalidatePath("/households");
  redirect("/households");
}

export async function acceptInvitation(token: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/?next=${encodeURIComponent(`/invitations/${token}`)}`);

  const { data, error } = await supabase.rpc("accept_household_invitation", {
    p_token: token,
  });
  if (error) throw new Error(error.message);

  revalidatePath("/households");
  redirect(`/households/${data}`);
}
