import { NextResponse, type NextRequest } from "next/server";
import { CountryCode } from "plaid";
import { createClient } from "@/lib/supabase/server";
import { plaid } from "@/lib/plaid";

// Creates an update-mode link token for repairing a broken Plaid Item
// (e.g. credentials changed, MFA expired, USER_PERMISSION_REVOKED).
//
// In update mode the existing access_token is passed in; on completion the
// same access_token remains valid — no /item/public_token/exchange needed.

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { item_id } = await req.json();
  if (!item_id) {
    return NextResponse.json({ error: "item_id required" }, { status: 400 });
  }

  const { data: item, error } = await supabase
    .from("plaid_items")
    .select("access_token, user_id")
    .eq("id", item_id)
    .maybeSingle();
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!item || item.user_id !== user.id) {
    return NextResponse.json({ error: "item not found" }, { status: 404 });
  }

  const response = await plaid.linkTokenCreate({
    user: { client_user_id: user.id },
    client_name: "MyFi",
    country_codes: [CountryCode.Us],
    language: "en",
    access_token: item.access_token,
    webhook: process.env.PLAID_WEBHOOK_URL || undefined,
    redirect_uri: process.env.PLAID_REDIRECT_URI || undefined,
  });

  return NextResponse.json({ link_token: response.data.link_token });
}
