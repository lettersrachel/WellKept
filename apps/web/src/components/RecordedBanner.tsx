/**
 * G-68: the visible half of an action that WORKED.
 *
 * G-29 gave every refusal a banner. Success kept ending at
 * `revalidatePath`, so a write that landed and a button that did nothing
 * looked identical: the page re-rendered, and the operator was left
 * reading the table to guess whether their click had counted. That is
 * the same ambiguity G-29 existed to kill, one direction over, and it is
 * how two corporate actions could report clean and write nothing on the
 * evening of 25 August 2026 (G-67) with nobody able to tell.
 *
 * The message is composed by the action, which names WHAT it recorded and
 * never a value: it travels as a URL parameter, so it lands in browser
 * history. Roles, kinds, counts and field names, never field contents.
 *
 * `label` exists for the client surface, where "Recorded" is our word for
 * our record and not what a member wants read back to them.
 */
export function RecordedBanner({ what, label = "Recorded:", note }: { what?: string; label?: string; note?: string }) {
  if (!what) return null;
  return (
    <div className="card" role="status" style={{ borderColor: "#2E6B3F", marginBottom: 12 }}>
      <strong>{label}</strong> {what}{note ? `; ${note}` : "."}
    </div>
  );
}
