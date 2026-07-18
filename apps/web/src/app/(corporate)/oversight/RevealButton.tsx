"use client";

import { useEffect, useState } from "react";

/** In-context s3 reveal: shows the value for its TTL, then re-hides. */
export function RevealButton({ fieldId }: { fieldId: string }) {
  const [value, setValue] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (value === null) return;
    const t = setTimeout(() => setValue(null), 60_000);
    return () => clearTimeout(t);
  }, [value]);

  if (value !== null) {
    return (
      <span className="fval">
        {value} <span className="prov">auto-hides in 60s; this view was logged</span>
      </span>
    );
  }
  return (
    <span>
      <button
        className="act"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setError(null);
          try {
            const res = await fetch("/api/reveal", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ fieldId }),
            });
            const data = (await res.json()) as { ok: boolean; value?: string; reason?: string };
            if (data.ok && data.value !== undefined) setValue(data.value);
            else setError(data.reason ?? "refused");
          } catch {
            setError("network error");
          } finally {
            setBusy(false);
          }
        }}
      >
        Reveal (logged)
      </button>
      {error && <span className="prov"> {error}</span>}
    </span>
  );
}
