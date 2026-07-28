"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createCloseFlow, type CloseFlow, type CloseFlowState } from "@wellkept/close-flow";
import { ZONE_DRIFT_NONE } from "@wellkept/trigger-engine";
import { backoffDelayMs, type QueueConflict, type QueueItem } from "@wellkept/offline-queue";
import { createVisitSync, MAX_SEND_ATTEMPTS, type VisitSync } from "@/lib/client/visit-sync";

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
  const [queueStatus, setQueueStatus] = useState<{ pending: number; dead: QueueItem[]; conflicts: QueueConflict[] }>({ pending: 0, dead: [], conflicts: [] });
  const [online, setOnline] = useState(true);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // AF: retry pacing. The streak counts consecutive drains that delivered
  // nothing while something was waiting; it resets on any delivery. The
  // timer is the periodic-retry loop the queue was missing.
  const failStreakRef = useRef(0);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [hoursStart, setHoursStart] = useState("");
  const [hoursEnd, setHoursEnd] = useState("");
  const [changesNoticed, setChangesNoticed] = useState("");
  const [dotText, setDotText] = useState("");
  // M (round six): the no-drift vocabulary comes from the engine constant,
  // never from copy an HM was taught to type; the button below writes it.
  const [zoneAnswer, setZoneAnswer] = useState<string>(ZONE_DRIFT_NONE);
  // AC (W-6): deferral capture inputs; the flow validates and holds them.
  const [deferralNoticed, setDeferralNoticed] = useState("");
  const [deferralReason, setDeferralReason] = useState("");
  const [deferralDate, setDeferralDate] = useState("");
  const [deferralCondition, setDeferralCondition] = useState("");
  const [zonePhoto, setZonePhoto] = useState("");
  const [reportSentences, setReportSentences] = useState(["", "", ""]);
  const [lifeChange, setLifeChange] = useState<boolean | null>(null);
  const [photos, setPhotos] = useState<{ photoId: string; preview: string; base64: string; uploaded: boolean }[]>([]);

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
    setQueueStatus({
      pending: syncRef.current.queue.pending().length,
      dead: syncRef.current.queue.dead(),
      conflicts: syncRef.current.queue.conflicts(),
    });
  }, []);

  // AF: the drain used to run only on page load and the browser's online
  // event, so one silently failed attempt left commands stuck until the
  // next reload. Now a drain that delivers nothing while work waits
  // schedules its own retry, exponential and capped; any delivery resets
  // the streak. Dead items do not retry themselves; they wait on the
  // operator's explicit action below.
  const attemptSync = useCallback(async () => {
    if (!syncRef.current) return;
    if (retryTimerRef.current) { clearTimeout(retryTimerRef.current); retryTimerRef.current = null; }
    const result = await syncRef.current.sync(transport);
    refreshQueueStatus();
    const waiting = syncRef.current.queue.pending().length;
    if (result.attempted && waiting > 0 && result.sent.length === 0) {
      failStreakRef.current += 1;
      retryTimerRef.current = setTimeout(() => { void attemptSync(); }, backoffDelayMs(failStreakRef.current));
    } else if (result.sent.length > 0 || waiting === 0) {
      failStreakRef.current = 0;
      if (waiting > 0) {
        // Something moved but something still waits (e.g. a fresh enqueue
        // mid-drain): keep the loop alive at the base delay.
        retryTimerRef.current = setTimeout(() => { void attemptSync(); }, backoffDelayMs(0));
      }
    }
    refreshQueueStatus();
  }, [transport, refreshQueueStatus]);

  // AF: the operator's two ways out of a dead-lettered command. Discard
  // writes the audit row FIRST via the server; only an ok response
  // removes the local copy (no audit, no discard).
  const retryDeadItem = useCallback(async (itemId: string) => {
    if (!syncRef.current) return;
    await syncRef.current.retryDead(itemId);
    failStreakRef.current = 0;
    await attemptSync();
  }, [attemptSync]);

  const discardDeadItem = useCallback(async (item: QueueItem) => {
    if (!syncRef.current) return;
    try {
      const response = await fetch("/api/visit-commands/discard", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          idempotencyKey: item.idempotencyKey, type: item.type,
          householdId: item.payload.householdId, attempts: item.attempts,
        }),
      });
      if (!response.ok) throw new Error("the discard could not be recorded; nothing was removed");
      await syncRef.current.discardDead(item.id);
      refreshQueueStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }, [refreshQueueStatus]);

  useEffect(() => {
    // Offline shell: lets /visit itself load after a reload with no network.
    // Production only — in dev, Turbopack chunk names collide across server
    // restarts, and a cache-first SW serves stale chunks (client exceptions,
    // hydration mismatches). Dev actively cleans up any old registration.
    if ("serviceWorker" in navigator) {
      if (process.env.NODE_ENV === "production") {
        void navigator.serviceWorker.register("/wk-sw.js").catch(() => {});
      } else {
        void navigator.serviceWorker.getRegistrations().then((regs) => regs.forEach((r) => void r.unregister()));
        if ("caches" in window) {
          void caches.keys().then((keys) => keys.forEach((k) => void caches.delete(k)));
        }
      }
    }
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
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
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

  // Downscale + compress in the browser via a canvas (data URLs only, so the
  // enforcing CSP's img-src 'self' data: is satisfied — no blob: URLs).
  async function shrink(file: File): Promise<{ base64: string; dataUrl: string }> {
    const src: string = await new Promise((res, rej) => {
      const r = new FileReader();
      r.onload = () => res(r.result as string);
      r.onerror = rej;
      r.readAsDataURL(file);
    });
    return new Promise((resolve, reject) => {
      const img = new window.Image();
      img.onload = () => {
        const max = 1600;
        const scale = Math.min(1, max / Math.max(img.width, img.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.5);
        resolve({ dataUrl, base64: dataUrl.split(",")[1] ?? "" });
      };
      img.onerror = reject;
      img.src = src;
    });
  }

  async function uploadOne(photoId: string, base64: string): Promise<boolean> {
    try {
      const res = await fetch("/api/mobile/upload", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ householdId, photoId, contentType: "image/jpeg", base64 }),
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  async function addPhotoFile(file: File) {
    try {
      const { base64, dataUrl } = await shrink(file);
      if (!base64) return;
      const photoId = crypto.randomUUID();
      run((f) => f.addPhoto(photoId));
      setPhotos((prev) => [...prev, { photoId, preview: dataUrl, base64, uploaded: false }]);
      if (await uploadOne(photoId, base64)) {
        setPhotos((prev) => prev.map((p) => (p.photoId === photoId ? { ...p, uploaded: true } : p)));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  async function retryPhotoUploads() {
    for (const p of photos.filter((x) => !x.uploaded)) {
      if (await uploadOne(p.photoId, p.base64)) {
        setPhotos((prev) => prev.map((x) => (x.photoId === p.photoId ? { ...x, uploaded: true } : x)));
      }
    }
  }

  async function handleSubmit() {
    try {
      await retryPhotoUploads();
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
        <div className="sans" style={{ fontSize: 12, marginTop: 8, color: online ? "var(--sage)" : "var(--gold-bright)" }} role="status">
          {online
            ? "Online"
            : "Offline; your work is saved on this device and will sync automatically once you're back online."}
        </div>
      </div>

      {error && <div className="banner" role="alert">{error}</div>}

      {submitted ? (
        // AG: the card claims what actually happened. Queued locally is
        // "saved on this device", not "submitted"; the header only says
        // submitted once nothing is waiting. Copy is the founder's to
        // adjust; proposed wording shipped 2026-07-28.
        <div className="card">
          <h2>{queueStatus.pending + queueStatus.dead.length === 0 ? "Visit submitted" : "Visit saved on this device"}</h2>
          <div className="note">
            The client sees the three sentences and photo count; dots and signals stay internal.
          </div>
          {queueStatus.pending + queueStatus.dead.length === 0 ? (
            <div className="fval">Everything has reached the record.</div>
          ) : (
            <div className="fval">
              Your work is safe here and sends automatically; the sync status
              below shows what is still waiting.
            </div>
          )}
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
            <div className="note">Photos share only through the platform, never personal devices&apos; rolls (SOP-019). Uploaded on capture; if offline they upload on sync.</div>
            <input
              type="file"
              accept="image/*"
              capture="environment"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void addPhotoFile(file);
                e.target.value = "";
              }}
            />
            {photos.length > 0 && (
              <div className="row" style={{ flexWrap: "wrap", gap: 8, marginTop: 10 }}>
                {photos.map((p) => (
                  <span key={p.photoId} style={{ position: "relative", display: "inline-block" }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={p.preview} alt="visit photo" width={72} height={72} style={{ objectFit: "cover", borderRadius: 6, border: "1px solid #e2e0d8", opacity: p.uploaded ? 1 : 0.6 }} />
                    {!p.uploaded && <span style={{ position: "absolute", bottom: 2, left: 2, right: 2, fontSize: 9, color: "#fff", background: "rgba(140,47,34,0.85)", textAlign: "center", borderRadius: 3 }}>pending</span>}
                  </span>
                ))}
              </div>
            )}
            <div className="prov">{state.photoIds.length} photo(s) added.</div>
          </div>

          <div className="card">
            <h2>Changes noticed</h2>
            <div className="note">Cannot be skipped. &ldquo;none&rdquo; is an answer; blank is not.</div>
            <input aria-label="Changes noticed" value={changesNoticed} onChange={(e) => setChangesNoticed(e.target.value)} placeholder="or 'none'" />
            <p><button className="act subtle" type="button" onClick={() => run((f) => f.setChangesNoticed(changesNoticed))}>Save</button></p>
            {state.changesNoticed && <div className="prov">Saved: {state.changesNoticed}</div>}
          </div>

          <div className="card">
            <h2>Dots (optional, verbatim)</h2>
            <div className="note">Verbatim, dated. Never client-visible.</div>
            <div className="row">
              <input style={{ flex: 1 }} aria-label="Dot: what was said, exactly" value={dotText} onChange={(e) => setDotText(e.target.value)} placeholder="What was said, exactly" />
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
            <button className="act subtle" type="button" onClick={() => setZoneAnswer(ZONE_DRIFT_NONE)}>No drift</button>
            <input aria-label="Zone drift photo id" value={zonePhoto} onChange={(e) => setZonePhoto(e.target.value)} placeholder="photo id (required unless no drift)" />
            <p><button className="act subtle" type="button" onClick={() => run((f) => f.setZoneDrift({ answer: zoneAnswer, photoId: zonePhoto || null }))}>Save</button></p>
            {state.zoneDrift && <div className="prov">Saved: {state.zoneDrift.answer}</div>}
          </div>

          <div className="card">
            {/* AC (W-6): deferral capture lives IN the close flow, so what
                was noticed and left belongs to this visit by construction.
                Optional; the client reads the reason. */}
            <h2>Noticed and left, on purpose (optional)</h2>
            <div className="note">
              Something you saw and decided not to act on. The client sees what
              you noticed, your reason, and when it will be looked at again.
            </div>
            <input aria-label="What you noticed" value={deferralNoticed} onChange={(e) => setDeferralNoticed(e.target.value)} placeholder="what you noticed" />
            <input aria-label="Why it was left, in words the client will read" value={deferralReason} onChange={(e) => setDeferralReason(e.target.value)} placeholder="why it was left, in words the client will read" />
            <div className="row" style={{ gap: 6 }}>
              <input aria-label="Come back by" type="date" value={deferralDate} onChange={(e) => setDeferralDate(e.target.value)} style={{ marginTop: 0 }} />
              <input aria-label="Come back when" style={{ flex: 1, marginTop: 0 }} value={deferralCondition} onChange={(e) => setDeferralCondition(e.target.value)} placeholder="or: come back when (at the fall weatherproofing visit)" />
              <button className="act subtle" type="button" onClick={() => { run((f) => f.addDeferral({ noticed: deferralNoticed, reason: deferralReason, revisitDate: deferralDate || null, revisitCondition: deferralCondition || null })); setDeferralNoticed(""); setDeferralReason(""); setDeferralDate(""); setDeferralCondition(""); }}>Record</button>
            </div>
            {state.deferrals.map((d) => (
              <div key={d.id} className="prov">deferred: {d.noticed}; revisit {d.revisitDate ?? d.revisitCondition}</div>
            ))}
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
        {/* AF: three distinguishable states - syncing normally, retrying
            after failures (attempt count visible), and stuck (a warning
            with the operator's two ways out), because "waiting" and
            "stuck" looking identical is how a visit sat on one device
            all afternoon. */}
        <div className="fval">
          {queueStatus.pending} command(s) queued
          {!online && "; will send once back online"}
          {online && queueStatus.pending > 0 && failStreakRef.current === 0 && "; syncing"}
          {online && queueStatus.pending > 0 && failStreakRef.current > 0 &&
            `; retrying automatically (attempt ${failStreakRef.current + 1})`}
          .
        </div>
        <p><button className="act subtle" type="button" onClick={() => void (async () => { await retryPhotoUploads(); await attemptSync(); })()}>Sync now</button></p>
        {queueStatus.dead.length > 0 && (
          <div className="banner" role="alert">
            <strong>{queueStatus.dead.length} command(s) could not sync after {MAX_SEND_ATTEMPTS} attempts and need your attention.</strong>
            {queueStatus.dead.map((d) => (
              <div key={d.id} style={{ display: "flex", gap: 6, alignItems: "center", marginTop: 6 }}>
                <span style={{ flex: 1 }}>{d.type} ({d.idempotencyKey.slice(0, 8)})</span>
                <button className="act subtle" type="button" onClick={() => void retryDeadItem(d.id)}>Try again</button>
                <button className="act danger" type="button" onClick={() => void discardDeadItem(d)}>Discard (recorded)</button>
              </div>
            ))}
          </div>
        )}
        {queueStatus.conflicts.length > 0 && (
          <div className="banner" role="alert">
            {queueStatus.conflicts.map((c) => (
              <div key={c.mutationId}>{c.reason}; reported to corporate; your work is not lost.</div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
