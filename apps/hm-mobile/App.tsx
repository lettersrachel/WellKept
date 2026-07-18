/**
 * Well Kept HM app (sprints 3-5 native shell). The domain is the SAME
 * verified packages the web wizard uses — @wellkept/close-flow and
 * @wellkept/offline-queue — with AsyncStorage persistence and a fetch
 * transport to /api/visit-commands.
 *
 * Dev bridge until mobile auth lands (a device-code or deep-link session
 * exchange, its own sprint): set EXPO_PUBLIC_API_URL to the dev server and
 * EXPO_PUBLIC_SESSION_COOKIE to a signed-in HM's authjs.session-token
 * cookie. Without them the app runs fully offline: capture works, queue
 * persists, sync waits.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Pressable, SafeAreaView, ScrollView, StatusBar, StyleSheet, Switch, Text, TextInput, View,
} from "react-native";
import { createCloseFlow, type CloseFlow, type CloseFlowState } from "@wellkept/close-flow";
import type { QueueConflict, QueueItem } from "@wellkept/offline-queue";
import { createVisitSync, type VisitSync } from "./src/visit-sync";

const C = { green: "#1C3D2E", gold: "#B08D2A", cream: "#F7F3E8", sage: "#E4EDE4", ink: "#26241F", brick: "#8C2F22", grey: "#6B6B6B" };

const HOUSEHOLD_ID = process.env.EXPO_PUBLIC_HOUSEHOLD_ID ?? "7ed45b9b-aec3-4393-b0a9-19de059a3645";
const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "";
const SESSION_COOKIE = process.env.EXPO_PUBLIC_SESSION_COOKIE ?? "";

const REQUIRED_TASKS = [
  { id: "kitchen", label: "Kitchen reset to zone standard" },
  { id: "linens", label: "Linen rotation, primary and guest" },
  { id: "trash", label: "Bins staged for collection" },
  { id: "walkthrough", label: "Full walkthrough, rear gate latch checked" },
];

export default function App() {
  const flowRef = useRef<CloseFlow | null>(null);
  const syncRef = useRef<VisitSync | null>(null);
  const [state, setState] = useState<CloseFlowState | null>(null);
  const [queueStatus, setQueueStatus] = useState<{ pending: number; conflicts: QueueConflict[] }>({ pending: 0, conflicts: [] });
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [changes, setChanges] = useState("");
  const [dotText, setDotText] = useState("");
  const [zone, setZone] = useState("none");
  const [lifeChange, setLifeChange] = useState(false);
  const [report, setReport] = useState(["", "", ""]);

  const transport = useCallback(async (item: QueueItem) => {
    if (!API_URL) throw new Error("no API configured; staying queued");
    const response = await fetch(`${API_URL}/api/visit-commands`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(SESSION_COOKIE ? { cookie: `authjs.session-token=${SESSION_COOKIE}` } : {}),
      },
      body: JSON.stringify({ idempotencyKey: item.idempotencyKey, type: item.type, payload: item.payload }),
    });
    if (!response.ok) throw new Error(`visit-commands ${response.status}`);
    return (await response.json()) as { conflict?: boolean; reason?: string };
  }, []);

  const refresh = useCallback(() => {
    if (!syncRef.current) return;
    setQueueStatus({ pending: syncRef.current.queue.pending().length, conflicts: syncRef.current.queue.conflicts() });
  }, []);

  useEffect(() => {
    flowRef.current = createCloseFlow({ householdId: HOUSEHOLD_ID, requiredTaskIds: REQUIRED_TASKS.map((t) => t.id) });
    setState(flowRef.current.state);
    void createVisitSync({ householdId: HOUSEHOLD_ID }).then((s) => {
      syncRef.current = s;
      refresh();
    });
  }, [refresh]);

  function run(action: (flow: CloseFlow) => void) {
    try {
      action(flowRef.current!);
      setState(flowRef.current!.state);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  async function submit() {
    try {
      const commands = flowRef.current!.submit();
      setState(flowRef.current!.state);
      for (const command of commands) await syncRef.current!.enqueueAndPersist(command);
      refresh();
      setSubmitted(true);
      await syncRef.current!.sync(transport).catch(() => {});
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  if (!state) return null;
  const missing = flowRef.current!.missingRequiredSteps();

  return (
    <SafeAreaView style={s.root}>
      <StatusBar barStyle="light-content" />
      <ScrollView contentContainerStyle={s.scroll}>
        <View style={s.masthead}>
          <Text style={s.mastheadEyebrow}>HOUSE MANAGER · OFFLINE-FIRST</Text>
          <Text style={s.mastheadTitle}>WELL KEPT</Text>
        </View>

        {error ? <Text style={s.error}>{error}</Text> : null}

        {submitted ? (
          <View style={s.card}>
            <Text style={s.h2}>Visit submitted</Text>
            <Text style={s.note}>
              {queueStatus.pending} item(s) queued on this device; they sync when the API is reachable.
            </Text>
          </View>
        ) : (
          <>
            <View style={s.card}>
              <Text style={s.h2}>Confirm today&apos;s tasks</Text>
              {REQUIRED_TASKS.map((t) => {
                const done = state.completedTaskIds.includes(t.id);
                return (
                  <Pressable key={t.id} style={s.taskRow} onPress={() => run((f) => f.confirmTask(t.id))}>
                    <View style={[s.check, done && s.checkOn]} />
                    <Text style={s.body}>{t.label}</Text>
                  </Pressable>
                );
              })}
            </View>

            <View style={s.card}>
              <Text style={s.h2}>Hours</Text>
              <Pressable
                style={s.chip}
                onPress={() =>
                  run((f) =>
                    f.captureHours({
                      startedAt: new Date(Date.now() - 3 * 3600_000).toISOString(),
                      endedAt: new Date().toISOString(),
                    }),
                  )
                }
              >
                <Text style={s.chipText}>{state.hours ? "Hours confirmed" : "Confirm hours (geofence suggestion)"}</Text>
              </Pressable>
            </View>

            <View style={s.card}>
              <Text style={s.h2}>Photos</Text>
              <Text style={s.note}>Camera capture is a later sprint; this logs a placeholder photo id.</Text>
              <Pressable style={s.chip} onPress={() => run((f) => f.addPhoto(`photo-${Date.now()}`))}>
                <Text style={s.chipText}>Log photo ({state.photoIds.length})</Text>
              </Pressable>
            </View>

            <View style={s.card}>
              <Text style={s.h2}>Changes noticed</Text>
              <Text style={s.note}>&ldquo;none&rdquo; is an answer; blank is not.</Text>
              <TextInput style={s.input} value={changes} onChangeText={setChanges} placeholder="or 'none'" />
              <Pressable style={s.chip} onPress={() => run((f) => f.setChangesNoticed(changes))}>
                <Text style={s.chipText}>Save</Text>
              </Pressable>
            </View>

            <View style={s.card}>
              <Text style={s.h2}>Dots (verbatim, never client-visible)</Text>
              <TextInput style={s.input} value={dotText} onChangeText={setDotText} placeholder="What was said, exactly" />
              <Pressable style={s.chip} onPress={() => { run((f) => f.addDot(dotText)); setDotText(""); }}>
                <Text style={s.chipText}>Log dot ({state.dots.length})</Text>
              </Pressable>
            </View>

            <View style={s.card}>
              <View style={s.row}>
                <Text style={s.h2}>Life-change signal</Text>
                <Switch
                  value={lifeChange}
                  onValueChange={(v) => { setLifeChange(v); run((f) => f.setLifeChangeSignal(v)); }}
                  trackColor={{ true: C.brick }}
                />
              </View>
              <Text style={s.note}>A yes routes to corporate the same day and never becomes a proposal.</Text>
              {state.lifeChangeSignal === null && (
                <Pressable style={s.chip} onPress={() => run((f) => f.setLifeChangeSignal(false))}>
                  <Text style={s.chipText}>Nothing to flag</Text>
                </Pressable>
              )}
            </View>

            <View style={s.card}>
              <Text style={s.h2}>Zone drift</Text>
              <TextInput style={s.input} value={zone} onChangeText={setZone} />
              <Pressable style={s.chip} onPress={() => run((f) => f.setZoneDrift({ answer: zone }))}>
                <Text style={s.chipText}>Save</Text>
              </Pressable>
            </View>

            <View style={s.card}>
              <Text style={s.h2}>The report. Exactly three sentences.</Text>
              {["What was done", "What was noticed", "What comes next"].map((hint, i) => (
                <TextInput
                  key={hint}
                  style={s.input}
                  value={report[i]}
                  onChangeText={(v) => setReport((prev) => prev.map((x, j) => (j === i ? v : x)))}
                  placeholder={hint}
                />
              ))}
              <Pressable style={s.chip} onPress={() => run((f) => report.forEach((sent, i) => f.setReportSentence(i, sent)))}>
                <Text style={s.chipText}>Save report</Text>
              </Pressable>
            </View>

            <Pressable
              style={[s.submit, missing.length > 0 && s.submitDisabled]}
              disabled={missing.length > 0}
              onPress={() => void submit()}
            >
              <Text style={s.submitText}>
                {missing.length > 0 ? `Locked: ${missing.join(", ")}` : "Submit visit report"}
              </Text>
            </Pressable>
          </>
        )}

        <View style={s.card}>
          <Text style={s.h2}>Sync</Text>
          <Text style={s.body}>{queueStatus.pending} command(s) queued on device.</Text>
          <Pressable style={s.chip} onPress={() => void syncRef.current?.sync(transport).catch(() => {}).then(refresh)}>
            <Text style={s.chipText}>Sync now</Text>
          </Pressable>
          {queueStatus.conflicts.map((c) => (
            <Text key={c.mutationId} style={s.error}>{c.reason} — reported to corporate; your work is not lost.</Text>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.cream },
  scroll: { padding: 14, paddingBottom: 40 },
  masthead: { backgroundColor: C.green, borderRadius: 10, padding: 16, marginBottom: 12 },
  mastheadEyebrow: { color: C.gold, fontSize: 10, letterSpacing: 2, fontWeight: "700" },
  mastheadTitle: { color: "#fff", fontSize: 24, fontFamily: "Georgia", marginTop: 4 },
  card: { backgroundColor: "#fff", borderRadius: 10, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: "#e2e0d8" },
  h2: { fontFamily: "Georgia", fontSize: 16, color: C.green, marginBottom: 8 },
  body: { fontSize: 14, color: C.ink },
  note: { fontSize: 12, color: C.grey, fontStyle: "italic", marginBottom: 8 },
  taskRow: { flexDirection: "row", alignItems: "center", paddingVertical: 6, gap: 10 },
  check: { width: 18, height: 18, borderRadius: 4, borderWidth: 1.5, borderColor: C.grey },
  checkOn: { backgroundColor: C.green, borderColor: C.green },
  chip: { backgroundColor: C.green, borderRadius: 8, paddingVertical: 9, paddingHorizontal: 14, alignSelf: "flex-start", marginTop: 6 },
  chipText: { color: "#fff", fontSize: 14 },
  input: { borderWidth: 1, borderColor: "#d8d6cc", borderRadius: 6, padding: 9, fontSize: 14, backgroundColor: "#fff", marginTop: 6 },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  submit: { backgroundColor: C.green, borderRadius: 10, padding: 15, marginBottom: 12 },
  submitDisabled: { backgroundColor: "#b9b4a5" },
  submitText: { color: "#fff", textAlign: "center", fontFamily: "Georgia", fontSize: 16 },
  error: { color: C.brick, fontSize: 13, marginBottom: 8 },
});
