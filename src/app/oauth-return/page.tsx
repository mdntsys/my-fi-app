"use client";

import { useCallback, useEffect, useState } from "react";
import { usePlaidLink, type PlaidLinkOnExitMetadata, type PlaidLinkError } from "react-plaid-link";
import { useRouter } from "next/navigation";

const TOKEN_KEY = "plaid_link_token";
const ITEM_KEY = "plaid_link_item_id";

export default function OAuthReturnPage() {
  const router = useRouter();
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [existingItemId, setExistingItemId] = useState<string | null>(null);
  const [status, setStatus] = useState<string>("Resuming connection…");
  const [error, setError] = useState<string | null>(null);

  /* eslint-disable react-hooks/set-state-in-effect -- sessionStorage is browser-only; hydrating state on mount is the correct pattern */
  useEffect(() => {
    const storedToken = sessionStorage.getItem(TOKEN_KEY);
    const storedItem = sessionStorage.getItem(ITEM_KEY);
    if (!storedToken) {
      setError(
        "We couldn't find the original Link session in this browser. Restart the connect flow from the dashboard.",
      );
      return;
    }
    setLinkToken(storedToken);
    setExistingItemId(storedItem);
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  const onSuccess = useCallback(
    async (public_token: string) => {
      try {
        if (existingItemId) {
          setStatus("Syncing reconnected account…");
          await fetch("/api/plaid/sync", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ item_id: existingItemId }),
          });
        } else {
          setStatus("Saving connection…");
          const exchange = await fetch("/api/plaid/exchange", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ public_token }),
          });
          const data = await exchange.json();
          if (!exchange.ok) {
            setError(data.error ?? "Exchange failed");
            return;
          }
          setStatus("Syncing transactions…");
          await fetch("/api/plaid/sync", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ item_id: data.item_id }),
          });
        }

        sessionStorage.removeItem(TOKEN_KEY);
        sessionStorage.removeItem(ITEM_KEY);
        router.push("/dashboard");
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      }
    },
    [existingItemId, router],
  );

  const onExit = useCallback(
    (err: PlaidLinkError | null, metadata: PlaidLinkOnExitMetadata) => {
      console.log("[Plaid Link OAuth return] onExit", { err, metadata });
      sessionStorage.removeItem(TOKEN_KEY);
      sessionStorage.removeItem(ITEM_KEY);
      if (err) {
        setError(`${err.error_code}: ${err.error_message}`);
      } else {
        router.push("/dashboard");
      }
    },
    [router],
  );

  const onEvent = useCallback((eventName: string, metadata: unknown) => {
    console.log("[Plaid Link OAuth return] event", eventName, metadata);
  }, []);

  const { open, ready } = usePlaidLink({
    token: linkToken,
    receivedRedirectUri:
      typeof window !== "undefined" ? window.location.href : undefined,
    onSuccess,
    onExit,
    onEvent,
  });

  useEffect(() => {
    if (ready && linkToken) open();
  }, [ready, linkToken, open]);

  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm rounded-2xl border border-line bg-surface p-6 text-center shadow-sm">
        <div className="mx-auto size-8 rounded-full bg-primary" />
        <h1 className="mt-3 text-lg font-semibold tracking-tight">MyFi</h1>
        {error ? (
          <>
            <p className="mt-4 text-sm text-danger">{error}</p>
            <button
              type="button"
              onClick={() => router.push("/dashboard")}
              className="mt-4 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-contrast hover:bg-primary-hover"
            >
              Back to dashboard
            </button>
          </>
        ) : (
          <p className="mt-4 text-sm text-ink-muted">{status}</p>
        )}
      </div>
    </main>
  );
}
