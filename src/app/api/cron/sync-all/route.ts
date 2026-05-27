import { NextResponse, type NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { syncPlaidItem, type PlaidItemRow } from "@/lib/sync";

// Daily catch-up sync. Runs through every Plaid item and pulls anything the
// webhook missed (some institutions don't fire webhooks reliably).
//
// Protected via Vercel's built-in cron auth: requests originating from Vercel
// Cron carry an Authorization: Bearer <CRON_SECRET> header.

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
  }

  const supabase = createServiceClient();
  const { data: items, error } = await supabase
    .from("plaid_items")
    .select("id, user_id, access_token");
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const results: Array<{ item_id: string; ok: boolean; error?: string }> = [];
  for (const item of (items ?? []) as PlaidItemRow[]) {
    try {
      await syncPlaidItem(supabase, item);
      results.push({ item_id: item.id, ok: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await supabase
        .from("plaid_sync_state")
        .upsert({ item_id: item.id, last_error: message });
      results.push({ item_id: item.id, ok: false, error: message });
    }
  }

  return NextResponse.json({ ok: true, count: results.length, results });
}
