---
status: living
---

# WITHDRAWN: "production credentials in a second Vercel project," 26-27 August 2026

**This incident did not happen. The premise was false and the premise was
mine.** The document is kept rather than deleted, with its original text
recoverable from git history, because how it came to be written is the
only useful thing in it.

---

## What the evidence actually shows

Two screenshots, 26 August, read directly from the Vercel dashboard:

**`vercel.com/well-kept/well-kept-web/settings/environment-variables`
reads "No Environment Variables Added."** The stray project holds
**zero** environment variables. No `DATABASE_URL`, no `WK_KMS_KEY`, no
`AUTH_SECRET`, nothing at all.

**`vercel.com/well-kept/wellkept/settings/environment-variables` holds
the production set**, all scoped Production, added 18-19 July: the VAPID
trio, `SENTRY_DSN`, `AUTH_EMAIL_FROM`, `RESEND_API_KEY`, `AUTH_SECRET`,
`REDIS_URL`, `DATABASE_URL`, and more above the visible scroll. That is
the production project and that is exactly where those values belong.

**Corroborated from the repository, which settles which project is
which without a dashboard:** `tooling/deploy.sh:27` reads
`EXPECTED_PROJECT="wellkept"` and `:34` pins
`EXPECTED_PROJECT_ID="prj_15Q69KLCnnRMQQZp8Ou4tORuZBQq"`. The project
named `wellkept` IS production. `well-kept-web` (`prj_p3iZ...`) is the
stray, and it is empty.

**So G-35's answer is NO**, which is the branch its own chore line
anticipated: "if no, it is noise."

---

## How the false premise was built, which is the part worth keeping

The author asked the founder a question that named the project:
"for each of the three variables **in `well-kept-web`**, which
environment boxes are checked?" The founder replied "2 all say
production," reading the `wellkept` project. Both were right about what
they saw. The author then wrote an incident document, a register
correction, and a rotation plan on the assumption that the reply
described the project the question had named.

**The author had already asked the identification question and had not
received a direct answer, and proceeded anyway.** That is the failure.
Not the misreading, which is ordinary; the proceeding without the
answer, having noticed it was missing.

This is the third time in two days that a premise from a terse report
was carried into a written record here, after branch protection (G-73)
and after the "dormant" project (G-74). The first two were the
register's. This one is the author's, in a document written to warn
about exactly that.

**The rule that would have caught it:** a question whose answer changes
what gets written is a blocking question. The author treated it as one
in the sentence "delete nothing until this is answered," and then did
not treat it as one when writing the record.

---

## What survives, verified, and is NOT withdrawn

1. **The stray project built on every push, and is now DELETED.** Eight
   deployments across 26-27 August, each with a public preview URL, the
   last several AFTER its Git integration was reported disconnected,
   which is why disconnecting was not enough. The founder deleted the
   project on 26 August after confirming it carried no custom domain
   (only the auto-generated `well-kept-web.vercel.app`) and no
   environment variables. The Vercel team now lists ONE project,
   `wellkept` at `wellkept-orcin.vercel.app`. Why the disconnect did not
   hold is no longer answerable and no longer matters; deletion closed
   it.
2. **Both projects sit in one Vercel team**, `team_XaVg0eFgp7o1vcakrmKMO5CX`.
3. **The repository's GitHub `homepage` field is wrong.** It reads
   `https://well-kept-web.vercel.app`, pointing at the empty stray.
   Production is `PROD_HOST="https://wellkept-orcin.vercel.app"`
   (`deploy.sh:35`). A one-line fix in repo settings.
4. **`deploy.sh` cannot land on the stray**, by the pinned-id checks at
   lines 268 and 278.

## What is withdrawn entirely

The exposure, the blast-radius question, the rotation sequence, and the
`WK_KMS_KEY` re-wrap warning. There is nothing to rotate. No credential
was ever in the stray project, so none was ever exposed by it.
