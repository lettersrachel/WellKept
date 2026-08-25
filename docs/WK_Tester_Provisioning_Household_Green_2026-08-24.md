---
status: frozen
---
# Tester Provisioning · Household Green (HG) and Lauren Green · 24 August 2026
Paste-ready for the development session. Issued under the standing authorization (register draft A576). Figure-free; enters docs/. Supersedes the Household One naming throughout: the test household is HOUSEHOLD GREEN (HG), and the founder's correction stands recorded: this test exercises the HOM AND CORPORATE SIDE of the product, not the client side, which remains frozen at the digest.

## 1. Who Lauren is in the system
Lauren Green is an external tester operating the HOM surfaces against Household Green. Provision her as a HOM-ROLE USER, tenant-scoped to household_green ONLY. She is not an employee; the account is a tester account with a HOM role, and that distinction lives in the user record (an is_tester or equivalent flag) so her events are excludable from any covenant, payroll, or learning computation by a single filter. Do not use the trainee role: trainee is for supervised hires with co-sign requirements; Lauren needs full HOM read/write within her one household to exercise the input spine properly.

## 2. Account setup checklist (developer-side)
1. Create the household_green tenant. It starts PSEUDONYMIZED: the codename is the household name, no street address, no contact details, S3 tier empty. Real identifiers and richer data enter only after Phase 1 clears, per the sprint's Day 5 go/no-go, via one importer run.
2. Create the Lauren Green user: role HOM, household scope household_green, tester flag set, standard app authentication; if her account ever gains any privileged or corporate capability, D3 passkey requirements apply at that moment.
3. Seed the tenant with the intake schema (the confirmed Household Zero field list) and a starter fixture set so her first session has something to see: a handful of rooms, three or four assets, one open loop, one upcoming rhythm item. Mark every seeded row as fixture-origin.
4. Re-run the tenant-isolation and permission-matrix tests WITH her account: Lauren must be provably unable to read Household Zero, any synthetic family, any corporate surface, and every Ruling 1 view. Her deny paths are part of the release-blocking matrix now, not an exception to it.
5. Device provisioning, PLATFORM CONFIRMED: iPhone. Until the LLC's Apple Developer account exists, provision the web Cockpit as her interim surface (responsive, with whatever offline caching the web layer honestly supports; record its offline limitations rather than papering over them, and re-run the airplane drill on the native build later). In parallel: check whether the current app runs in Expo Go (possible only if no custom native modules); if yes, that is a better interim than web. Prepare the EAS iOS internal-distribution configuration NOW (bundle identifier under the LLC, provisioning profile placeholders, her device registered the day credentials exist) so the native build ships to her phone the same day the Apple account clears. The Apple Developer enrollment itself is founder-side and now the pacing item for her native-device testing.
6. Confirm offline behavior on her actual device before her first field session: airplane-mode drill on the provisioned build is part of her setup, not a later test.

## 3. Corporate-side access (the founder's correction, scoped precisely)
The test covers the corporate side as follows: Lauren exercises the HOM surfaces natively; the CORPORATE boards are demonstrated to her in review sessions from the founder's own account. If the founder wants Lauren holding corporate read access directly, that is a one-line founder grant the developer applies on request, EXCLUDING the Ruling 1 surfaces (per-HOM utilization and the friction analytics remain founder/CFO only, enforced in the permission matrix and proven by the retrieval test run against her account). Default at provisioning: no corporate role.

## 4. What Lauren tests, scripted (this is the acceptance work)
Her sessions produce the input-spine and Cockpit acceptance data the directives require, now from a real second human:
- The intake path: she reviews the imported HG record for accuracy and completeness against her own knowledge of the household.
- The visit loop, repeatedly: briefing read, arrival tap, in-visit capture (at least one Tell Well Kept per session), close-flow, departure tap; capture-cost and close-flow timings recorded per session.
- The airplane-mode drill in a real dead spot, with sync-on-reconnect verified lossless.
- Stranger mode: one gesture, verified to hide every sensitive surface, tested by someone looking over her shoulder.
- The digest: generated for HG, delivered to the FOUNDER for review (not to a member; there is no member in this test), with Lauren confirming it honestly reflects her sessions.
- Breakage hunting: she is explicitly invited to do the wrong thing: abandon a close mid-flow, double-tap arrivals, enter nonsense, lose signal mid-capture. Every recovery is the product working; every loss is a defect filed.

## 5. Consent, confidentiality, and data rules
Lauren signs the same one-page test-participation consent, adapted: the household data is her own, entered by her choice; withdraw-and-erase applies (the erase-household path must work against HG and is part of her test); confidentiality of what she sees in the product is covered under the existing advisor relationship, with the contractor/advisor paperwork already in the counsel queue noted as the durable home for it. Her sessions generate real events in the audit log; the tester flag keeps them out of every business metric. No payment surfaces, no bank details, nothing client-facing: the client freeze is untouched by this entire test.

## 6. Sequence
Nothing about the sprint's gate math changes: Phase 1 internals still complete before HG carries real identifiers or genuinely sensitive data. What changes is who holds the phone: Days 2-4 of the sprint and everything after gain a real HOM-side tester, and February's training materials inherit whatever her breakage hunting teaches. First deliverable involving her: the developer reports her account created, isolation tests green against it, and her device path chosen, in the next weekly note.
