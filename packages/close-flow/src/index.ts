/**
 * The close flow (REQ-031): required capture is a state machine, never a
 * UI-only disabled button. Ported from the July 12 foundation repo's
 * verified packages/close-flow.
 *
 * globalThis.crypto.randomUUID (not node:crypto) so this module runs
 * unchanged in a browser bundle — the flow must execute client-side to work
 * offline. Same Web Crypto surface in Node and the browser.
 */
const randomUUID = () => globalThis.crypto.randomUUID();

export class CloseFlowError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CloseFlowError";
  }
}

const nonBlank = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;

export interface Dot { id: string; verbatim: string; heardAt: string }
export interface Hours { startedAt: string; endedAt: string }
export interface ZoneDrift { answer: string; photoId: string | null }

export interface CloseFlowState {
  id: string;
  householdId: string;
  startedAt: string;
  requiredTaskIds: string[];
  completedTaskIds: string[];
  hours: Hours | null;
  photoIds: string[];
  changesNoticed: string | null;
  dots: Dot[];
  lifeChangeSignal: boolean | null;
  zoneDrift: ZoneDrift | null;
  report: [string, string, string];
  submittedAt: string | null;
}

export interface VisitCommand {
  type: "visit.submit" | "dot.create" | "signal.route";
  idempotencyKey: string;
  // Every command payload carries its householdId (the queue routes on it).
  payload: { householdId: string; [k: string]: unknown };
}

export type MissingStep =
  | "tasks" | "hours" | "photos" | "changes_noticed"
  | "life_change_signal" | "zone_drift" | "three_sentence_report";

export interface CloseFlow {
  readonly state: CloseFlowState;
  confirmTask(taskId: string): void;
  captureHours(hours: { startedAt: string; endedAt: string }): void;
  addPhoto(photoId: string): void;
  setChangesNoticed(value: string): void;
  addDot(verbatim: string): void;
  setLifeChangeSignal(value: boolean): void;
  setZoneDrift(input: { answer: string; photoId?: string | null }): void;
  setReportSentence(index: number, value: string): void;
  missingRequiredSteps(): MissingStep[];
  submit(): VisitCommand[];
}

export function createCloseFlow({
  householdId,
  requiredTaskIds,
  startedAt = new Date().toISOString(),
}: {
  householdId: string;
  requiredTaskIds: string[];
  startedAt?: string;
}): CloseFlow {
  if (!nonBlank(householdId) || !Array.isArray(requiredTaskIds) || requiredTaskIds.length === 0) {
    throw new CloseFlowError("household and required tasks are required");
  }
  const state: CloseFlowState = {
    id: randomUUID(),
    householdId,
    startedAt,
    requiredTaskIds: [...new Set(requiredTaskIds)],
    completedTaskIds: [],
    hours: null,
    photoIds: [],
    changesNoticed: null,
    dots: [],
    lifeChangeSignal: null,
    zoneDrift: null,
    report: ["", "", ""],
    submittedAt: null,
  };
  const flow: CloseFlow = {
    get state() {
      return structuredClone(state);
    },
    confirmTask(taskId) {
      if (!state.requiredTaskIds.includes(taskId)) throw new CloseFlowError("unknown task");
      if (!state.completedTaskIds.includes(taskId)) state.completedTaskIds.push(taskId);
    },
    captureHours({ startedAt: started, endedAt }) {
      const start = new Date(started);
      const end = new Date(endedAt);
      if (Number.isNaN(+start) || Number.isNaN(+end) || end <= start) {
        throw new CloseFlowError("hours must have a valid positive interval");
      }
      state.hours = { startedAt: start.toISOString(), endedAt: end.toISOString() };
    },
    addPhoto(photoId) {
      if (!nonBlank(photoId)) throw new CloseFlowError("photo id is required");
      if (!state.photoIds.includes(photoId)) state.photoIds.push(photoId);
    },
    setChangesNoticed(value) {
      if (!nonBlank(value)) {
        throw new CloseFlowError("changes noticed requires an answer; use none when appropriate");
      }
      state.changesNoticed = value.trim();
    },
    addDot(verbatim) {
      if (!nonBlank(verbatim)) throw new CloseFlowError("dot must be verbatim text");
      state.dots.push({ id: randomUUID(), verbatim: verbatim.trim(), heardAt: new Date().toISOString() });
    },
    setLifeChangeSignal(value) {
      if (typeof value !== "boolean") throw new CloseFlowError("life-change signal requires yes or no");
      state.lifeChangeSignal = value;
    },
    setZoneDrift({ answer, photoId = null }) {
      if (!nonBlank(answer)) {
        throw new CloseFlowError("zone drift requires an answer; use none when appropriate");
      }
      if (answer.trim().toLowerCase() !== "none" && !nonBlank(photoId)) {
        throw new CloseFlowError("zone drift requires a photo");
      }
      state.zoneDrift = { answer: answer.trim(), photoId };
    },
    setReportSentence(index, value) {
      if (!Number.isInteger(index) || index < 0 || index > 2 || !nonBlank(value)) {
        throw new CloseFlowError("report requires exactly three non-empty sentences");
      }
      state.report[index as 0 | 1 | 2] = value.trim();
    },
    missingRequiredSteps() {
      const missing: MissingStep[] = [];
      if (state.completedTaskIds.length !== state.requiredTaskIds.length) missing.push("tasks");
      if (!state.hours) missing.push("hours");
      if (state.photoIds.length === 0) missing.push("photos");
      if (!state.changesNoticed) missing.push("changes_noticed");
      if (state.lifeChangeSignal === null) missing.push("life_change_signal");
      if (!state.zoneDrift) missing.push("zone_drift");
      if (state.report.some((sentence) => !nonBlank(sentence))) missing.push("three_sentence_report");
      return missing;
    },
    submit() {
      if (state.submittedAt) throw new CloseFlowError("visit already submitted");
      const missing = flow.missingRequiredSteps();
      if (missing.length) {
        throw new CloseFlowError(`required close-flow steps incomplete: ${missing.join(", ")}`);
      }
      state.submittedAt = new Date().toISOString();
      const commands: VisitCommand[] = [
        { type: "visit.submit", idempotencyKey: state.id, payload: structuredClone(state) as unknown as { householdId: string } },
      ];
      for (const dot of state.dots) {
        commands.push({ type: "dot.create", idempotencyKey: dot.id, payload: { householdId, ...dot } });
      }
      if (state.lifeChangeSignal) {
        commands.push({ type: "signal.route", idempotencyKey: `${state.id}:life-change`, payload: { householdId, visitId: state.id } });
      }
      return commands;
    },
  };
  return flow;
}
