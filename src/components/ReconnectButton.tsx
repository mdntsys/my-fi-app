"use client";

import { useCallback, useEffect, useState } from "react";
import { usePlaidLink, type PlaidLinkOnExitMetadata, type PlaidLinkError } from "react-plaid-link";
import { useRouter } from "next/navigation";

type Status = "loading" | "ready" | "repairing" | "syncing" | "done" | "error";

const TOKEN_KEY = "plaid_link_token";
const ITEM_KEY = "plaid_link_item_id";

export default function ReconnectButton({ itemId }: { itemId: string }) {
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>("loading");
  const [message, setMessage] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/plaid/link-token/update", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ item_id: itemId }),
        });
        const data = await res.json();
        if (cancelled) return;
        if (data.link_token) {
          setLinkToken(data.link_token);
          sessionStorage.setItem(TOKEN_KEY, data.link_token);
          sessionStorage.setItem(ITEM_KEY, itemId);
          setStatus("ready");
        } else {
          setStatus("error");
          setMessage(data.error ?? "Failed to start repair");
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
  }, [itemId]);

  const onSuccess = useCallback(async () => {
    setStatus("syncing");
    try {
      await fetch("/api/plaid/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ item_id: itemId }),
      });
      sessionStorage.removeItem(TOKEN_KEY);
      sessionStorage.removeItem(ITEM_KEY);
      setStatus("done");
      router.refresh();
    } catch (e) {
      setStatus("error");
      setMessage(String(e));
    }
  }, [itemId, router]);

  const onExit = useCallback(
    (err: PlaidLinkError | null, metadata: PlaidLinkOnExitMetadata) => {
      console.log("[Plaid Link reconnect] onExit", { err, metadata });
      if (err) {
        setStatus("error");
        setMessage(`${err.error_code}: ${err.error_message}`);
      }
    },
    [],
  );

  const { open, ready } = usePlaidLink({
    token: linkToken,
    onSuccess,
    onExit,
  });

  const disabled =
    !ready ||
    !linkToken ||
    status === "repairing" ||
    status === "syncing" ||
    status === "loading";

  return (
    <div className="inline-flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={() => {
          setStatus("repairing");
          open();
        }}
        disabled={disabled}
        className="rounded-lg bg-danger px-3 py-1.5 text-xs font-medium text-white hover:opacity-90 disabled:opacity-50"
      >
        {status === "syncing" ? "Syncing…" : "Reconnect"}
      </button>
      {message && status === "error" && (
        <span className="text-[10px] text-danger">{message}</span>
      )}
    </div>
  );
}
