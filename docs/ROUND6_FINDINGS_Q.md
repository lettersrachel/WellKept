---
status: frozen
---
# Round six, session Q: git history secret scan

Run 28 July 2026 at main `ed0b4fa`, before repository access is offered to
an external reviewer. 190 commits scanned, all branches, full history.
Report only; nothing was remediated because nothing needed remediation.

## Verdict

**The history is clean to share.** No secret file was ever committed, no
live credential appears in any commit's content or message, and the one
secret-shaped constant in the tree is a fenced dev-only default that
production refuses to boot on.

## What was checked, and what each check found

1. **Sensitive filenames, ever, including added-then-removed.**
   `git log --all --full-history` over `.neon-connection` and every `.env`
   path form: zero commits. A census of every filename ever added in any
   commit, filtered for neon/env/secret/credential/pem/key/token patterns:
   zero matches. `.gitignore` has covered `.env`, `.env.*`, `*.local`,
   `.neon-connection`, and `.neon-connection-pooled` (lines 5-12), and the
   working tree of a fresh clone contains none of them; those files exist
   only on the founder's machine.

2. **Connection strings and endpoints across all history content.** Every
   `postgres://`-form hit in 190 commits of patch text is either the
   committed localhost dev default (the wellkept dev credentials that are
   deliberate, published repo content) or the elided placeholder
   `postgres://...neon.tech/wellkept?sslmode=require` in setup docs, which
   carries no credentials. Zero occurrences of any real Neon endpoint
   (`@ep-...` pattern) anywhere in history.

3. **Token and key formats.** Zero matches across history for AWS
   (`AKIA...`), GitHub (`ghp_`, `github_pat_`), Resend (`re_...`), OpenAI
   (`sk-...`) formats, or private key blocks (`BEGIN ... PRIVATE KEY`).

4. **Migrations, seeds, and fixtures.** The scan covered their full
   committed content via the history sweep. The seed data is Fernbrook
   DEMO and the provision library; no connection string, key, or token
   appears in any migration, seed JSON, bindings CSV, or test fixture.

5. **Commit messages.** All 190 scanned: the only hits are prose about
   secret CUSTODY (WK_KMS_KEY belonging in the password manager; the
   ADR-003 passwordless discussion). No values.

6. **The one secret-shaped string in history**, a 46-character assignment,
   is `DEV_SECRET = "dev-only-secret-do-not-use-in-production-000000"` in
   apps/web/src/lib/auth/config.ts:101, and it is fenced: resolveSecret()
   throws at startup if production runs with AUTH_SECRET unset or equal to
   the dev value (config.ts:103-110). Published by design, unusable in
   production by construction.

## Honest bounds of the scan

Pattern-based, covering the credential classes above plus
`KEY/SECRET/TOKEN/PASSWORD`-style assignments of 32+ base64-ish
characters. It is not a full entropy scan; a dedicated scanner (gitleaks
or trufflehog) adds statistical entropy detection breadth and is cheap to
run before granting access if extra assurance is wanted. Nothing found
here suggests it would find differently.

## Standing instruction, restated

If a live credential is ever found in history, the response is rotate
first, clean history second, and both are the founder's call. Rotation
matters more because git history is permanent and clones are
uncontrollable; a credential that was ever pushed must be treated as
disclosed regardless of any later history rewrite.
