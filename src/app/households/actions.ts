"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function createHousehold(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const { data, error } = await supabase
    .from("households")
    .insert({ name, created_by: user.id })
    .select("id")
    .single();
  if (error || !data) {
    throw new Error(error?.message ?? "Failed to create household");
  }

  revalidatePath("/households");
  redirect(`/households/${data.id}`);
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

  const { error } = await supabase.from("household_invitations").insert({
    household_id: householdId,
    email,
    invited_by: user.id,
  });
  if (error) throw new Error(error.message);

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
