import { useState } from "react";
import { clearAllDailyResults } from "@/lib/result";
import { resetLocalStats } from "@/lib/stats";
import type { DailyMeta } from "./types";

export function DevToolsFooter({ meta }: { meta: DailyMeta | null }) {
  const [pinInput, setPinInput] = useState("");
  const [pinStatus, setPinStatus] = useState<string | null>(null);

  if (!meta?.answer) return null;

  return (
    <aside className="devtools" aria-label="Developer tools">
      <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
        <span>Dev mode: answer is <strong>{meta.answer}</strong></span>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            const idNum = Number(pinInput);
            if (!Number.isFinite(idNum)) {
              setPinStatus("Enter a numeric ID");
              return;
            }
            setPinStatus("Pinning…");
            try {
              const res = await fetch("/api/daily/pin", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id: idNum, day: meta.day }),
              });
              if (!res.ok) {
                const j = await res.json().catch(() => ({}));
                throw new Error(j?.error || `HTTP ${res.status}`);
              }
              setPinStatus("Pinned. Reloading…");
              // Reload to reflect new daily
              setTimeout(() => window.location.reload(), 250);
            } catch (err: any) {
              setPinStatus(`Failed: ${err?.message || "error"}`);
            }
          }}
          aria-label="Pin today's puzzle ID"
        >
          <label htmlFor="pin-id" className="sr-only">Pinned ID</label>
          <input
            id="pin-id"
            type="number"
            inputMode="numeric"
            placeholder="Pinned ID"
            value={pinInput}
            onChange={(e) => setPinInput(e.target.value)}
          />
          <button type="submit" className="btn btn-quiet">Pin today</button>
          {pinStatus && <span aria-live="polite">{pinStatus}</span>}
        </form>
      </div>
      <div>
        <button
          type="button"
          className="btn btn-quiet"
          onClick={() => {
            clearAllDailyResults();
            resetLocalStats();
            // Simple way to reset component state and refetch
            window.location.reload();
          }}
          aria-label="Clear local Framemoji data"
        >
          Clear local data
        </button>
      </div>
    </aside>
  );
}
