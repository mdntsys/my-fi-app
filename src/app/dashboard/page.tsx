import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import LinkAccount from "@/components/LinkAccount";
import AccountsList from "@/components/AccountsList";
import RecentTransactions from "@/components/RecentTransactions";
import MonthSpendByCategory from "@/components/MonthSpendByCategory";
import SignOutButton from "@/components/SignOutButton";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", user.id)
    .maybeSingle();
  const displayName = profile?.display_name ?? user.email;

  return (
    <main className="flex flex-1 flex-col px-6 py-10">
      <div className="mx-auto w-full max-w-4xl">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="size-7 rounded-full bg-primary" />
            <h1 className="text-2xl font-semibold tracking-tight">MyFi</h1>
          </div>
          <div className="flex items-center gap-4">
            <Link
              href="/accounts"
              className="text-sm text-ink-muted hover:text-primary"
            >
              Accounts
            </Link>
            <Link
              href="/households"
              className="text-sm text-ink-muted hover:text-primary"
            >
              Households
            </Link>
            <Link
              href="/settings"
              className="text-sm text-ink-muted hover:text-primary"
            >
              Settings
            </Link>
            <span className="text-sm text-ink-muted">{displayName}</span>
            <SignOutButton />
          </div>
        </header>

        <section className="mt-10">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Connect a bank</h2>
            <LinkAccount />
          </div>
          <p className="mt-1 text-sm text-ink-muted">
            Linked institutions sync transactions automatically.
          </p>
        </section>

        <section className="mt-10">
          <h2 className="text-lg font-semibold">Accounts</h2>
          <div className="mt-3">
            <AccountsList />
          </div>
        </section>

        <section className="mt-10">
          <h2 className="text-lg font-semibold">This month by category</h2>
          <div className="mt-3">
            <MonthSpendByCategory />
          </div>
        </section>

        <section className="mt-10">
          <h2 className="text-lg font-semibold">Recent transactions</h2>
          <div className="mt-3">
            <RecentTransactions />
          </div>
        </section>
      </div>
    </main>
  );
}
