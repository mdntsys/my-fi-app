"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { currentMonth, isPastMonth, type EditScope, type Month } from "@/lib/budget-month";
import { PFC_DETAILED } from "@/lib/plaid-categories";

async function defaultHouseholdId(): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("households")
    .select("id")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  return data?.id ?? null;
}

function validMonth(m: string): m is Month {
  return /^\d{4}-\d{2}-01$/.test(m);
}

function validCategory(c: string): boolean {
  return Object.prototype.hasOwnProperty.call(PFC_DETAILED, c);
}

export async function setBudget(formData: FormData): Promise<void> {
  const category = String(formData.get("category") ?? "").trim();
  const month = String(formData.get("month") ?? "").trim();
  const scope = String(formData.get("scope") ?? "this_month").trim() as EditScope;
  const limitRaw = String(formData.get("monthly_limit") ?? "").trim();
  const householdIdRaw = String(formData.get("household_id") ?? "").trim();

  if (!validCategory(category) || !validMonth(month)) return;
  if (scope !== "this_month" && scope !== "ongoing") return;
  if (isPastMonth(month)) return;
  const monthlyLimit = parseFloat(limitRaw);
  if (Number.isNaN(monthlyLimit) || monthlyLimit < 0) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const householdId = householdIdRaw || (await defaultHouseholdId());
  if (!householdId) throw new Error("no household");

  const { error: upsertErr } = await supabase.from("budgets").upsert(
    {
      household_id: householdId,
      category_detailed: category,
      effective_month: month,
      monthly_limit: monthlyLimit,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "household_id,category_detailed,effective_month" },
  );
  if (upsertErr) throw new Error(upsertErr.message);

  if (scope === "ongoing") {
    const { error: delErr } = await supabase
      .from("budgets")
      .delete()
      .eq("household_id", householdId)
      .eq("category_detailed", category)
      .gt("effective_month", month);
    if (delErr) throw new Error(delErr.message);
  }

  revalidatePath("/budget");
}

export async function removeBudget(formData: FormData): Promise<void> {
  const category = String(formData.get("category") ?? "").trim();
  const month = String(formData.get("month") ?? "").trim();
  const scope = String(formData.get("scope") ?? "ongoing").trim() as EditScope;
  const householdIdRaw = String(formData.get("household_id") ?? "").trim();

  if (!validCategory(category) || !validMonth(month)) return;
  if (scope !== "this_month" && scope !== "ongoing") return;
  if (isPastMonth(month)) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const householdId = householdIdRaw || (await defaultHouseholdId());
  if (!householdId) return;

  // Delete the row at this month, and (when ongoing) any later rows too.
  let q = supabase
    .from("budgets")
    .delete()
    .eq("household_id", householdId)
    .eq("category_detailed", category);
  q = scope === "ongoing" ? q.gte("effective_month", month) : q.eq("effective_month", month);
  const { error } = await q;
  if (error) throw new Error(error.message);

  revalidatePath("/budget");
}

export { currentMonth };
