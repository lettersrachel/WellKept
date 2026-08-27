/**
 * The seeded households the tooling addresses by identity, in ONE place.
 *
 * G-71. Five sites resolved a household by DISPLAY NAME. Two of them
 * (`apps/web/scripts/ensure-smoke-fixture.mjs` and
 * `tooling/e2e/partb-rehearsal.spec.ts`) hard-coded the same string
 * independently, so they agreed because two people typed the same thing,
 * which is a coincidence wearing the costume of a shared constant. A
 * third (`tooling/e2e/floor-bypass.spec.ts`) matched `ILIKE
 * '%fernbrook%'`, which would find a real member household named
 * Fernbrook the day one exists.
 *
 * R17 (founder ruling, 2026-08-27) permits shared household names: two
 * member families named Chen is ordinary, and a uniqueness constraint
 * would eventually force a member to accept a name that is not theirs.
 * So the answer is not to constrain the data. It is to stop identifying
 * a household by the thing a member is entitled to choose.
 *
 * This file is the single place. A constant copied into five files would
 * reproduce the defect with better syntax; imported from here, a change
 * lands everywhere or nowhere.
 *
 * ---------------------------------------------------------------------
 * WHERE THESE VALUES CAME FROM, because the digits carry no meaning.
 *
 * `training-household.ts:61` pins `01997700-0000-7000-8000-000000000001`,
 * a DELIBERATELY STRUCTURED id: a v7-shaped prefix and a counted suffix,
 * minted by the author so the seed creates-or-finds by primary key. The
 * two ids below are NOT that. They are RANDOM uuids that already existed,
 * READ FROM PRODUCTION AND PINNED rather than minted. Do not infer a
 * convention from them, do not expect the counted suffix to continue,
 * and do not assume a third fixture would follow their shape.
 *
 * THE TRADEOFF, stated rather than assumed, the same one `deploy.sh`
 * takes for `EXPECTED_PROJECT_ID`: pinning an existing id is exact,
 * offline and unambiguous, and it must be RE-PINNED BY HAND if the row
 * is ever recreated. That is the accepted cost of not resolving by a
 * mutable display name.
 * ---------------------------------------------------------------------
 */

/**
 * The Smoke Test Fixture, production.
 *
 * ENVIRONMENT-SPECIFIC BY HISTORY, which is the one wrinkle in this file.
 * `ensure-smoke-fixture.mjs` created its household with `randomUUID()`,
 * so every database that ran it before this pin has a DIFFERENT id for
 * the same fixture. This value is production's. A fresh database creates
 * the row at this id and converges; a database that already holds a
 * differently-numbered "Smoke Test Fixture" will make the script REFUSE
 * rather than quietly create a second one, and the refusal says what to
 * do about it.
 */
export const SMOKE_TEST_FIXTURE_ID = "8a4b9786-9698-4200-95b9-91abec7a40ef";

/**
 * Fernbrook Demo.
 *
 * Unlike the fixture, this id was ALREADY deterministic: it is carried in
 * `tooling/seed/fernbrook_template_seed.json` and applied by
 * `load-seed.ts`, so every environment that seeds Fernbrook gets the same
 * row. Pinning it here surfaces an existing constant rather than
 * introducing one, and it was confirmed identical in the seed file and in
 * a local database independently of the production URL it was read from.
 */
export const FERNBROOK_DEMO_ID = "7ed45b9b-aec3-4393-b0a9-19de059a3645";

/**
 * Display names. These are for CREATING a household and for messages a
 * person reads. **Never resolve a household by these.** That is the whole
 * of G-71, and R17 makes the ambiguity permitted rather than merely
 * possible.
 */
export const SMOKE_TEST_FIXTURE_NAME = "Smoke Test Fixture";
export const FERNBROOK_DEMO_NAME = "Fernbrook Demo";
