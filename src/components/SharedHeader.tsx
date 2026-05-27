import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import UserMenu from "@/components/UserMenu";

export default async function SharedHeader() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", user.id)
    .maybeSingle();

  return (
    <div className="border-b border-line bg-surface">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-3">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="size-7 rounded-full bg-primary" />
          <span className="text-lg font-semibold tracking-tight">MyFi</span>
        </Link>
        <UserMenu
          email={user.email ?? ""}
          displayName={profile?.display_name ?? null}
        />
      </div>
    </div>
  );
}
