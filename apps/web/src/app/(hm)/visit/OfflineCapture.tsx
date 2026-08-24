"use client";

/**
 * Input spine build 1, client half: the visit-page captures enqueue into
 * the shared per-household queue instead of POSTing server-action forms,
 * so every capture path works in airplane mode, not only the wizard. The
 * same pure validators the sink runs gate the enqueue, so a HOM sees the
 * named refusal instantly and offline; the server re-validates on drain.
 * The status chip is the AG honesty rule applied per capture: "saved on
 * this device" while anything waits, "recorded" only when it is settled.
 */
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  validateFlagCreate, validateFlagLook, validateFlagClose,
  validateDeferralResolve, validatePausedDecisionResolve, validatePromptOutcome,
} from "@/lib/visit-command-validate";
import { commandSettled, drainShared, enqueueShared, subscribeSync } from "@/lib/client/shared-sync";

type CaptureState = { phase: "idle" } | { phase: "queued" } | { phase: "recorded" } | { phase: "refused"; reason: string };

/** Human copy for the validators' named reasons; the codes stay the
 * contract, the HM reads a sentence. */
const REASON_COPY: Record<string, string> = {
  "bad_input:text": "Needs a what, a where, and the concern in a few words.",
  "bad_input:em_dash": "Rewrite without the long dash; plain punctuation only.",
  "bad_input:no_revisit_trigger": "Every flag needs a revisit plan: a date, or the condition that brings you back.",
  "bad_input:value": "Condition is a single digit, 1 to 5.",
  "bad_input:close_reason": "Say what resolved it, a few words.",
};
const reasonCopy = (reason: string) => REASON_COPY[reason] ?? "That did not look right; check the entry.";

function useCapture(householdId: string) {
  const router = useRouter();
  const [state, setState] = useState<CaptureState>({ phase: "idle" });
  const [waitingOn, setWaitingOn] = useState<string | null>(null);
  // The chip settles on ANY drain, its own or the wizard's retry loop's:
  // the shared notifications fire after every drain, so a capture queued
  // offline upgrades to "recorded" the moment reconnection delivers it,
  // whichever component ran that drain.
  useEffect(() => {
    if (!waitingOn) return;
    let cancelled = false;
    const check = () => {
      void commandSettled(householdId, waitingOn).then((settled) => {
        if (cancelled || !settled) return;
        setWaitingOn(null);
        setState({ phase: "recorded" });
        router.refresh();
      });
    };
    const unsubscribe = subscribeSync(householdId, check);
    check();
    return () => { cancelled = true; unsubscribe(); };
  }, [householdId, waitingOn, router]);
  const submit = useCallback(async (type: string, payload: Record<string, unknown>) => {
    const idempotencyKey = crypto.randomUUID();
    await enqueueShared(householdId, { type, idempotencyKey, payload: { householdId, ...payload } });
    setState({ phase: "queued" });
    setWaitingOn(idempotencyKey);
    void drainShared(householdId);
  }, [householdId]);
  return { state, setState, submit };
}

function StatusChip({ state }: { state: CaptureState }) {
  if (state.phase === "idle") return null;
  if (state.phase === "refused") return <span className="note" style={{ color: "var(--critical, #8c2f22)" }}>{reasonCopy(state.reason)}</span>;
  if (state.phase === "queued") return <span className="note">Saved on this device; syncing.</span>;
  return <span className="note">Recorded.</span>;
}

export function FlagCaptureForm({ householdId, registries }: {
  householdId: string; registries: { id: string; label: string }[];
}) {
  const { state, setState, submit } = useCapture(householdId);
  const [subject, setSubject] = useState("");
  const [location, setLocation] = useState("");
  const [concern, setConcern] = useState("");
  const [registryEntryId, setRegistryEntryId] = useState("");
  const [revisitDate, setRevisitDate] = useState("");
  const [revisitCondition, setRevisitCondition] = useState("");
  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = { subject, location, concern, registryEntryId, revisitDate, revisitCondition };
    const v = validateFlagCreate(payload);
    if (!v.ok) { setState({ phase: "refused", reason: v.reason }); return; }
    await submit("flag.create", payload);
    setSubject(""); setLocation(""); setConcern(""); setRegistryEntryId(""); setRevisitDate(""); setRevisitCondition("");
  };
  return (
    <form onSubmit={onSubmit}>
      <input aria-label="What" placeholder="what (grout, rear shower wall)" value={subject} onChange={(e) => setSubject(e.target.value)} />
      <input aria-label="Where" placeholder="where (guest bathroom)" value={location} onChange={(e) => setLocation(e.target.value)} />
      <input aria-label="Concern" placeholder="the concern, as you would say it" value={concern} onChange={(e) => setConcern(e.target.value)} />
      <select aria-label="Registry object (optional)" value={registryEntryId} onChange={(e) => setRegistryEntryId(e.target.value)} className="inline">
        <option value="">no registry object (a surface, a room)</option>
        {registries.map((r) => (<option key={r.id} value={r.id}>{r.label}</option>))}
      </select>
      <div style={{ display: "flex", gap: 6, alignItems: "center", marginTop: 4 }}>
        <input aria-label="Revisit date" type="date" value={revisitDate} onChange={(e) => setRevisitDate(e.target.value)} style={{ marginTop: 0 }} />
        <span className="note">or</span>
        <input aria-label="Revisit condition" placeholder="revisit when (after the next deep clean)" value={revisitCondition} onChange={(e) => setRevisitCondition(e.target.value)} style={{ flex: 1, marginTop: 0 }} />
      </div>
      <p><button className="act">Raise the flag</button> <StatusChip state={state} /></p>
    </form>
  );
}

export function FlagLookForm({ householdId, flagId }: { householdId: string; flagId: string }) {
  const { state, setState, submit } = useCapture(householdId);
  const [value, setValue] = useState("");
  const [note, setNote] = useState("");
  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = { flagId, value, note };
    const v = validateFlagLook(payload);
    if (!v.ok) { setState({ phase: "refused", reason: v.reason }); return; }
    await submit("flag.look", payload);
    setValue(""); setNote("");
  };
  return (
    <form onSubmit={onSubmit} style={{ display: "flex", gap: 6, alignItems: "center", marginTop: 4, flexWrap: "wrap" }}>
      {/* W-4 carried (session Y): the direction is printed at the point of
          entry; two HMs reading "3 of 5" oppositely is the calibration
          failure. */}
      <input aria-label="Condition 1-5 (5 = like new, 1 = failing)" placeholder="condition 1-5 (5 = like new, 1 = failing)" inputMode="numeric" value={value} onChange={(e) => setValue(e.target.value)} style={{ width: 250, marginTop: 0 }} />
      <input aria-label="Look note (internal)" placeholder="note (optional)" value={note} onChange={(e) => setNote(e.target.value)} style={{ flex: 1, marginTop: 0 }} />
      <button className="act">Log look</button>
      <StatusChip state={state} />
    </form>
  );
}

export function FlagCloseForm({ householdId, flagId }: { householdId: string; flagId: string }) {
  const { state, setState, submit } = useCapture(householdId);
  const [closeReason, setCloseReason] = useState("");
  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = { flagId, closeReason };
    const v = validateFlagClose(payload);
    if (!v.ok) { setState({ phase: "refused", reason: v.reason }); return; }
    await submit("flag.close", payload);
    setCloseReason("");
  };
  return (
    <form onSubmit={onSubmit} style={{ display: "flex", gap: 6, alignItems: "center", marginTop: 4, flexWrap: "wrap" }}>
      <input aria-label="Close reason" placeholder="close: what resolved it" value={closeReason} onChange={(e) => setCloseReason(e.target.value)} style={{ flex: 1, marginTop: 0 }} />
      <button className="act subtle">Close flag</button>
      <StatusChip state={state} />
    </form>
  );
}

export function ResolveButtons({ householdId, kind, targetId }: {
  householdId: string; kind: "deferral" | "pausedDecision"; targetId: string;
}) {
  const { state, setState, submit } = useCapture(householdId);
  const onResolve = async (resolution: string) => {
    const payload = kind === "deferral" ? { deferralId: targetId, resolution } : { pausedDecisionId: targetId, resolution };
    const v = kind === "deferral" ? validateDeferralResolve(payload) : validatePausedDecisionResolve(payload);
    if (!v.ok) { setState({ phase: "refused", reason: v.reason }); return; }
    await submit(kind === "deferral" ? "deferral.resolve" : "pausedDecision.resolve", payload);
  };
  return (
    <div style={{ display: "flex", gap: 6, marginTop: 4, alignItems: "center" }}>
      {(["done", "no_longer_needed", "superseded"] as const).map((r) => (
        <button key={r} className="act subtle" onClick={() => void onResolve(r)}>{r.replace(/_/g, " ")}</button>
      ))}
      <StatusChip state={state} />
    </div>
  );
}

/** Session A carried: one answer = one tap, the second dimension riding
 * along, a driveway answer beats a modal. */
export function OutcomeButton({ householdId, promptId, outcome, label, wasNews, dismissReason }: {
  householdId: string; promptId: string; outcome: string; label: string; wasNews?: string; dismissReason?: string;
}) {
  const { state, setState, submit } = useCapture(householdId);
  const onClick = async () => {
    const payload: Record<string, unknown> = { promptId, outcome };
    if (wasNews !== undefined) payload.wasNews = wasNews;
    if (dismissReason !== undefined) payload.dismissReason = dismissReason;
    const v = validatePromptOutcome(payload);
    if (!v.ok) { setState({ phase: "refused", reason: v.reason }); return; }
    await submit("prompt.outcome", payload);
  };
  return (
    <span style={{ display: "inline-flex", gap: 4, alignItems: "center" }}>
      <button className="act subtle" onClick={() => void onClick()}>{label}</button>
      {state.phase !== "idle" && <StatusChip state={state} />}
    </span>
  );
}
