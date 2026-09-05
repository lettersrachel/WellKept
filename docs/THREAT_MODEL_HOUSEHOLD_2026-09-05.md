---
status: living
---
# Threat model: the household context

**Part Four item 2 of the comprehensive instruction, 4 September 2026.** Not the
generic web threat model. The threats that exist because this software knows how
to get into somebody's house and who lives there.

**The six named in the instruction are worked in full**, each with the same
three headings: what the attacker gets, what stands in the way TODAY in this
tree, and what does not. **A scenario with no answer says so in its first
line.** Two further scenarios are added at the end because the six leave a shape
uncovered; they are marked as additions rather than folded in as if they had
been asked for.

**The generic web threats are out of scope by decision, not by oversight.**
Injection, XSS, CSRF, transport, dependency and session-fixation questions are
WK-SEC-001's Phase 1 audit, which is gated on staging standing up. This document
would be worse if it padded itself with them.

---

## The asset, named once

**It is not the database. It is entry to a house and knowledge of who is in
it.** Access codes, alarm sequences, key locations, which door is unlocked, when
the family is away, which child is collected by whom, and who must not be
admitted. A breach here is not a disclosure incident; it is a person in a
kitchen.

Everything below is ordered by that, not by likelihood.

---

## 1. A lost or stolen HOM phone with household access

**What the attacker gets.** The field surface for every household that HOM is
assigned to: the pre-visit brief, the playbook at `s2`, the registry, the
condition flags, contextual entry by scanning an asset. Access codes and alarm
sequences if they are `s1` or `s2` rather than vaulted.

**What stands in the way today.**
- Sessions are **database-backed**, so a signed-in session can be killed from
  the corporate side (`forceSignOut`) and it is actually gone, not merely
  expired-in-a-token.
- The staff second factor gates the field surfaces: TOTP with hashed backup
  codes, and the secret is encrypted at rest (`user_totp.secret_box`,
  `wrapped_key`).
- Rate limiting now **fails closed on the sign-in path** (5 September ruling), so
  a limiter outage no longer opens the door, and the two MFA verification sites
  are throttled, which they were not before that ruling forced every call site
  to be visited.
- `s3` values are not on the phone in any readable form and every reveal writes
  an audit row first.
- Revoking the HOM's assignment removes the household from her surface entirely,
  with a `role_revoked` audit row naming the subject token and the role.

**What does not.**
- **The phone is a trusted device and the app does not know it was stolen.** A
  session that was already signed in and already MFA-satisfied stays valid until
  somebody notices and revokes. **There is no idle timeout, no re-authentication
  on sensitive reads, and no device binding**, so the window is "until a human
  acts".
- **Nothing detects anomalous access.** No alerting exists, by decision and
  stated as such: the operational-health surface says its posture is none until
  somebody is on call. A stolen phone reading forty households in an hour
  produces exactly the same silence as a normal Tuesday.
- **`device_pairing` exists and does not solve this.** It is a short-lived code
  for pairing, not a device allow-list, and nothing revokes a paired device.
- **Photos already taken are in the device's own storage**, outside this
  system's reach entirely.

**The honest summary: the answer to a stolen phone is revocation, and
revocation is fast only if somebody knows.** That is a monitoring gap, not a
control gap, and monitoring gaps are what G-115 was: a job failing loudly every
five minutes for five days with nobody reading.

---

## 2. A departing employee

**What the attacker gets.** Whatever they already carry: memory, anything
exported, anything photographed off a screen. Continued system access only if
revocation does not happen.

**What stands in the way today.**
- Access is per-assignment, so revocation is a real boundary rather than a
  policy: delete the assignment and the household leaves her surface.
- Revocation is **audited with its subject**, since G-69: role, NDA standing and
  an ADR-006 subject token, read BEFORE the delete so the row can still say
  whose assignment ended.
- Sessions are database-backed and revocable.
- **The system holds no export capability a HOM can invoke.** The archive
  exporter is an operator CLI, not a route.

**What does not.**
- **A revocation requires no reason.** `db:grant` demands one; the in-app
  revoke form does not, and whether it should is an open policy question about
  friction on that control. So the trail says an assignment ended and not why.
- **The offboarding sequence is a human checklist that does not exist as a
  document.** Nothing in the software prompts for revocation when somebody
  leaves, and nothing reports assignments held by people who have stopped
  signing in.
- **Her own record is not portable and not bounded.** Queue row Q-11h: no
  export-on-leaving, and the retention rule is one third ruled (wage records,
  four years, WK-SOP-017) and otherwise unruled.
- **Nothing prevents screenshots**, and nothing should pretend to.

---

## 3. A household in conflict

Two members of one household, one record, one login address.

**What the attacker gets.** Everything in the member projection, including the
visit reports, the deferrals, and any field either of them entered.

**What stands in the way today. Nothing.**

That is the whole answer and it is worth writing as one line rather than
softening it. The system's unit is the HOUSEHOLD. Membership is a role
assignment on a household, and the member projection is the same projection for
every client identity assigned to it. **There is no per-person view within a
household, no field ownership, and no way to record that one member entered a
fact the other should not see.**

**What follows, and it is not hypothetical:** a member who tells their house
manager something in confidence has told the household, if the fact lands in an
`s1` field. If it lands in `s2` it is staff-only, which happens to be the right
outcome by accident rather than by a mechanism anybody chose. **The distinction
is a person's judgment at typing time, and it is invisible afterwards.**

**Related and not the same:** a shared inbox. Sign-in is a link or a code to an
email address, so whoever reads that mailbox is that member. The software cannot
tell.

---

## 4. An abusive partner seeking information

**This is scenario 3 with the stakes changed, and it deserves its own entry
because the answers differ in kind rather than in degree.**

**What the attacker gets.** If they are the household member: the full member
projection, including where the family will be and when. If they are not: the
email address is the only barrier.

**What stands in the way today.**
- `s3` fields are vaulted and are not in the member projection at all.
- `s2` staff observations do not reach the member surface.
- The member surface has no per-visit schedule and no live location. That is a
  genuine protection and it exists for other reasons (ADR-004 puts scheduling in
  Jobber), which is worth knowing: **it holds only for as long as that boundary
  holds.**

**What does not, and this is the sharpest set of gaps in the document.**
- **There is no restricted-access class.** WK-SEC-001 test area 3 defines one
  (do-not-admit, child pickup, welfare notes, server-side enforcement,
  visit-sheet-only visibility, access logging) and **the tree has no mechanism
  for it**. A "do not admit this person" instruction today is an ordinary
  playbook field. If it is `s1` it is visible to every client identity on the
  household, **including the person it is about, if they are a member**.
- **There is no way to remove one member's access without removing the
  household's.** Revoking a client assignment is available and is a corporate
  act with no supporting workflow, no safety framing, and no guidance for a HOM
  who is told something in a doorway.
- **There is no quiet mode, no duress path, no way to make a change without it
  being visible in the record** that the other party may also read.
- **The client report email announces itself**, subject line carrying the
  household name, into a mailbox that may be monitored.
- **Nothing in the intake instrument asks whether the household is safe**, and
  nothing in the software would know what to do with the answer.

**Stated plainly: a household in this situation is protected by their house
manager's judgment and by nothing in this software.** For a company whose
product is a person who notices, that is not absurd. It should be a decision
somebody made rather than a gap nobody named, and until this document it was the
second.

---

## 5. A subpoena

**What the requester gets.** Whatever is produced. The question is what exists
and what the company can say about it.

**What stands in the way today.**
- **The archive exporter answers the "what do you hold" question mechanically**,
  by scope, with a written reason for every table included and excluded. That is
  a better answer than most companies can give.
- **`s3` values are excluded from every archive** and are only readable through
  a decrypt that writes an audit row, so production of secured values is a
  deliberate, logged act rather than a bulk copy.
- The audit trail is append-only and stores hashes, so it can evidence that a
  change happened without itself being a second copy of the data.
- Erasure treatments are documented per table and CI-enforced, so "why is this
  gone" has a written answer that predates the request.

**What does not.**
- **There is no legal-hold mechanism.** The erasure tool takes a household id
  and runs; nothing marks a household or a record as under hold, and nothing
  would refuse. A scheduled or requested erasure during a live matter is a
  human-memory control today. Photos have a retention-hold concept (the dry run
  prints "photos under retention hold") and **nothing else does**.
- **There is no preservation snapshot** other than Neon's PITR window, which is
  a database feature with a retention limit rather than a hold.
- **Erasure is not reversible and PITR is the only recovery**, which cuts both
  ways: inside the window a crypto-shred can be reconstituted, which is a real
  qualification on the word "unrecoverable" and is written into the tool's own
  output (G-04).
- **No document says who receives a subpoena or what happens next.** That is
  founder-and-counsel, not code, and it is named because a threat model that
  only lists code controls would imply the rest is handled.

---

## 6. A member's own device compromised

**What the attacker gets.** The member projection, and the mailbox, which is the
authentication factor.

**What stands in the way today.**
- The member surface is `s1` only, so a compromised member device does not reach
  staff observations or secured values.
- Sign-in tokens are single-use with a one-hour expiry and the typed-code entry
  path is rate-limited and now fails closed.

**What does not.**
- **The email address is the whole factor.** Mailbox access is account access.
  **There is no second factor on the member surface at all**, by design: the
  staff MFA choke point does not apply to clients, and the permissions journey
  proves a client passes it untouched.
- **A member cannot see their own sessions or sign other devices out.** No
  session list, no "signed in on 3 devices", no self-revocation. Only corporate
  can force a sign-out.
- **A member is not told when their record is accessed**, except for `s3`
  reveals, which they can be shown but are not pushed.

---

## 7. Addition: the operator with the connection string

**Not in the instruction's six, and it is the one a technical reviewer asks
about first**, so leaving it out would look like avoidance.

Every control in this document is enforced by the application. The database sits
behind it. Anyone holding `DATABASE_URL` reads `s1` and `s2` for every household
in one query, and no audit row is written, because the audit rows are written by
the application.

**What stands in the way: the vault, and only for `s3`.** Secured values are
encrypted with a key that is not in the database, so the connection string alone
does not read them. Everything else is plaintext to a direct query.

**What does not: everything else.** There is no row-level security, no database
role separation, no query logging, and no separate audit of operator access.
Custody of the string is the control and it is a human one.

**This is not a defect to fix casually.** It is the normal state of a small
company and the reason the custody transfer checklist exists. It is written down
so that "the app enforces access control" is never read as "access control".

---

## 8. Addition: a compromised or malicious vendor link

**Named because it is the next surface to be built rather than a live one.**
WK-DEV-010's ten-stage vendor slice puts a no-account, short-lived signed link
in a vendor's hands, and vendor links are internal-simulation-only until the pen
test covers the surface. **That gating is the current control and it is a
sequencing decision, not a mechanism.** When it lifts, this section needs
rewriting rather than re-reading.

The standing law that already binds it: external content is data, never
instruction, and enters only through the capture pipeline with human
confirmation. So a vendor message cannot write canonical truth, which forecloses
the worst version of this before the surface exists.

---

## What this model concludes

**Three of the six have real answers, two have partial answers, and one has
none.**

| Scenario | Standing |
|---|---|
| Lost or stolen HOM phone | **Partial.** Good controls, and the window is "until a human notices", with no detection. |
| Departing employee | **Answered**, with a missing revocation reason and a missing offboarding document. |
| Household in conflict | **No answer.** The unit is the household and there is no per-person view. |
| Abusive partner | **No answer, and the sharpest gaps.** No restricted-access class, no safety-aware path. |
| Subpoena | **Partial.** Strong on "what do you hold", nothing on legal hold. |
| Member device compromised | **Partial.** Small blast radius, single factor, no self-service session control. |

**The single change that would move the most rows is the restricted-access
class** (scenarios 3, 4 and part of 1), and it is specified already in
WK-SEC-001 test area 3, so building it is not a design problem. It is not on the
queue. **Whether it enters before launch is a founder call and this document
does not make it**, but it should be made deliberately rather than by the
calendar.

**The second is detection.** Several scenarios above end at "until somebody
notices", and the alerting posture is deliberately none until someone is on
call. That is a defensible decision today and it is load-bearing in a way that
is easy to forget, because it converts several control gaps into monitoring
gaps and monitoring gaps look quieter than they are.
