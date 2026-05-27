import Link from "next/link";

export const metadata = {
  title: "Terms of Service · MyFi",
};

export default function TermsPage() {
  return (
    <main className="flex flex-1 flex-col px-6 py-12">
      <article className="mx-auto w-full max-w-2xl">
        <h1 className="text-3xl font-semibold tracking-tight">Terms of Service</h1>
        <p className="mt-1 text-sm text-ink-faint">Last updated: May 26, 2026</p>

        <h2 className="mt-8 text-xl font-semibold">1. The service</h2>
        <p className="mt-2 text-ink-muted">
          MyFi (&ldquo;the service&rdquo;) is operated by Midnite Systems, LLC.
          The service lets you connect financial accounts via Plaid and view
          transactions, balances, and budgets, individually or with members of a
          household you create.
        </p>

        <h2 className="mt-6 text-xl font-semibold">2. Your account</h2>
        <p className="mt-2 text-ink-muted">
          You are responsible for activity that occurs under your account. Do
          not share your sign-in link. Notify us immediately at{" "}
          <a
            href="mailto:nic@midnitesystems.com"
            className="text-primary underline"
          >
            nic@midnitesystems.com
          </a>{" "}
          if you suspect unauthorized use.
        </p>

        <h2 className="mt-6 text-xl font-semibold">3. Acceptable use</h2>
        <ul className="mt-2 list-disc pl-6 text-ink-muted">
          <li>Do not use the service for any unlawful purpose.</li>
          <li className="mt-2">
            Do not attempt to access data belonging to other users or households
            you have not been authorized to view.
          </li>
          <li className="mt-2">
            Do not reverse engineer, scrape, or attempt to interfere with the
            service.
          </li>
        </ul>

        <h2 className="mt-6 text-xl font-semibold">4. Third-party services</h2>
        <p className="mt-2 text-ink-muted">
          MyFi uses Plaid Inc. for financial account connectivity and Supabase
          for data storage and authentication. Your use of these services
          through MyFi is also subject to their respective terms.
        </p>

        <h2 className="mt-6 text-xl font-semibold">5. Disclaimer</h2>
        <p className="mt-2 text-ink-muted">
          The service is provided &ldquo;as is.&rdquo; We do not provide
          financial, tax, or investment advice. Always confirm sensitive
          financial decisions directly with your financial institution or a
          qualified professional.
        </p>

        <h2 className="mt-6 text-xl font-semibold">6. Limitation of liability</h2>
        <p className="mt-2 text-ink-muted">
          To the maximum extent permitted by law, Midnite Systems, LLC is not
          liable for any indirect, incidental, or consequential damages arising
          from your use of the service.
        </p>

        <h2 className="mt-6 text-xl font-semibold">7. Termination</h2>
        <p className="mt-2 text-ink-muted">
          You may stop using the service and request deletion of your account
          at any time. We may suspend or terminate accounts that violate these
          terms.
        </p>

        <h2 className="mt-6 text-xl font-semibold">8. Changes</h2>
        <p className="mt-2 text-ink-muted">
          We may update these terms from time to time. Material changes will be
          reflected by the &ldquo;Last updated&rdquo; date above.
        </p>

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
