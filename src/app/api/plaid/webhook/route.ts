import { NextResponse, type NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { verifyPlaidWebhook } from "@/lib/plaid-webhook";
import { syncPlaidItem } from "@/lib/sync";

type PlaidWebhookBody = {
  webhook_type: string;
  webhook_code: string;
  item_id: string; // Plaid's external item id (text)
  error?: { error_code?: string; error_message?: string } | null;
};

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const sig = req.headers.get("plaid-verification");

  const valid = await verifyPlaidWebhook(rawBody, sig);
  if (!valid) {
    return NextResponse.json({ error: "invalid signature" }, { status: 401 });
  }

  let body: PlaidWebhookBody;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const supabase = createServiceClient();

  // Look up our row using Plaid's external item_id
  const { data: itemRow, error } = await supabase
    .from("plaid_items")
    .select("id, user_id, access_token")
    .eq("item_id", body.item_id)
    .maybeSingle();
  if (error || !itemRow) {
    // Not our item, or DB error. Ack so Plaid doesn't retry forever.
    return NextResponse.json({ ok: true, note: "item not found" });
  }

  try {
    if (body.webhook_type === "TRANSACTIONS") {
      switch (body.webhook_code) {
        case "SYNC_UPDATES_AVAILABLE":
        case "INITIAL_UPDATE":
        case "HISTORICAL_UPDATE":
        case "DEFAULT_UPDATE":
          await syncPlaidItem(supabase, itemRow);
          break;
        case "TRANSACTIONS_REMOVED":
          await syncPlaidItem(supabase, itemRow);
          break;
        default:
          break;
      }
    } else if (body.webhook_type === "ITEM") {
      if (body.webhook_code === "ERROR" && body.error) {
        await supabase
          .from("plaid_sync_state")
          .upsert({
            item_id: itemRow.id,
            last_error: `${body.error.error_code ?? "ITEM_ERROR"}: ${body.error.error_message ?? ""}`.trim(),
          });
      }
      // PENDING_EXPIRATION, USER_PERMISSION_REVOKED, NEW_ACCOUNTS_AVAILABLE handled later
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await supabase
      .from("plaid_sync_state")
      .upsert({ item_id: itemRow.id, last_error: message });
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
