"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function setTransactionCategory(
  transactionId: string,
  formData: FormData,
): Promise<void> {
  const raw = String(formData.get("category") ?? "").trim();
  const next = raw === "" ? null : raw;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const { error } = await supabase
    .from("transactions")
    .update({
      category_override: next,
      updated_at: new Date().toISOString(),
    })
    .eq("id", transactionId);
  if (error) throw new Error(error.message);

  revalidatePath("/dashboard");
}
