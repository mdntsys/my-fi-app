"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type Status = "idle" | "sending" | "sent" | "error";

export default function SignInPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    setError(null);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      setStatus("error");
      setError(error.message);
    } else {
      setStatus("sent");
    }
  }

  const disabled = status === "sending" || status === "sent";

  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-2">
          <div className="size-8 rounded-full bg-primary" />
          <h1 className="text-3xl font-semibold tracking-tight text-ink">
            MyFi
          </h1>
        </div>
        <p className="mt-3 text-sm text-ink-muted">
          Sign in to manage your household budget.
        </p>

        <form
          onSubmit={handleSubmit}
          className="mt-8 space-y-4 rounded-2xl border border-line bg-surface p-6 shadow-sm"
        >
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-ink"
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={disabled}
              placeholder="you@example.com"
              className="mt-1 w-full rounded-lg border border-line bg-surface px-3 py-2 text-ink placeholder:text-ink-faint focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary-soft"
            />
          </div>
          <button
            type="submit"
            disabled={disabled}
            className="w-full rounded-lg bg-primary px-3 py-2.5 text-sm font-medium text-primary-contrast transition hover:bg-primary-hover disabled:opacity-50"
          >
            {status === "sending"
              ? "Sending…"
              : status === "sent"
                ? "Check your email"
                : "Send magic link"}
          </button>

          {status === "sent" && (
            <p className="text-sm text-ink-muted">
              We sent a sign-in link to{" "}
              <span className="font-medium text-ink">{email}</span>. Open it on
              this device to continue.
            </p>
          )}
          {error && <p className="text-sm text-danger">{error}</p>}
        </form>

        <footer className="mt-8 text-xs text-ink-faint">
          <p>
            By signing in, you agree to our{" "}
            <Link href="/terms" className="underline hover:text-primary">
              Terms
            </Link>{" "}
            and{" "}
            <Link href="/privacy" className="underline hover:text-primary">
              Privacy Policy
            </Link>
            .
          </p>
          <p className="mt-2">© Midnite Systems, LLC</p>
        </footer>
      </div>
    </main>
  );
}
