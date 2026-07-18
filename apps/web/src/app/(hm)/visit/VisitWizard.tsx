"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createCloseFlow, type CloseFlow, type CloseFlowState } from "@wellkept/close-flow";
import type { QueueConflict, QueueItem } from "@wellkept/offline-queue";
import { createVisitSync, type VisitSync } from "@/lib/client/visit-sync";

// Task-list configuration is a later sprint; a fixed checklist exercises the
// real close-flow contract end to end (same call the foundation repo made).
const REQUIRED_TASKS: { id: string; label: string }[] = [
  { id: "kitchen", label: "Kitchen reset to zone standard" },
  { id: "linens", label: "Linen rotation, primary and guest" },
  { id: "trash", label: "Bins staged for collection" },
  { id: "walkthrough", label: "Full walkthrough, rear gate latch checked" },
];

export function VisitWizard({ householdId }: { householdId: string }) {
  const flowRef = useRef<CloseFlow | null>(null);
  const syncRef = useRef<VisitSync | null>(null);
  const [state, setState] = useState<CloseFlowState | null>(null);
  const [queueStatus, setQueueStatus] = useState<{ pending: number; conflicts: QueueConflict[] }>({ pending: 0, conflicts: [] });
  const [online, setOnline] = useState(true);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [hoursStart, setHoursStart] = useState("");
  const [hoursEnd, setHoursEnd] = useState("");
  const [changesNoticed, setChangesNoticed] = useState("");
  const [dotText, setDotText] = useState("");
  const [zoneAnswer, setZoneAnswer] = useState("none");
  const [zonePhoto, setZonePhoto] = useState("");
  const [reportSentences, setReportSentences] = useState(["", "", ""]);
  const [lifeChange, setLifeChange] = useState<boolean | null>(null);

  const transport = useCallback(async (item: QueueItem) => {
    const response = await fetch("/api/visit-commands", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ idempotencyKey: item.idempotencyKey, type: item.type, payload: item.payload }),
    });
    if (!response.ok) throw new Error("visit-commands request failed");
    return response.json() as Promise<{ conflict?: boolean; reason?: string }>;
  }, []);

  const refreshQueueStatus = useCallback(() => {
    if (!syncRef.current) return;
    setQueueStatus({ pending: syncRef.current.queue.pending().length, conflicts: syncRef.current.queue.conflicts() });
  }, []);

  const attemptSync = useCallback(async () => {
    if (!syncRef.current) return;
    await syncRef.current.sync(transport);
    refreshQueueStatus();
  }, [transport, refreshQueueStatus]);

  useEffect(() => {
    flowRef.current = createCloseFlow({ householdId, requiredTaskIds: REQUIRED_TASKS.map((t) => t.id) });
    setState(flowRef.current.state);

    let cancelled = false;
    void createVisitSync({ householdId }).then((sync) => {
      if (cancelled) return;
      syncRef.current = sync;
      refreshQueueStatus();
      void attemptSync();
    });

    const handleOnline = () => { setOnline(true); void attemptSync(); };
    const handleOffline = () => setOnline(false);
    setOnline(navigator.onLine);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      cancelled = true;
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [householdId, attemptSync, refreshQueueStatus]);

  function run(action: (flow: CloseFlow) => void) {
    try {
      action(flowRef.current!);
      setState(flowRef.current!.state);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  async function handleSubmit() {
    try {
      const commands = flowRef.current!.submit();
      setState(flowRef.current!.state);
      for (const command of commands) await syncRef.current!.enqueueAndPersist(command);
      refreshQueueStatus();
      setSubmitted(true);
      await attemptSync();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  if (!state) return <div className="note">Loading…</div>;

  const missing = flowRef.current!.missingRequiredSteps();
  const done = (step: string) => !missing.includes(step as never);

  const PHASES: { id: string; label: string }[] = [
    { id: "tasks", label: "Tasks" },
    { id: "hours", label: "Hours" },
    { id: "photos", label: "Photos" },
    { id: "changes_noticed", label: "Changes" },
    { id: "life_change_signal", label: "Signal" },
    { id: "zone_drift", label: "Zones" },
    { id: "three_sentence_report", label: "Report" },
  ];

  return (
    <>
      <div className="card" style={{ background: "var(--green)", color: "#fff" }}>
        <div className="sans" style={{ fontSize: 11, letterSpacing: "0.1em", color: "var(--sage)", marginBottom: 8 }}>
          CLOSE FLOW. REQUIRED STEPS GATE THE REPORT. OFFLINE CAPTURE QUEUES AND SYNCS.
        </div>
        <div className="row" style={{ justifyContent: "flex-start", gap: 6 }}>
          {PHASES.map((p) => (
            <span
              key={p.id}
              className="sans"
              style={{
                fontSize: 11, padding: "3px 8px", borderRadius: 5, fontWeight: 600,
                background: done(p.id) ? "var(--gold)" : "rgba(255,255,255,0.12)",
                color: done(p.id) ? "var(--green)" : "var(--sage)",
              }}
            >
              {p.label}
            </span>
          ))}
        </div>
        <div className="sans" style={{ fontSize: 12, marginTop: 8, color: online ? "var(--sage)" : "var(--gold)" }} role="status">
          {online
            ? "Online"
            : "Offline — your work is saved on this device and will sync automatically once you're back online."}
        </div>
      </div>

      {error && <div className="banner" role="alert">{error}</div>}

      {submitted ? (
        <div className="card">
          <h2>Visit submitted</h2>
          <div className="note">
            The client sees the three sentences and photo count; dots and signals stay internal.
          </div>
          <div className="fval">{queueStatus.pending} item(s) still waiting to sync.</div>
        </div>
      ) : (
        <>
          <div className="card">
            <h2>Confirm today&apos;s tasks</h2>
            {REQUIRED_TASKS.map((t) => (
              <label key={t.id} className="sans" style={{ display: "flex", gap: 10, alignItems: "center", fontSize: 14, fontWeight: "normal", padding: "5px 0", cursor: "pointer" }}>
                <input
                  type="checkbox"
                  style={{ width: 17, height: 17, accentColor: "var(--green)" }}
                  checked={state.completedTaskIds.includes(t.id)}
                  onChange={() => run((flow) => flow.confirmTask(t.id))}
                />
                {t.label}
              </label>
            ))}
          </div>

          <div className="card">
            <h2>Hours</h2>
            <div className="note">Suggestion only; nothing bills from a geofence alone.</div>
            <label>Start <input type="datetime-local" value={hoursStart} onChange={(e) => setHoursStart(e.target.value)} /></label>
            <label>End <input type="datetime-local" value={hoursEnd} onChange={(e) => setHoursEnd(e.target.value)} /></label>
            <p><button className="act subtle" type="button" onClick={() => run((f) => f.captureHours({ startedAt: hoursStart, endedAt: hoursEnd }))}>Save hours</button></p>
            {state.hours && <div className="prov">Saved: {state.hours.startedAt} – {state.hours.endedAt}</div>}
          </div>

          <div className="card">
            <h2>Photos</h2>
            <div className="note">Photos share only through the platform, never personal devices&apos; rolls (SOP-019).</div>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) run((f) => f.addPhoto(`${file.name}:${file.size}`));
              }}
            />
            <div className="prov">{state.photoIds.length} photo(s) added.</div>
          </div>

          <div className="card">
            <h2>Changes noticed</h2>
            <div className="note">Cannot be skipped. &ldquo;none&rdquo; is an answer; blank is not.</div>
            <input value={changesNoticed} onChange={(e) => setChangesNoticed(e.target.value)} placeholder="or 'none'" />
            <p><button className="act subtle" type="button" onClick={() => run((f) => f.setChangesNoticed(changesNoticed))}>Save</button></p>
            {state.changesNoticed && <div className="prov">Saved: {state.changesNoticed}</div>}
          </div>

          <div className="card">
            <h2>Dots (optional, verbatim)</h2>
            <div className="note">Verbatim, dated. Never client-visible.</div>
            <div className="row">
              <input style={{ flex: 1 }} value={dotText} onChange={(e) => setDotText(e.target.value)} placeholder="What was said, exactly" />
              <button className="act subtle" type="button" onClick={() => { run((f) => f.addDot(dotText)); setDotText(""); }}>Log dot</button>
            </div>
            {state.dots.map((d) => (
              <div key={d.id} className="fval" style={{ fontStyle: "italic" }}>&ldquo;{d.verbatim}&rdquo;</div>
            ))}
          </div>

          <div className="card">
            <h2>Life-change signal</h2>
            <div className="note">A yes routes to corporate the same day and never becomes a proposal.</div>
            <label className="sans" style={{ fontWeight: "normal" }}>
              <input type="radio" name="lifeChange" checked={lifeChange === false} onChange={() => { setLifeChange(false); run((f) => f.setLifeChangeSignal(false)); }} /> Nothing to flag
            </label>
            <label className="sans" style={{ fontWeight: "normal" }}>
              <input type="radio" name="lifeChange" checked={lifeChange === true} onChange={() => { setLifeChange(true); run((f) => f.setLifeChangeSignal(true)); }} /> Yes, flag for corporate
            </label>
            {lifeChange === true && (
              <div className="prov" style={{ color: "var(--brick)" }}>
                Routed to corporate today. Nothing about this appears in the client report.
              </div>
            )}
          </div>

          <div className="card">
            <h2>Zone drift</h2>
            <input value={zoneAnswer} onChange={(e) => setZoneAnswer(e.target.value)} />
            <input value={zonePhoto} onChange={(e) => setZonePhoto(e.target.value)} placeholder="photo id (required unless 'none')" />
            <p><button className="act subtle" type="button" onClick={() => run((f) => f.setZoneDrift({ answer: zoneAnswer, photoId: zonePhoto || null }))}>Save</button></p>
            {state.zoneDrift && <div className="prov">Saved: {state.zoneDrift.answer}</div>}
          </div>

          <div className="card">
            <h2>The report. Exactly three sentences, drafted last.</h2>
            <div className="note">Three by design. Warm, specific, done.</div>
            {(["What was done", "What was noticed or handled", "What comes next"] as const).map((hint, index) => (
              <div key={hint}>
                <div className="eyebrow">Sentence {index + 1} | {hint}</div>
                <input
                  value={reportSentences[index]}
                  onChange={(e) => setReportSentences((prev) => prev.map((v, i) => (i === index ? e.target.value : v)))}
                />
              </div>
            ))}
            <p><button className="act subtle" type="button" onClick={() => run((f) => reportSentences.forEach((s, i) => f.setReportSentence(i, s)))}>Save report</button></p>
          </div>

          <div className="card">
            <h2>Ready to submit?</h2>
            {missing.length > 0 ? (
              <div className="note">Still missing: {missing.join(", ")}</div>
            ) : (
              <div className="note">All required steps are complete.</div>
            )}
            <button className="act" style={{ width: "100%", fontSize: 17, padding: "14px 0" }} type="button" disabled={missing.length > 0} onClick={() => void handleSubmit()}>
              {missing.length > 0 ? "Submit locked until required steps are complete" : "Submit visit report"}
            </button>
            <div className="prov" style={{ textAlign: "center", marginTop: 6 }}>
              Offline: this submit queues locally and syncs on reconnect.
            </div>
          </div>
        </>
      )}

      <div className="card">
        <h2>Sync status</h2>
        <div className="fval">
          {queueStatus.pending} command(s) queued{online ? "" : " — will send once back online"}.
        </div>
        <p><button className="act subtle" type="button" onClick={() => void attemptSync()}>Sync now</button></p>
        {queueStatus.conflicts.length > 0 && (
          <div className="banner" role="alert">
            {queueStatus.conflicts.map((c) => (
              <div key={c.mutationId}>{c.reason} — reported to corporate; your work is not lost.</div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
