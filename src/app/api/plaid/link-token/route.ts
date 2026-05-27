import { NextResponse } from "next/server";
import { CountryCode, Products } from "plaid";
import { createClient } from "@/lib/supabase/server";
import { plaid } from "@/lib/plaid";

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const response = await plaid.linkTokenCreate({
    user: { client_user_id: user.id },
    client_name: "MyFi",
    products: [Products.Transactions],
    country_codes: [CountryCode.Us],
    language: "en",
    webhook: process.env.PLAID_WEBHOOK_URL || undefined,
  });

  return NextResponse.json({ link_token: response.data.link_token });
}
