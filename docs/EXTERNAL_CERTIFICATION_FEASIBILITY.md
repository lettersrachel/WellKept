---
status: living
---
# Can the training layer certify someone who does not work for us?

**Asked 5 September 2026, ahead of Q-16, and explicitly NOT a build
request.** The question is whether today's architecture forecloses it,
because the answer decides whether training lives inside the staff
application or beside it.

**The short answer: it is foreclosed in ONE place, and that place is
load-bearing rather than incidental. Everything else is open, and one
of the four pieces is already built.**

---

## The one wall, and it is a real one

**Staff identity is DERIVED FROM A HOUSEHOLD ASSIGNMENT. There is no
other way to be staff.**

`apps/web/src/lib/session.ts:91-101`, `getStaffIdentity`: it reads
`household_role_assignment` for the signed-in user, keeps the rows whose
role is a staff write role, and **returns null when that set is empty**.
`getPrincipal` is the same shape one household at a time. So a person
with a real account and no household assignment is, to every gate in the
system, a signed-in nobody.

**That is deliberate and good.** The comment on
`household_role_assignment` says the role "ALWAYS comes from this
server-side table" and that "there is no 'sees every household'
wildcard". It is the reason tenant isolation holds without per-endpoint
discipline, and it is the first thing WK-SEC-001 test area 1 attacks.

**So the wall is not "we forgot about external users". It is that
BELONGING TO A HOUSEHOLD is how this system knows who anyone is.** An
external trainee belongs to no household by definition. Give them one to
make the identity work and you have either invented a fake household or
attached a stranger to a real one, and both are worse than the problem.

## The other three pieces, honestly rated

**Enrollment without a staff account: OPEN, and cheap.** `auth_user` is
`id, name, email, email_verified, image, is_tester` and carries no role
of its own. A person can already exist in the system without being
anything. What does not exist is any surface that lets them do so
deliberately: `db:grant` refuses to create people, and the one time a
non-app account was needed it went in as an unaudited direct insert
(recorded at the Field Test Home grant). **There is no audited
identity-creation path at all today**, for employees either, which is a
gap this question surfaces rather than creates.

**An identity that is not an employee: THE WALL ABOVE.** This is the
same question as G-111 met a fourth time. G-111 asked where
person-scoped and company-scoped facts live when everything is
household-scoped; a trainee's certification record is person-scoped
about someone who is not even staff, which is one step further out than
any of G-111's three instances. **The shape chosen for G-111 is the
shape this gets**, which is an argument for deciding G-111 deliberately
rather than meeting it a fifth time under time pressure.

**Payment: OUT OF BOUNDS, by ADR-004 rather than by architecture.** The
app "displays but never originates" billing; it does not compute a
paycheck or issue an invoice. Charging an external trainee is
originating a transaction. That is not a technical obstacle, it is a
boundary that would have to be amended or routed around (a payment
processor outside the app, with the app holding only an enrollment
fact). **Worth knowing it is a boundary question and not an
engineering one**, because those get answered differently.

**A scenario bank that runs without a real household: ALREADY BUILT.**
`pnpm db:training` seeds the synthetic Trainor household, `is_fixture`
flagged, with three training identities including the backup_hm stranger
case, and **re-running RESETS the board for the next trainee**, proven
by mutating every scenario and re-seeding. The intake FIXTURES plan
extends this with the thirty-scenario Synthetic Training Household built
on F-2. So the piece that sounds hardest is the piece that exists.

---

## What this means for the inside-or-beside decision

**Inside the staff application, as it stands, means giving a
non-employee a household assignment.** That is the only way the app
grants anyone an identity, and doing it would put a stranger inside the
mechanism that tenant isolation rests on. Not "hard": wrong.

**Three shapes make inside possible, and they are different sizes.**

1. **A non-household staff role**, so `getStaffIdentity` can resolve
   from something other than an assignment. This touches the one
   function every gate in the system funnels through, and is precisely
   what WK-SEC-001 test area 3 will attack. It is the largest of the
   three and the one that changes the security story.
2. **A training identity that is NOT a staff identity**: a separate
   resolution that grants access to the scenario bank and to nothing
   else, sharing `auth_user` and touching neither
   `household_role_assignment` nor `getStaffIdentity`. Smaller, and it
   answers G-111's question for this instance without answering it for
   the other three.
3. **Beside the application entirely**: training as its own surface with
   its own identity, consuming the scenario bank as data. The scenario
   bank is already a seeded fixture household, so this is more
   available than it sounds.

**Not recommending one.** The choice is a product decision about whether
certification is a Well Kept credential granted to the industry or an
internal capability, and that is not visible from the schema.

**What IS visible from the schema, and is the useful half:** nothing
built so far forecloses any of the three, and the two that matter most
(the scenario bank, and `auth_user` being role-free) point toward it
being cheaper than expected. **The single thing that would foreclose it
is building the credential in a way that assumes a household**, which is
why this was asked before Q-16 rather than after.
