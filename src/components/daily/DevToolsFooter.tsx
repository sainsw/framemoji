import { useState } from "react";
import { clearAllDailyResults } from "@/lib/result";
import { resetLocalStats } from "@/lib/stats";
import type { DailyMeta } from "./types";

export function DevToolsFooter({ meta }: { meta: DailyMeta | null }) {
  const [pinInput, setPinInput] = useState("");
  const [pinStatus, setPinStatus] = useState<string | null>(null);

  if (!meta?.answer) return null;

  return (
    <footer style={{ marginTop: "0.75rem", opacity: 0.8, fontSize: "0.9rem", display: "flex", gap: "0.75rem", alignItems: "center", justifyContent: "space-between" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
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
          style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
        >
          <label htmlFor="pin-id" className="sr-only">Pinned ID</label>
          <input
            id="pin-id"
            type="number"
            inputMode="numeric"
            placeholder="Pinned ID"
            value={pinInput}
            onChange={(e) => setPinInput(e.target.value)}
            style={{ width: 120 }}
          />
          <button type="submit" className="secondary">Pin today</button>
          {pinStatus && <span aria-live="polite">{pinStatus}</span>}
        </form>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
        <button
          className="secondary"
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
    </footer>
  );
}
