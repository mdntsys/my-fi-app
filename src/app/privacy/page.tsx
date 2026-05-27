import Link from "next/link";

export const metadata = {
  title: "Privacy Policy · MyFi",
};

export default function PrivacyPage() {
  return (
    <main className="flex flex-1 flex-col px-6 py-12">
      <article className="mx-auto w-full max-w-2xl">
        <h1 className="text-3xl font-semibold tracking-tight">Privacy Policy</h1>
        <p className="mt-1 text-sm text-ink-faint">Last updated: May 26, 2026</p>

        <h2 className="mt-8 text-xl font-semibold">Who we are</h2>
        <p className="mt-2 text-ink-muted">
          MyFi is a household budgeting tool operated by Midnite Systems, LLC
          (&ldquo;we,&rdquo; &ldquo;us&rdquo;). This Privacy Policy explains what
          information we collect, how we use it, and the choices you have.
        </p>

        <h2 className="mt-6 text-xl font-semibold">Information we collect</h2>
        <ul className="mt-2 list-disc pl-6 text-ink-muted">
          <li>
            <strong className="text-ink">Account information:</strong> the email
            address you use to sign in, and any profile or household membership
            data you provide.
          </li>
          <li className="mt-2">
            <strong className="text-ink">Financial account data via Plaid:</strong>{" "}
            when you link a financial institution through Plaid, we receive
            transaction history, account balances, account names, and
            institution metadata for the accounts you authorize. We do not
            receive your bank login credentials.
          </li>
          <li className="mt-2">
            <strong className="text-ink">Usage and device data:</strong>{" "}
            standard application logs (timestamps, request paths, error data)
            used to operate and troubleshoot the service.
          </li>
        </ul>

        <h2 className="mt-6 text-xl font-semibold">How we use your information</h2>
        <ul className="mt-2 list-disc pl-6 text-ink-muted">
          <li>To display your transactions, balances, and budgets in the app.</li>
          <li className="mt-2">
            To aggregate spending at the household level only with members you
            have explicitly added.
          </li>
          <li className="mt-2">To authenticate you and keep your account secure.</li>
          <li className="mt-2">
            To operate, debug, and improve the service. We do not sell or rent
            your data.
          </li>
        </ul>

        <h2 className="mt-6 text-xl font-semibold">How we store it</h2>
        <p className="mt-2 text-ink-muted">
          Data is stored in Supabase (PostgreSQL) with row-level security
          policies restricting access to the owning user and explicitly
          authorized household members. Connections to our service are encrypted
          in transit.
        </p>

        <h2 className="mt-6 text-xl font-semibold">Plaid</h2>
        <p className="mt-2 text-ink-muted">
          We use Plaid Inc. to connect to your financial institutions. Plaid&apos;s
          handling of data is governed by{" "}
          <a
            href="https://plaid.com/legal/#end-user-privacy-policy"
            className="text-primary underline"
          >
            Plaid&apos;s End User Privacy Policy
          </a>
          . You can revoke Plaid&apos;s access at any time via{" "}
          <a href="https://my.plaid.com/" className="text-primary underline">
            my.plaid.com
          </a>
          .
        </p>

        <h2 className="mt-6 text-xl font-semibold">Your choices</h2>
        <ul className="mt-2 list-disc pl-6 text-ink-muted">
          <li>You can disconnect any linked institution from within MyFi.</li>
          <li className="mt-2">
            You can delete your account by emailing{" "}
            <a
              href="mailto:nic@midnitesystems.com"
              className="text-primary underline"
            >
              nic@midnitesystems.com
            </a>
            . We will delete your stored data within 30 days of the request.
          </li>
        </ul>

        <h2 className="mt-6 text-xl font-semibold">Contact</h2>
        <p className="mt-2 text-ink-muted">
          Questions:{" "}
          <a
            href="mailto:nic@midnitesystems.com"
            className="text-primary underline"
          >
            nic@midnitesystems.com
          </a>
          .
        </p>

        <p className="mt-10">
          <Link href="/" className="text-primary underline">
            ← Back to sign in
          </Link>
        </p>
      </article>
    </main>
  );
}
