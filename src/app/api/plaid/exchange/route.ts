import { NextResponse, type NextRequest } from "next/server";
import { CountryCode } from "plaid";
import { createClient } from "@/lib/supabase/server";
import { plaid } from "@/lib/plaid";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { public_token } = await req.json();
  if (!public_token) {
    return NextResponse.json(
      { error: "public_token required" },
      { status: 400 },
    );
  }

  const exchange = await plaid.itemPublicTokenExchange({ public_token });
  const accessToken = exchange.data.access_token;
  const plaidItemId = exchange.data.item_id;

  const itemResp = await plaid.itemGet({ access_token: accessToken });
  const institutionId = itemResp.data.item.institution_id ?? null;
  let institutionName: string | null = null;
  if (institutionId) {
    const inst = await plaid.institutionsGetById({
      institution_id: institutionId,
      country_codes: [CountryCode.Us],
    });
    institutionName = inst.data.institution.name;
  }

  const { data: itemRow, error: insertError } = await supabase
    .from("plaid_items")
    .insert({
      user_id: user.id,
      access_token: accessToken,
      item_id: plaidItemId,
      institution_id: institutionId,
      institution_name: institutionName,
    })
    .select("id")
    .single();

  if (insertError || !itemRow) {
    return NextResponse.json(
      { error: insertError?.message ?? "failed to persist item" },
      { status: 500 },
    );
  }

  // Seed sync state row (empty cursor → first sync pulls history)
  await supabase
    .from("plaid_sync_state")
    .insert({ item_id: itemRow.id });

  return NextResponse.json({
    ok: true,
    item_id: itemRow.id,
    institution: institutionName,
  });
}
