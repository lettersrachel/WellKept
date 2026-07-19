/**
 * Well Kept HM app (native shell). The domain is the SAME verified packages the
 * web wizard uses — @wellkept/close-flow and @wellkept/offline-queue — with
 * AsyncStorage persistence and a fetch transport to /api/visit-commands.
 *
 * Auth is real now: the phone holds a keychain session (src/session) obtained
 * by pairing against the web /link-device screen (device-code exchange). No
 * network? Capture still works, the queue persists, and sync waits. On first
 * launch (or after sign-out) the pairing screen shows instead.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator, Image, Pressable, SafeAreaView, ScrollView, StatusBar, StyleSheet, Switch, Text, TextInput, View,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import * as Crypto from "expo-crypto";
import { createCloseFlow, type CloseFlow, type CloseFlowState } from "@wellkept/close-flow";
import type { QueueConflict, QueueItem } from "@wellkept/offline-queue";
import { createVisitSync, type VisitSync } from "./src/visit-sync";
import { loadSession, clearSession, pairDevice, type Household, type Session } from "./src/session";
import { fetchBriefing, type Briefing } from "./src/briefing";
import { uploadPhoto, type LocalPhoto } from "./src/photos";
import { loadPendingPhotos, savePendingPhotos } from "./src/photo-store";

const C = { green: "#1C3D2E", gold: "#B08D2A", cream: "#F7F3E8", sage: "#E4EDE4", ink: "#26241F", brick: "#8C2F22", grey: "#6B6B6B" };

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "";

const REQUIRED_TASKS = [
  { id: "kitchen", label: "Kitchen reset to zone standard" },
  { id: "linens", label: "Linen rotation, primary and guest" },
  { id: "trash", label: "Bins staged for collection" },
  { id: "walkthrough", label: "Full walkthrough, rear gate latch checked" },
];

export default function App() {
  const [booting, setBooting] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [household, setHousehold] = useState<Household | null>(null);

  useEffect(() => {
    void loadSession().then((s) => {
      setSession(s);
      if (s && s.households.length === 1) setHousehold(s.households[0]!);
      setBooting(false);
    });
  }, []);

  async function signOut() {
    await clearSession();
    setSession(null);
    setHousehold(null);
  }

  if (booting) {
    return (
      <SafeAreaView style={[s.root, s.centered]}>
        <ActivityIndicator color={C.green} />
      </SafeAreaView>
    );
  }

  if (!session) {
    return <PairingScreen onPaired={(s) => { setSession(s); if (s.households.length === 1) setHousehold(s.households[0]!); }} />;
  }

  if (session.households.length === 0) {
    return (
      <SafeAreaView style={s.root}>
        <Masthead subtitle="HOUSE MANAGER" />
        <View style={s.card}>
          <Text style={s.h2}>No household assignments</Text>
          <Text style={s.note}>This account isn&apos;t assigned to any household as a house manager yet. Ask corporate to add you, then sign in again.</Text>
          <Pressable style={s.chip} onPress={() => void signOut()}><Text style={s.chipText}>Sign out</Text></Pressable>
        </View>
      </SafeAreaView>
    );
  }

  if (!household) {
    return (
      <SafeAreaView style={s.root}>
        <Masthead subtitle="CHOOSE A HOUSEHOLD" />
        <ScrollView contentContainerStyle={s.scroll}>
          <View style={s.card}>
            <Text style={s.h2}>Which visit?</Text>
            {session.households.map((h) => (
              <Pressable key={h.id} style={s.pickRow} onPress={() => setHousehold(h)}>
                <Text style={s.body}>{h.name}</Text>
                <Text style={s.note}>{h.role.replace("_", " ")}</Text>
              </Pressable>
            ))}
          </View>
          <Pressable style={s.linkBtn} onPress={() => void signOut()}><Text style={s.linkText}>Sign out</Text></Pressable>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <CloseFlowScreen
      key={household.id}
      token={session.token}
      household={household}
      canSwitch={session.households.length > 1}
      onSwitch={() => setHousehold(null)}
      onSignOut={() => void signOut()}
    />
  );
}

function Masthead({ subtitle }: { subtitle: string }) {
  return (
    <View style={s.masthead}>
      <Text style={s.mastheadEyebrow}>{subtitle}</Text>
      <Text style={s.mastheadTitle}>WELL KEPT</Text>
    </View>
  );
}

function PairingScreen({ onPaired }: { onPaired: (s: Session) => void }) {
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      onPaired(await pairDevice(API_URL, code));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={s.root}>
      <ScrollView contentContainerStyle={s.scroll}>
        <Masthead subtitle="PAIR THIS DEVICE" />
        <View style={s.card}>
          <Text style={s.h2}>Connect your phone</Text>
          <Text style={s.note}>
            On a computer or browser, sign in to Well Kept and open <Text style={{ fontWeight: "700" }}>Link your phone</Text>.
            Enter the code it shows below.
          </Text>
          <TextInput
            style={[s.input, s.codeInput]}
            value={code}
            onChangeText={setCode}
            placeholder="abcd-efgh"
            autoCapitalize="none"
            autoCorrect={false}
            editable={!busy}
          />
          {error ? <Text style={s.error}>{error}</Text> : null}
          <Pressable style={[s.submit, (busy || code.trim().length < 8) && s.submitDisabled]} disabled={busy || code.trim().length < 8} onPress={() => void submit()}>
            <Text style={s.submitText}>{busy ? "Pairing…" : "Pair device"}</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function CloseFlowScreen({
  token, household, canSwitch, onSwitch, onSignOut,
}: {
  token: string; household: Household; canSwitch: boolean; onSwitch: () => void; onSignOut: () => void;
}) {
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
  const [briefing, setBriefing] = useState<Briefing | null>(null);
  const [briefingStale, setBriefingStale] = useState(false);
  const [photos, setPhotos] = useState<LocalPhoto[]>([]);
  const [photosHydrated, setPhotosHydrated] = useState(false);

  // Rehydrate any photos captured but not yet synced on a prior run.
  useEffect(() => {
    void loadPendingPhotos(household.id).then((saved) => {
      if (saved.length) {
        setPhotos((prev) => [...saved, ...prev]);
        saved.forEach((p) => run((f) => f.addPhoto(p.photoId)));
      }
      setPhotosHydrated(true);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [household.id]);

  // Persist pending photos whenever the set changes (after hydration).
  useEffect(() => {
    if (photosHydrated) void savePendingPhotos(household.id, photos);
  }, [photos, photosHydrated, household.id]);

  async function capturePhoto() {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) { setError("Camera access is needed to add a visit photo."); return; }
    const res = await ImagePicker.launchCameraAsync({ quality: 1 });
    if (res.canceled || !res.assets?.[0]) return;
    // Downscale + compress on device so uploads (and the local store) stay small.
    const shrunk = await ImageManipulator.manipulateAsync(
      res.assets[0].uri,
      [{ resize: { width: 1600 } }],
      { compress: 0.5, format: ImageManipulator.SaveFormat.JPEG, base64: true },
    );
    if (!shrunk.base64) return;
    const photoId = Crypto.randomUUID();
    setPhotos((prev) => [...prev, { photoId, localUri: shrunk.uri, base64: shrunk.base64!, contentType: "image/jpeg", uploaded: false }]);
    run((f) => f.addPhoto(photoId));
  }

  const uploadPendingPhotos = useCallback(async () => {
    const pending = photos.filter((p) => !p.uploaded);
    for (const p of pending) {
      if (await uploadPhoto(API_URL, token, household.id, p)) {
        setPhotos((prev) => prev.map((x) => (x.photoId === p.photoId ? { ...x, uploaded: true } : x)));
      }
    }
  }, [photos, token, household.id]);

  useEffect(() => {
    let live = true;
    void fetchBriefing(API_URL, token, household.id).then(({ briefing: b, stale }) => {
      if (!live) return;
      setBriefing(b);
      setBriefingStale(stale);
    });
    return () => { live = false; };
  }, [household.id, token]);

  const transport = useCallback(async (item: QueueItem) => {
    if (!API_URL) throw new Error("no API configured; staying queued");
    const response = await fetch(`${API_URL}/api/visit-commands`, {
      method: "POST",
      headers: { "content-type": "application/json", cookie: `authjs.session-token=${token}` },
      body: JSON.stringify({ idempotencyKey: item.idempotencyKey, type: item.type, payload: item.payload }),
    });
    if (!response.ok) throw new Error(`visit-commands ${response.status}`);
    return (await response.json()) as { conflict?: boolean; reason?: string };
  }, [token]);

  const refresh = useCallback(() => {
    if (!syncRef.current) return;
    setQueueStatus({ pending: syncRef.current.queue.pending().length, conflicts: syncRef.current.queue.conflicts() });
  }, []);

  useEffect(() => {
    flowRef.current = createCloseFlow({ householdId: household.id, requiredTaskIds: REQUIRED_TASKS.map((t) => t.id) });
    setState(flowRef.current.state);
    void createVisitSync({ householdId: household.id }).then((sync) => {
      syncRef.current = sync;
      refresh();
    });
  }, [household.id, refresh]);

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
      await uploadPendingPhotos(); // photos land before the visit that references them
      await syncRef.current!.sync(transport).catch(() => {});
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  if (!state) return <SafeAreaView style={[s.root, s.centered]}><ActivityIndicator color={C.green} /></SafeAreaView>;
  const missing = flowRef.current!.missingRequiredSteps();

  return (
    <SafeAreaView style={s.root}>
      <StatusBar barStyle="light-content" />
      <ScrollView contentContainerStyle={s.scroll}>
        <View style={s.masthead}>
          <Text style={s.mastheadEyebrow}>HOUSE MANAGER · OFFLINE-FIRST</Text>
          <Text style={s.mastheadTitle}>WELL KEPT</Text>
          <Text style={s.mastheadHome}>{household.name}</Text>
          <View style={s.mastheadActions}>
            {canSwitch ? <Pressable onPress={onSwitch}><Text style={s.mastheadLink}>Switch household</Text></Pressable> : <View />}
            <Pressable onPress={onSignOut}><Text style={s.mastheadLink}>Sign out</Text></Pressable>
          </View>
        </View>

        {error ? <Text style={s.error}>{error}</Text> : null}

        {submitted ? (
          <View style={s.card}>
            <Text style={s.h2}>Visit submitted</Text>
            <Text style={s.note}>{queueStatus.pending} item(s) queued on this device; they sync when the API is reachable.</Text>
          </View>
        ) : (
          <>
            <BriefingView briefing={briefing} stale={briefingStale} />

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
                onPress={() => run((f) => f.captureHours({ startedAt: new Date(Date.now() - 3 * 3600_000).toISOString(), endedAt: new Date().toISOString() }))}
              >
                <Text style={s.chipText}>{state.hours ? "Hours confirmed" : "Confirm hours (geofence suggestion)"}</Text>
              </Pressable>
            </View>

            <View style={s.card}>
              <Text style={s.h2}>Photos</Text>
              <Text style={s.note}>Taken here, uploaded on sync. Works offline — they wait with the visit.</Text>
              <Pressable style={s.chip} onPress={() => void capturePhoto()}>
                <Text style={s.chipText}>Take photo ({photos.length})</Text>
              </Pressable>
              {photos.length > 0 && (
                <View style={s.thumbRow}>
                  {photos.map((p) => (
                    <View key={p.photoId} style={s.thumbWrap}>
                      <Image source={{ uri: p.localUri }} style={s.thumb} />
                      {!p.uploaded ? <Text style={s.thumbPending}>pending</Text> : null}
                    </View>
                  ))}
                </View>
              )}
            </View>

            <View style={s.card}>
              <Text style={s.h2}>Changes noticed</Text>
              <Text style={s.note}>&ldquo;none&rdquo; is an answer; blank is not.</Text>
              <TextInput style={s.input} value={changes} onChangeText={setChanges} placeholder="or 'none'" />
              <Pressable style={s.chip} onPress={() => run((f) => f.setChangesNoticed(changes))}><Text style={s.chipText}>Save</Text></Pressable>
            </View>

            <View style={s.card}>
              <Text style={s.h2}>Dots (verbatim, never client-visible)</Text>
              <TextInput style={s.input} value={dotText} onChangeText={setDotText} placeholder="What was said, exactly" />
              <Pressable style={s.chip} onPress={() => { run((f) => f.addDot(dotText)); setDotText(""); }}><Text style={s.chipText}>Log dot ({state.dots.length})</Text></Pressable>
            </View>

            <View style={s.card}>
              <View style={s.row}>
                <Text style={s.h2}>Life-change signal</Text>
                <Switch value={lifeChange} onValueChange={(v) => { setLifeChange(v); run((f) => f.setLifeChangeSignal(v)); }} trackColor={{ true: C.brick }} />
              </View>
              <Text style={s.note}>A yes routes to corporate the same day and never becomes a proposal.</Text>
              {state.lifeChangeSignal === null && (
                <Pressable style={s.chip} onPress={() => run((f) => f.setLifeChangeSignal(false))}><Text style={s.chipText}>Nothing to flag</Text></Pressable>
              )}
            </View>

            <View style={s.card}>
              <Text style={s.h2}>Zone drift</Text>
              <TextInput style={s.input} value={zone} onChangeText={setZone} />
              <Pressable style={s.chip} onPress={() => run((f) => f.setZoneDrift({ answer: zone }))}><Text style={s.chipText}>Save</Text></Pressable>
            </View>

            <View style={s.card}>
              <Text style={s.h2}>The report. Exactly three sentences.</Text>
              {["What was done", "What was noticed", "What comes next"].map((hint, i) => (
                <TextInput key={hint} style={s.input} value={report[i]} onChangeText={(v) => setReport((prev) => prev.map((x, j) => (j === i ? v : x)))} placeholder={hint} />
              ))}
              <Pressable style={s.chip} onPress={() => run((f) => report.forEach((sent, i) => f.setReportSentence(i, sent)))}><Text style={s.chipText}>Save report</Text></Pressable>
            </View>

            <Pressable style={[s.submit, missing.length > 0 && s.submitDisabled]} disabled={missing.length > 0} onPress={() => void submit()}>
              <Text style={s.submitText}>{missing.length > 0 ? `Locked: ${missing.join(", ")}` : "Submit visit report"}</Text>
            </Pressable>
          </>
        )}

        <View style={s.card}>
          <Text style={s.h2}>Sync</Text>
          <Text style={s.body}>{queueStatus.pending} command(s) queued on device.</Text>
          <Pressable style={s.chip} onPress={() => void (async () => { await uploadPendingPhotos(); await syncRef.current?.sync(transport).catch(() => {}); refresh(); })()}><Text style={s.chipText}>Sync now</Text></Pressable>
          {queueStatus.conflicts.map((c) => (
            <Text key={c.mutationId} style={s.error}>{c.reason} — reported to corporate; your work is not lost.</Text>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function flagColor(flag: string): string {
  if (flag === "CRITICAL") return C.brick;
  if (flag === "CAUTION") return C.gold;
  if (flag === "DELIGHT") return C.green;
  return C.grey;
}

function BriefingView({ briefing, stale }: { briefing: Briefing | null; stale: boolean }) {
  if (!briefing) {
    return (
      <View style={s.card}>
        <Text style={s.h2}>Briefing</Text>
        <Text style={s.note}>{stale ? "Offline — no saved briefing for this home yet. Connect once to load it." : "Loading the live record…"}</Text>
      </View>
    );
  }
  const { flags, changed, specials, radar, dots, household } = briefing;
  const fmt = (iso: string) => new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return (
    <View style={s.card}>
      <View style={s.row}>
        <Text style={s.h2}>Briefing</Text>
        {stale ? <Text style={s.staleBadge}>cached</Text> : null}
      </View>
      {household.lifeEvent ? <Text style={[s.note, { color: C.gold }]}>LIFE-EVENT — prompts held; care continues, asks stop.</Text> : null}

      <Text style={s.briefLabel}>Flags first</Text>
      {flags.length === 0 ? <Text style={s.note}>No flags on this record.</Text> : flags.map((f, i) => (
        <View key={i} style={[s.flagRow, { borderLeftColor: flagColor(f.flag) }]}>
          <Text style={[s.flagTag, { color: flagColor(f.flag) }]}>{f.flag}</Text>
          <Text style={s.briefName}>{f.name.split(":")[0]}</Text>
          {f.value ? <Text style={s.briefVal}>{f.value}</Text> : null}
        </View>
      ))}

      {changed.length > 0 ? (
        <>
          <Text style={s.briefLabel}>Changed since last visit</Text>
          {changed.map((d, i) => (
            <View key={i} style={s.briefItem}>
              <Text style={s.briefName}>{d.name}</Text>
              <Text style={s.briefVal}>{d.value}</Text>
              <Text style={s.prov}>updated {fmt(d.updatedAt)} · {d.provenance}</Text>
            </View>
          ))}
        </>
      ) : null}

      {specials.length > 0 ? (
        <>
          <Text style={s.briefLabel}>Today&apos;s specials</Text>
          {specials.map((sp, i) => (
            <View key={i} style={[s.briefItem, { backgroundColor: C.sage, borderRadius: 6, padding: 8 }]}>
              <Text style={s.briefVal}>{sp.text}</Text>
              <Text style={s.prov}>{sp.packName} · due today</Text>
            </View>
          ))}
        </>
      ) : null}

      {radar.length > 0 ? (
        <>
          <Text style={s.briefLabel}>Coming up</Text>
          {radar.map((r, i) => (
            <View key={i} style={s.briefItem}>
              <Text style={s.briefVal}>{r.text}</Text>
              <Text style={s.prov}>{r.packName} · {fmt(r.fireAt)}</Text>
            </View>
          ))}
        </>
      ) : null}

      {dots.length > 0 ? (
        <>
          <Text style={s.briefLabel}>Open dots (never client-visible)</Text>
          {dots.map((d, i) => (
            <View key={i} style={s.briefItem}>
              <Text style={[s.briefVal, { fontStyle: "italic" }]}>&ldquo;{d.verbatim}&rdquo;</Text>
              <Text style={s.prov}>heard {fmt(d.heardAt)}</Text>
            </View>
          ))}
        </>
      ) : null}
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.cream },
  centered: { alignItems: "center", justifyContent: "center" },
  scroll: { padding: 14, paddingBottom: 40 },
  masthead: { backgroundColor: C.green, borderRadius: 10, padding: 16, margin: 14, marginBottom: 12 },
  mastheadEyebrow: { color: C.gold, fontSize: 10, letterSpacing: 2, fontWeight: "700" },
  mastheadTitle: { color: "#fff", fontSize: 24, fontFamily: "Georgia", marginTop: 4 },
  mastheadHome: { color: C.sage, fontSize: 14, marginTop: 6 },
  mastheadActions: { flexDirection: "row", justifyContent: "space-between", marginTop: 10 },
  mastheadLink: { color: C.gold, fontSize: 12, fontWeight: "600" },
  card: { backgroundColor: "#fff", borderRadius: 10, padding: 14, marginHorizontal: 14, marginBottom: 12, borderWidth: 1, borderColor: "#e2e0d8" },
  h2: { fontFamily: "Georgia", fontSize: 16, color: C.green, marginBottom: 8 },
  body: { fontSize: 14, color: C.ink },
  note: { fontSize: 12, color: C.grey, fontStyle: "italic", marginBottom: 8 },
  taskRow: { flexDirection: "row", alignItems: "center", paddingVertical: 6, gap: 10 },
  pickRow: { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "#eee" },
  check: { width: 18, height: 18, borderRadius: 4, borderWidth: 1.5, borderColor: C.grey },
  checkOn: { backgroundColor: C.green, borderColor: C.green },
  chip: { backgroundColor: C.green, borderRadius: 8, paddingVertical: 9, paddingHorizontal: 14, alignSelf: "flex-start", marginTop: 6 },
  chipText: { color: "#fff", fontSize: 14 },
  input: { borderWidth: 1, borderColor: "#d8d6cc", borderRadius: 6, padding: 9, fontSize: 14, backgroundColor: "#fff", marginTop: 6 },
  codeInput: { fontFamily: "Georgia", fontSize: 22, letterSpacing: 4, textAlign: "center" },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  submit: { backgroundColor: C.green, borderRadius: 10, padding: 15, marginTop: 10 },
  submitDisabled: { backgroundColor: "#b9b4a5" },
  submitText: { color: "#fff", textAlign: "center", fontFamily: "Georgia", fontSize: 16 },
  linkBtn: { alignItems: "center", padding: 12 },
  linkText: { color: C.grey, fontSize: 13, textDecorationLine: "underline" },
  error: { color: C.brick, fontSize: 13, marginTop: 8 },
  staleBadge: { fontSize: 10, color: C.grey, fontWeight: "700", letterSpacing: 1, textTransform: "uppercase" },
  briefLabel: { fontSize: 11, color: C.gold, fontWeight: "700", letterSpacing: 1, textTransform: "uppercase", marginTop: 12, marginBottom: 4 },
  flagRow: { borderLeftWidth: 3, paddingLeft: 8, paddingVertical: 4, marginBottom: 6 },
  flagTag: { fontSize: 10, fontWeight: "700", letterSpacing: 1 },
  briefItem: { paddingVertical: 4, marginBottom: 4 },
  briefName: { fontSize: 13, color: C.ink, fontWeight: "600" },
  briefVal: { fontSize: 13, color: C.ink, marginTop: 1 },
  prov: { fontSize: 11, color: C.grey, fontStyle: "italic", marginTop: 1 },
  thumbRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 10 },
  thumbWrap: { position: "relative" },
  thumb: { width: 64, height: 64, borderRadius: 6, backgroundColor: "#eee" },
  thumbPending: { position: "absolute", bottom: 0, left: 0, right: 0, fontSize: 9, color: "#fff", backgroundColor: "rgba(140,47,34,0.85)", textAlign: "center", borderBottomLeftRadius: 6, borderBottomRightRadius: 6 },
});
