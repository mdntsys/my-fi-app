"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { plaid } from "@/lib/plaid";

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

  // Best-effort revoke on Plaid side; ignore failures so DB cleanup still proceeds
  try {
    await plaid.itemRemove({ access_token: item.access_token });
  } catch {
    // intentional
  }

  // Cascades delete accounts, transactions, sync state, assignments
  const { error } = await supabase
    .from("plaid_items")
    .delete()
    .eq("id", item.id);
  if (error) throw new Error(error.message);

  revalidatePath("/dashboard");
  revalidatePath("/accounts");
}
