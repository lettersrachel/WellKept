#!/usr/bin/env python3
"""
wk_floor_review.py : merge the founder's floor-review workbook
(WK_Floor_Review.xlsx) into the standards store, through the tested
loader, without teaching the loader a one-time review vocabulary
(ROUND6_CLOSEOUT session R).

The workbook carries three review tabs ("Floors (300)", "Method sweep A
(41)", "Method sweep B (130)"), each with a DECISION column holding a
controlled vocabulary: keep / floor_1 / floor_2 / process / method /
preference / unsure, with blank meaning NOT YET REVIEWED (distinct from
keep). "Read me first" and "Open decisions" tabs are founder prose and
are ignored. Columns are found by header name, not position.

The three rules (verbatim from the brief):
  1. unsure never imports. It is a queue, not a decision; those rows are
     listed with their current tier and text and left untouched.
  2. Blank is not keep. Blank counts are reported per tab, and a partial
     import requires --allow-partial so it can never happen by accident.
  3. seed_reviewed flips ONLY via the separate --flip-reviewed action,
     and only at zero blanks and zero unsure across all three tabs.

Every tier change writes through packages/schema/src/load-provisions.ts
(--supersede), so provision_versions records each move the same as any
other provision edit. This script never writes the database itself.

Dry run by default: it prints the plan and writes the merged seed JSON,
but does not invoke the loader without --commit.

DATABASE_URL is taken from the environment, or read from .neon-connection
at the repo root if present. It is never printed.

Usage:
  python3 wk_floor_review.py WK_Floor_Review.xlsx                # plan only
  python3 wk_floor_review.py WK_Floor_Review.xlsx --commit       # full import
  python3 wk_floor_review.py WK_Floor_Review.xlsx --commit --allow-partial
  python3 wk_floor_review.py WK_Floor_Review.xlsx --flip-reviewed
"""

import argparse
import json
import os
import subprocess
import sys

try:
    import openpyxl
except ImportError:
    sys.exit("openpyxl is required: pip install openpyxl --break-system-packages")

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.normpath(os.path.join(HERE, "..", ".."))
DEFAULT_BASE = os.path.join(ROOT, "tooling", "seed", "provisions_seed.json")
LOADER = os.path.join(ROOT, "packages", "schema", "src", "load-provisions.ts")

TIERS = {"floor_1", "floor_2", "process", "method", "preference"}
DECISIONS = TIERS | {"keep", "unsure"}
REVIEW_TABS = ("Floors (300)", "Method sweep A (41)", "Method sweep B (130)")
IGNORED_TABS = ("Read me first", "Open decisions")


def find_columns(ws):
    """Locate provision_id and DECISION by header name (row 1), any case."""
    cols = {}
    for c in range(1, ws.max_column + 1):
        h = str(ws.cell(1, c).value or "").strip().lower()
        if h in ("provision_id", "provision id"):
            cols["id"] = c
        elif h == "decision":
            cols["decision"] = c
    missing = [k for k in ("id", "decision") if k not in cols]
    if missing:
        sys.exit(f"FAIL: tab '{ws.title}' is missing header(s): "
                 f"{', '.join('provision_id' if m == 'id' else 'DECISION' for m in missing)}")
    return cols


def read_workbook(path):
    wb = openpyxl.load_workbook(path, data_only=True)
    present = [t for t in REVIEW_TABS if t in wb.sheetnames]
    if len(present) != len(REVIEW_TABS):
        absent = [t for t in REVIEW_TABS if t not in wb.sheetnames]
        sys.exit(f"FAIL: workbook is missing review tab(s): {', '.join(absent)}. "
                 f"Found: {', '.join(wb.sheetnames)}")
    decisions, errors = {}, []
    per_tab = {}
    for tab in REVIEW_TABS:
        ws = wb[tab]
        cols = find_columns(ws)
        stats = {"rows": 0, "keep": 0, "change": 0, "unsure": 0, "blank": 0}
        for r in range(2, ws.max_row + 1):
            pid = ws.cell(r, cols["id"]).value
            if not pid:
                continue
            pid = str(pid).strip()
            stats["rows"] += 1
            raw = str(ws.cell(r, cols["decision"]).value or "").strip().lower()
            if pid in decisions:
                errors.append(f"{tab} row {r}: {pid} appears in more than one tab")
                continue
            if raw == "":
                decisions[pid] = ("blank", tab)
                stats["blank"] += 1
            elif raw not in DECISIONS:
                errors.append(f"{tab} row {r}: {pid}: DECISION {raw!r} is not in the "
                              f"vocabulary {sorted(DECISIONS)} and is not blank")
            elif raw == "unsure":
                decisions[pid] = ("unsure", tab)
                stats["unsure"] += 1
            elif raw == "keep":
                decisions[pid] = ("keep", tab)
                stats["keep"] += 1
            else:
                decisions[pid] = (raw, tab)
                stats["change"] += 1
        per_tab[tab] = stats
    return decisions, per_tab, errors


def fetch_store_tiers(env):
    """Current tier per provision from the store, so undecided rows ride
    through EXACTLY as stored (rule 1: unsure stays as it is in the store,
    and rows outside the review make no claim). Read-only. Returns None when
    no connection is available (dry-run fallback: base tiers, with a caveat)."""
    if not env.get("DATABASE_URL"):
        return None
    js = ("import pg from 'pg';"
          "const c = new pg.Client(process.env.DATABASE_URL); await c.connect();"
          "const r = await c.query('SELECT id, tier FROM standard_provision');"
          "console.log(JSON.stringify(r.rows)); await c.end();")
    res = subprocess.run(["node", "--input-type=module", "-e", js], env=env,
                         cwd=os.path.dirname(LOADER), capture_output=True, text=True)
    if res.returncode != 0:
        sys.exit(f"FAIL: could not read current store tiers (read-only query failed): {res.stderr.strip()[:200]}")
    return {row["id"]: row["tier"] for row in json.loads(res.stdout)}


def main():
    ap = argparse.ArgumentParser(description="Floor-review workbook -> loader, with the three rules enforced")
    ap.add_argument("workbook")
    ap.add_argument("--base", default=DEFAULT_BASE)
    ap.add_argument("--out", default=os.path.join(HERE, "floor_review_merged_seed.json"),
                    help="Where the merged full seed JSON is written")
    ap.add_argument("--commit", action="store_true",
                    help="Run the loader (--supersede) after writing the merged seed. Default is dry run.")
    ap.add_argument("--allow-partial", action="store_true",
                    help="Proceed even though blank (unreviewed) rows remain. Never the default.")
    ap.add_argument("--flip-reviewed", action="store_true",
                    help="The separate explicit action: verify zero blank and zero unsure across all "
                         "three tabs, then run the loader with --reviewed. Refuses otherwise.")
    args = ap.parse_args()

    with open(args.base) as f:
        base_rows = json.load(f)
    base_by_id = {r["provision_id"]: r for r in base_rows}

    decisions, per_tab, errors = read_workbook(args.workbook)
    unknown = [pid for pid in decisions if pid not in base_by_id]
    errors.extend(f"{pid}: not in the base seed" for pid in unknown)
    if errors:
        print(f"FAIL: {len(errors)} workbook problems; nothing written.")
        for e in errors[:20]:
            print(f"    ! {e}")
        sys.exit(2)

    changes, keeps, unsure_rows = [], [], []
    blanks = 0
    for pid, (decision, tab) in decisions.items():
        base = base_by_id[pid]
        if decision == "blank":
            blanks += 1
        elif decision == "unsure":
            unsure_rows.append({"provision_id": pid, "tier": base["tier"],
                                "text": base["text"][:100], "tab": tab})
        elif decision == "keep":
            keeps.append(pid)
        elif decision != base["tier"]:
            changes.append({"provision_id": pid, "from": base["tier"], "to": decision, "tab": tab})
        else:
            keeps.append(pid)  # decided tier equals current tier: confirmed, no move

    # The plan, always printed.
    print(f"Plan for {os.path.basename(args.workbook)} against {len(base_rows)} base provisions:")
    for tab, s in per_tab.items():
        print(f"  {tab}: {s['rows']} rows; {s['change']} tier decisions, {s['keep']} keep, "
              f"{s['unsure']} unsure, {s['blank']} blank")
    print(f"  TOTAL: {len(changes)} tier changes, {len(keeps)} confirmed unchanged, "
          f"{len(unsure_rows)} unsure (never imported), {blanks} blank (not yet reviewed)")
    for c in changes[:30]:
        print(f"    {c['provision_id']}: {c['from']} -> {c['to']}")
    if len(changes) > 30:
        print(f"    ... and {len(changes) - 30} more")
    if unsure_rows:
        print("  Unsure queue (stays exactly as stored):")
        for u in unsure_rows[:20]:
            print(f"    {u['provision_id']} [{u['tier']}] {u['text']}")

    # NOTE (session R report): there is no per-provision place to stamp who
    # reviewed a row and when. A keep produces no write, so at the end of the
    # review the only durable evidence is the store-level seed_reviewed
    # boolean. Adding one is its own reviewed change; see WORK_QUEUE.

    if args.flip_reviewed:
        if blanks or unsure_rows:
            print(f"REFUSED: seed_reviewed flips only at zero blanks and zero unsure across all "
                  f"three tabs; found {blanks} blank, {len(unsure_rows)} unsure. The flag is a "
                  f"one-way door and turns once, when the review is complete.")
            sys.exit(2)
    elif blanks and not args.allow_partial:
        print(f"REFUSED: {blanks} rows are blank (not yet reviewed; blank is not keep). A partial "
              f"import must be explicit: re-run with --allow-partial, or finish the tabs.")
        sys.exit(2)

    # Merge over the FULL base seed so the loader's completeness check holds.
    # Only rows with an explicit tier decision take the workbook's value;
    # everything else (blank, unsure, outside the review) carries the STORE's
    # current tier, so an import can never silently revert a row the review
    # made no decision about. keep confirms the sheet's (base) tier.
    env = dict(os.environ)
    if not env.get("DATABASE_URL"):
        neon = os.path.join(ROOT, ".neon-connection")
        if os.path.exists(neon):
            with open(neon) as f:
                env["DATABASE_URL"] = f.read().strip()
            print("DATABASE_URL read from .neon-connection (by name; not printed).")
    stored = fetch_store_tiers(env)
    if stored is None:
        if args.commit or args.flip_reviewed:
            sys.exit("FAIL: DATABASE_URL is not set and .neon-connection does not exist. "
                     "Set the variable or run from the machine that has the file.")
        print("CAVEAT (dry run, no connection): undecided rows shown with base-seed tiers; "
              "the commit run reads the store's current tiers instead.")
        stored = {}
    to_tier = {c["provision_id"]: c["to"] for c in changes}
    keep_set = set(keeps)
    drifted_keeps = [pid for pid in keeps
                     if pid in stored and stored[pid] != base_by_id[pid]["tier"]]
    if drifted_keeps:
        print(f"CAVEAT: {len(drifted_keeps)} keep row(s) confirm the sheet's tier but the store "
              f"currently differs (edited since the sheet was made); keep re-asserts the sheet: "
              f"{', '.join(drifted_keeps[:10])}")
    merged = []
    for r in base_rows:
        pid = r["provision_id"]
        if pid in to_tier:
            merged.append({**r, "tier": to_tier[pid]})
        elif pid in keep_set:
            merged.append(dict(r))
        else:
            merged.append({**r, "tier": stored.get(pid, r["tier"])})
    with open(args.out, "w") as f:
        json.dump(merged, f, indent=1)
    print(f"Merged seed written: {args.out}")

    loader_args = ["node", "--experimental-strip-types", LOADER, args.out, "--supersede"]
    if args.flip_reviewed:
        loader_args.append("--reviewed")

    if not (args.commit or args.flip_reviewed):
        print("DRY RUN (default): the loader was not invoked. To apply:")
        print(f"  {' '.join(loader_args)}")
        return

    print(f"Invoking the loader ({'with --reviewed' if args.flip_reviewed else 'tier changes only'})...")
    res = subprocess.run(loader_args, env=env, cwd=os.path.dirname(LOADER))
    sys.exit(res.returncode)


if __name__ == "__main__":
    main()
