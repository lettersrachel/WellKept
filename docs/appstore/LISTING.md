---
status: living
---
# App Store listing kit — Well Kept HM
Prepared 25 July 2026. Everything App Store Connect asks for, drafted.
Prereq: Apple Developer Program enrollment (developer.apple.com/programs, $99/yr).
Build + submit run through EAS (eas.json is configured; `eas build --platform ios
--profile production` then `eas submit`), which handles certificates itself.

## Identity
- App name: **Well Kept HM**
- Subtitle (30 chars max): **The house manager field tool**
- Bundle ID: com.wellkept.hm (already in app.json)
- SKU: wellkept-hm-001
- Category: Business (secondary: Productivity)
- Age rating: 4+ (no objectionable content; questionnaire all "No")

## Promotional text (170 chars max)
Your pre-visit briefing, the close-of-visit flow, photos, and alerts — one
field tool that keeps working when the signal drops.

## Description
Well Kept HM is the field companion for Well Kept house managers.

Before you arrive: a briefing from the household's living record — safety
flags first, what changed since the last visit, today's reminders, and the
standards behind each field.

During the visit: capture photos, note what you hear, and work the visit
your way. No signal in the basement? Everything keeps working; the record
syncs when you reconnect.

Closing out: a guided close-of-visit flow that will not let required steps
slip — hours, photos, the three-sentence report — and routes anything that
needs attention to the right person the same day.

Sign-in is by email code plus an authenticator app. There are no passwords.

Well Kept HM is for Well Kept staff; a Well Kept account is required.

## Keywords (100 chars max)
house manager,household,estate,visit,checklist,offline,field service,home care,housekeeping

## URLs
- Support: https://wellkept-orcin.vercel.app/support
- Privacy policy: https://wellkept-orcin.vercel.app/privacy
- Marketing (optional): leave blank for TestFlight

## App privacy questionnaire (match /privacy)
Data collected, linked to identity, not used for tracking:
- Contact info: email address (account)
- User content: photos (visit records), other user content (visit notes)
- Identifiers: user ID (account)
- Usage data: none. Diagnostics: crash data (Sentry, no PII). No ads, no
  tracking, no data sold. Encryption: standard HTTPS + encrypted-at-rest
  secured items (exempt encryption declaration: uses standard iOS crypto —
  answer "Yes, standard encryption" and "exempt").

## Review notes (paste into App Store Connect)
Well Kept HM is an internal field tool for a household-operations service;
accounts are provisioned by the company (no self-signup, by design — see
support page). Demo account for review:
  1. On the sign-in screen enter: review-demo@wellkepthomeops.com
  2. The emailed code is delivered to that inbox; reviewer flow: we will
     provide the current emailed code + authenticator code via the review
     notes contact, or on request enable the review account with the
     TOTP secret printed here: (FILL AT SUBMISSION — enroll the demo
     account, paste its otpauth secret so the reviewer can add it to any
     authenticator app).
  3. Choose "Fernbrook Demo" and explore: briefing, intake mode, photos,
     close-of-visit flow.
The app requires a network for sign-in; offline behavior can be tested by
enabling airplane mode after the briefing loads.

## TestFlight (before any public submission)
- Internal testers: Rachel + pilot HM (App Store Connect users, instant).
- Beta App Review only needed for external testers.
- Test notes draft: "Sign in with your work email; you'll get a code by
  email and use your authenticator as usual. Everything you do lands on
  the demo household unless you were assigned a real one."

## Remaining sequence once Apple enrollment exists
1. `npm i -g eas-cli && eas login` (Rachel's Expo account; free tier fine)
2. `cd apps/hm-mobile && eas build --platform ios --profile production`
3. `eas submit --platform ios` (uploads to App Store Connect)
4. App Store Connect: paste this kit, add screenshots (6.7" + 5.5" sets —
   generate from TestFlight build or a simulator once Xcode is available),
   pre-enroll the review demo account, submit to TestFlight first.
