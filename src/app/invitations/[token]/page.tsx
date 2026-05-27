import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { acceptInvitation } from "@/app/households/actions";

export const dynamic = "force-dynamic";

export default async function InvitationPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect(`/?next=${encodeURIComponent(`/invitations/${token}`)}`);
  }

  const { data: invitation } = await supabase
    .from("household_invitations")
    .select("id, email, expires_at, accepted_at, households(name)")
    .eq("token", token)
    .maybeSingle();

  const rawHousehold = invitation?.households as unknown;
  const householdObj = Array.isArray(rawHousehold)
    ? rawHousehold[0]
    : rawHousehold;
  const household = householdObj as { name: string } | null;

  const acceptAction = async () => {
    "use server";
    return acceptInvitation(token);
  };

  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm rounded-2xl border border-line bg-surface p-6 shadow-sm">
        <div className="flex items-center gap-2">
          <div className="size-7 rounded-full bg-primary" />
          <h1 className="text-xl font-semibold tracking-tight">
            Household invitation
          </h1>
        </div>

        {!invitation ? (
          <p className="mt-4 text-sm text-danger">
            This invitation is invalid or has been revoked.
          </p>
        ) : invitation.accepted_at ? (
          <p className="mt-4 text-sm text-ink-muted">
            This invitation has already been accepted.
          </p>
        ) : new Date(invitation.expires_at) < new Date() ? (
          <p className="mt-4 text-sm text-danger">This invitation has expired.</p>
        ) : invitation.email.toLowerCase() !== user.email?.toLowerCase() ? (
          <p className="mt-4 text-sm text-danger">
            This invitation is for{" "}
            <span className="font-medium text-ink">{invitation.email}</span>.
            You&apos;re signed in as{" "}
            <span className="font-medium text-ink">{user.email}</span>. Sign out
            and sign in with the invited email to accept.
          </p>
        ) : (
          <>
            <p className="mt-4 text-sm text-ink-muted">
              You&apos;ve been invited to join{" "}
              <span className="font-medium text-ink">
                {household?.name ?? "a household"}
              </span>
              .
            </p>
            <form action={acceptAction} className="mt-4">
              <button
                type="submit"
                className="w-full rounded-lg bg-primary px-3 py-2.5 text-sm font-medium text-primary-contrast transition hover:bg-primary-hover"
              >
                Accept invitation
              </button>
            </form>
          </>
        )}

        <p className="mt-6 text-xs text-ink-faint">
          <Link href="/dashboard" className="underline hover:text-primary">
            Go to dashboard
          </Link>
        </p>
      </div>
    </main>
  );
}
