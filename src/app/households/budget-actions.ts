"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function upsertBudget(
  householdId: string,
  formData: FormData,
): Promise<void> {
  const category = String(formData.get("category") ?? "").trim();
  const limitRaw = String(formData.get("monthly_limit") ?? "").trim();
  const monthlyLimit = parseFloat(limitRaw);

  if (!category || Number.isNaN(monthlyLimit) || monthlyLimit < 0) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const { error } = await supabase
    .from("budgets")
    .upsert(
      {
        household_id: householdId,
        category_primary: category,
        monthly_limit: monthlyLimit,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "household_id,category_primary" },
    );
  if (error) throw new Error(error.message);

  revalidatePath(`/households/${householdId}`);
  revalidatePath("/dashboard");
}

export async function deleteBudget(
  householdId: string,
  category: string,
): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const { error } = await supabase
    .from("budgets")
    .delete()
    .eq("household_id", householdId)
    .eq("category_primary", category);
  if (error) throw new Error(error.message);

  revalidatePath(`/households/${householdId}`);
  revalidatePath("/dashboard");
}
