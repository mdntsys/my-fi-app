"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { plaid } from "@/lib/plaid";
import { syncPlaidItem, type PlaidItemRow } from "@/lib/sync";

export async function toggleAccountHousehold(
  accountId: string,
  householdId: string,
  formData: FormData,
): Promise<void> {
  const assign = formData.get("assigned") === "true";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  if (assign) {
    const { error } = await supabase
      .from("account_household_assignments")
      .insert({ account_id: accountId, household_id: householdId });
    if (error && !error.message.includes("duplicate")) {
      throw new Error(error.message);
    }
  } else {
    const { error } = await supabase
      .from("account_household_assignments")
      .delete()
      .eq("account_id", accountId)
      .eq("household_id", householdId);
    if (error) throw new Error(error.message);
  }

  revalidatePath("/accounts");
  revalidatePath(`/households/${householdId}`);
}

export async function disconnectItem(itemId: string): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const { data: item, error: fetchError } = await supabase
    .from("plaid_items")
    .select("id, user_id, access_token")
    .eq("id", itemId)
    .maybeSingle();
  if (fetchError) throw new Error(fetchError.message);
  if (!item || item.user_id !== user.id) {
    throw new Error("item not found");
  }

  try {
    await plaid.itemRemove({ access_token: item.access_token });
  } catch {
    // best-effort
  }

  const { error } = await supabase
    .from("plaid_items")
    .delete()
    .eq("id", item.id);
  if (error) throw new Error(error.message);

  revalidatePath("/dashboard");
  revalidatePath("/accounts");
}

export async function syncItemNow(itemId: string): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const { data: item, error } = await supabase
    .from("plaid_items")
    .select("id, user_id, access_token")
    .eq("id", itemId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!item || item.user_id !== user.id) throw new Error("item not found");

  try {
    await syncPlaidItem(supabase, item as PlaidItemRow);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await supabase
      .from("plaid_sync_state")
      .upsert({ item_id: item.id, last_error: message });
    throw new Error(message);
  }

  revalidatePath("/dashboard");
  revalidatePath("/accounts");
}
