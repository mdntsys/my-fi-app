import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import RecentTransactions from "@/components/RecentTransactions";
import SharedHeader from "@/components/SharedHeader";

export const dynamic = "force-dynamic";

export default async function TransactionsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  return (
    <>
      <SharedHeader />
      <main className="flex flex-1 flex-col px-6 py-10">
        <div className="mx-auto w-full max-w-4xl">
          <h1 className="text-2xl font-semibold tracking-tight">Transactions</h1>
          <div className="mt-6">
            <RecentTransactions />
          </div>
        </div>
      </main>
    </>
  );
}
