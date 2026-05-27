import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { syncPlaidItem, type PlaidItemRow, type SyncResult } from "@/lib/sync";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let targetItemId: string | null = null;
  try {
    const body = await req.json();
    targetItemId = body?.item_id ?? null;
  } catch {
    // empty body OK
  }

  let itemsQuery = supabase
    .from("plaid_items")
    .select("id, user_id, access_token")
    .eq("user_id", user.id);
  if (targetItemId) itemsQuery = itemsQuery.eq("id", targetItemId);

  const { data: items, error: itemsError } = await itemsQuery;
  if (itemsError) {
    return NextResponse.json({ error: itemsError.message }, { status: 500 });
  }
  if (!items || items.length === 0) {
    return NextResponse.json({ ok: true, results: [] });
  }

  const results: (SyncResult | { item_id: string; error: string })[] = [];
  for (const item of items as PlaidItemRow[]) {
    try {
      const result = await syncPlaidItem(supabase, item);
      results.push(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await supabase
        .from("plaid_sync_state")
        .upsert({ item_id: item.id, last_error: message });
      results.push({ item_id: item.id, error: message });
    }
  }

  return NextResponse.json({ ok: true, results });
}
