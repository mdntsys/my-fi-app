"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function UserMenu({
  email,
  displayName,
}: {
  email: string;
  displayName: string | null;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const label = displayName?.trim() || email;
  const initial = (label[0] ?? "?").toUpperCase();

  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onEsc(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onEsc);
    };
  }, [open]);

  async function signOut() {
    setOpen(false);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  const itemClass =
    "block w-full px-3 py-2 text-left text-sm text-ink hover:bg-surface-muted";

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex size-9 items-center justify-center rounded-full border border-line bg-primary-soft text-sm font-semibold text-ink transition hover:border-primary"
      >
        {initial}
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-2 w-60 overflow-hidden rounded-xl border border-line bg-surface shadow-lg"
        >
          <div className="border-b border-line px-3 py-2">
            <div className="text-[10px] uppercase tracking-wide text-ink-faint">
              Signed in as
            </div>
            <div className="mt-0.5 truncate text-sm text-ink" title={label}>
              {label}
            </div>
            {displayName && (
              <div className="truncate text-xs text-ink-muted" title={email}>
                {email}
              </div>
            )}
          </div>
          <nav role="none" className="py-1">
            <Link href="/budget" className={itemClass} onClick={() => setOpen(false)}>
              Budget
            </Link>
            <Link href="/transactions" className={itemClass} onClick={() => setOpen(false)}>
              Transactions
            </Link>
            <Link href="/accounts" className={itemClass} onClick={() => setOpen(false)}>
              Accounts
            </Link>
            <Link href="/households" className={itemClass} onClick={() => setOpen(false)}>
              Households
            </Link>
            <Link href="/settings" className={itemClass} onClick={() => setOpen(false)}>
              Settings
            </Link>
          </nav>
          <div className="border-t border-line py-1">
            <button
              type="button"
              onClick={signOut}
              className="block w-full px-3 py-2 text-left text-sm text-danger hover:bg-surface-muted"
            >
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
