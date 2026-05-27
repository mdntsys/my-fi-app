"use client";

import { useCallback, useEffect, useState } from "react";
import { usePlaidLink } from "react-plaid-link";
import { useRouter } from "next/navigation";

type Status = "loading" | "ready" | "linking" | "syncing" | "done" | "error";

export default function LinkAccount() {
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>("loading");
  const [message, setMessage] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/plaid/link-token", { method: "POST" });
        const data = await res.json();
        if (cancelled) return;
        if (data.link_token) {
          setLinkToken(data.link_token);
          setStatus("ready");
        } else {
          setStatus("error");
          setMessage(data.error ?? "Failed to create link token");
        }
      } catch (e) {
        if (!cancelled) {
          setStatus("error");
          setMessage(String(e));
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const onSuccess = useCallback(
    async (public_token: string) => {
      setStatus("linking");
      setMessage(null);
      const exchange = await fetch("/api/plaid/exchange", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ public_token }),
      });
      const data = await exchange.json();
      if (!exchange.ok) {
        setStatus("error");
        setMessage(data.error ?? "Exchange failed");
        return;
      }

      setStatus("syncing");
      await fetch("/api/plaid/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ item_id: data.item_id }),
      });

      setStatus("done");
      setMessage(`Connected ${data.institution ?? "account"}.`);
      router.refresh();
    },
    [router],
  );

  const { open, ready } = usePlaidLink({
    token: linkToken,
    onSuccess,
  });

  const disabled =
    !ready || !linkToken || status === "linking" || status === "syncing";

  return (
    <div className="inline-flex flex-col items-end gap-2">
      <button
        type="button"
        onClick={() => open()}
        disabled={disabled}
        className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-contrast transition hover:bg-primary-hover disabled:opacity-50"
      >
        {status === "linking"
          ? "Saving…"
          : status === "syncing"
            ? "Syncing transactions…"
            : "Connect a bank"}
      </button>
      {message && (
        <p
          className={`text-xs ${
            status === "error" ? "text-danger" : "text-ink-muted"
          }`}
        >
          {message}
        </p>
      )}
    </div>
  );
}
