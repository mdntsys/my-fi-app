import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { inviteToHousehold, leaveHousehold } from "../actions";
import InviteLinkCopier from "@/components/InviteLinkCopier";

export const dynamic = "force-dynamic";

export default async function HouseholdDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const { data: household } = await supabase
    .from("households")
    .select("id, name, created_by")
    .eq("id", id)
    .maybeSingle();
  if (!household) notFound();

  const isOwner = household.created_by === user.id;

  const { data: members } = await supabase
    .from("household_members")
    .select("user_id, role, joined_at")
    .eq("household_id", id);

  const userIds = (members ?? []).map((m) => m.user_id);
  const { data: profilesRows } = userIds.length
    ? await supabase
        .from("profiles")
        .select("id, email, display_name")
        .in("id", userIds)
    : { data: [] as Array<{ id: string; email: string; display_name: string | null }> };
  const profileById = new Map(
    (profilesRows ?? []).map((p) => [p.id, p]),
  );

  const { data: invitations } = await supabase
    .from("household_invitations")
    .select("id, email, token, expires_at, accepted_at, created_at")
    .eq("household_id", id)
    .is("accepted_at", null)
    .order("created_at", { ascending: false });

  const hdrs = await headers();
  const proto = hdrs.get("x-forwarded-proto") ?? "https";
  const host = hdrs.get("host") ?? "www.my-fi-app.com";
  const baseUrl = `${proto}://${host}`;

  const inviteAction = inviteToHousehold.bind(null, id);
  const leaveAction = leaveHousehold.bind(null, id);

  return (
    <main className="flex flex-1 flex-col px-6 py-10">
      <div className="mx-auto w-full max-w-3xl">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="size-7 rounded-full bg-primary" />
            <h1 className="text-2xl font-semibold tracking-tight">
              {household.name}
            </h1>
          </div>
          <Link
            href="/households"
            className="text-sm text-ink-muted hover:text-primary"
          >
            ← Households
          </Link>
        </header>

        <section className="mt-10">
          <h2 className="text-lg font-semibold">Members</h2>
          <ul className="mt-3 divide-y divide-line rounded-2xl border border-line bg-surface">
            {(members ?? []).map((m) => {
              const profile = profileById.get(m.user_id);
              return (
                <li
                  key={m.user_id}
                  className="flex items-center justify-between px-4 py-3"
                >
                  <div>
                    <div className="text-sm font-medium text-ink">
                      {profile?.display_name ?? profile?.email ?? m.user_id}
                    </div>
                    <div className="text-xs text-ink-muted">
                      {m.role}
                      {m.user_id === user.id ? " · you" : ""}
                    </div>
                  </div>
                  {m.user_id === user.id && !isOwner && (
                    <form action={leaveAction}>
                      <button
                        type="submit"
                        className="text-xs text-danger hover:underline"
                      >
                        Leave household
                      </button>
                    </form>
                  )}
                </li>
              );
            })}
          </ul>
        </section>

        {isOwner && (
          <section className="mt-10">
            <h2 className="text-lg font-semibold">Invite a member</h2>
            <form
              action={inviteAction}
              className="mt-3 flex gap-2 rounded-2xl border border-line bg-surface p-4"
            >
              <input
                name="email"
                type="email"
                required
                placeholder="invitee@example.com"
                className="flex-1 rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink placeholder:text-ink-faint focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary-soft"
              />
              <button
                type="submit"
                className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-contrast hover:bg-primary-hover"
              >
                Create invite
              </button>
            </form>

            {invitations && invitations.length > 0 && (
              <div className="mt-6">
                <h3 className="text-sm font-medium text-ink">
                  Pending invitations
                </h3>
                <p className="mt-1 text-xs text-ink-muted">
                  Copy a link and send it to the invitee. They need to sign in
                  with the same email to accept.
                </p>
                <ul className="mt-3 divide-y divide-line rounded-2xl border border-line bg-surface">
                  {invitations.map((inv) => (
                    <li key={inv.id} className="px-4 py-3">
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="truncate text-sm font-medium text-ink">
                            {inv.email}
                          </div>
                          <div className="text-xs text-ink-muted">
                            Expires{" "}
                            {new Date(inv.expires_at).toLocaleDateString()}
                          </div>
                        </div>
                        <InviteLinkCopier
                          url={`${baseUrl}/invitations/${inv.token}`}
                        />
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>
        )}
      </div>
    </main>
  );
}
