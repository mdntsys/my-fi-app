"use client";

import { useState } from "react";

export default function InviteLinkCopier({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      className="shrink-0 rounded-lg border border-line bg-surface px-3 py-1.5 text-xs font-medium text-ink hover:border-primary hover:text-primary"
    >
      {copied ? "Copied" : "Copy link"}
    </button>
  );
}
