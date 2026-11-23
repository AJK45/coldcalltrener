# Tréner Hovorov

Private Slovak sales-practice application built with React, TypeScript, Vite, Tailwind, shadcn/ui and Supabase.

## Current delivery

The application now uses **private email/password authentication and a synchronized Supabase PostgreSQL workspace**, replacing the original browser-only workspace. This is not the entire original production specification. Paid cloud AI and a complete remote voice service remain disabled/unimplemented.

Implemented application features include business/product management, scenario setup and presets, the existing Ollama conversation connector, consented browser speech, microphone testing, transcript-based evidence-checked reports, history, analytics, coaching plans and JSON/CSV exports. Analytics contain no seeded calls or fabricated performance data.

### Private access

- `/prihlasenie`: email/password sign-in; no public sign-up UI.
- `/auth/callback`: public authentication return route.
- `/reset-password`: public recovery-session handling and password update.
- All training routes require both a valid session and approval in `public.private_owner`.
- No profile table is needed: this single-user setup stores no additional names, avatars or roles.
- `private_owner` permits at most one approved user, enforced by a unique singleton constraint. Users cannot approve themselves.
- `training_workspace` is readable only by its approved owner. Clients have no direct INSERT/UPDATE/DELETE grants.
- `save_training_workspace` verifies the authenticated caller, checks owner approval and atomically compares the expected revision before writing. Anonymous invocation is denied. A stale revision produces a conflict instead of an unconditional overwrite.
- Supabase Data API grants and RLS are separate protection layers. Both are required and configured; database changes were applied through the connected database tooling, not manually authored migration files.

## Activate your private account

An administrator must complete these steps in the connected Supabase dashboard. No account or password is automatically fabricated.

1. Open **Authentication → Users → Add user → Create new user**. Use your own email and a strong unique password. For an administrator-created account, confirm the email using the available dashboard option, or complete the intended email-confirmation flow.
2. Copy the new user's UUID from its Authentication user record.
3. Open **Table Editor → private_owner** and insert one row with `user_id` equal to that UUID. Leave `singleton` as `true`. Only a trusted administrator may do this. Never grant clients write access to this table.
4. In **Authentication → Sign In / Providers** (the precise section name can vary), disable **Allow new users to sign up**. Hiding registration in the application is not the same as disabling the public Auth sign-up API. Database owner checks still deny unapproved users even if the Auth sign-up API remains enabled.
5. Open the app and sign in. No paid provider account is required for signing in, adding businesses or synchronizing training data.

Never share the password, service-role key or other secrets in chat. If administrative approval is done through this assistant instead, supply only the created user's email or UUID and explicitly request approval.

## Hosting and phone access

**GitHub Pages:** follow [GITHUB_PAGES.md](GITHUB_PAGES.md). The included Actions workflow builds and deploys with the correct repository base, direct-route fallback and authentication return URLs. No Vercel or Cloudflare token is needed.

The source is ready to be hosted as a Vite SPA, but code verification is **not** proof that a public deployment exists. For a different static host:

1. Connect the repository to an HTTPS-capable static host, for example Vercel. Use its Vite preset, the package's production build task and output directory `dist`.
2. Preserve SPA routing to `index.html` for direct links including `/prihlasenie`, `/auth/callback` and `/reset-password`. The repository's `vercel.json` contains the SPA rewrite.
3. Under **Supabase Authentication → URL Configuration → Redirect URLs**, allow the actual published URLs ending in `/auth/callback` and `/reset-password`. Allow the current preview's equivalent URLs when testing there. Do not solve redirects by replacing Site URL with localhost.
4. Authentication requests build absolute redirect URLs from the current application origin. For custom email templates, use the supplied `RedirectTo` rather than a fixed origin. Configure a reliable email sender before relying on production recovery mail; delivery and provider rate limits must be tested separately.
5. Open the same published HTTPS address on the phone and computer, sign into the approved account and wait for **Synchronizované** before switching devices.
6. On a trusted device, test sign-in, recovery, sign-out and direct page refresh. Test that an unapproved account cannot access the workspace.

No deployment was created merely by implementing these files. Provider deployment configuration, a custom domain and production redirect allowlisting still require the actual chosen host/origin.

### Voice and AI are separate from hosting

Online storage does not make a Windows Ollama server reachable from a phone. `localhost` on a phone means the phone. Do not expose Ollama publicly. The existing connector intentionally accepts only loopback/private-network origins and may be blocked by HTTPS/HTTP, CORS or browser local-network restrictions.

A complete phone-ready AI call service requires a future server-side cloud inference connector and a verified Slovak speech pipeline. No API keys are accepted in the browser, no paid inference service is configured and no automatic paid processing is enabled. Browser speech remains an optional, explicit, per-device choice: speech recognition or synthesis can send audio to the browser/system provider. A Slovak language tag is not independent verification of voice quality.

## Synchronization, imports and data safety

- Businesses, products, calls, transcripts, reports and the current coaching plan are synchronized after local changes. Pending changes are first saved to an account-specific browser draft.
- Saves are batched, with a nominal two-second delay; clean devices check for remote changes approximately every 15 seconds and on focus/network events. This is polling, not a full realtime database subscription.
- Device-only settings—including Ollama origin/model, speech consent, selected voice, theme and weekly goal—are not uploaded.
- Original `trener-hovorov-v1` browser records are not automatically uploaded or deleted. Import them explicitly under **Nastavenia → Súkromný online účet**. The original origin/profile must be opened to find those records, or export JSON there and select that file on the new site.
- JSON import validates records and requires explicit confirmation before adding them to the online draft. Existing IDs win; importing is not a destructive restore and does not overwrite an online copy of a record with the same ID.
- Conflicts stop editing and automatic uploads. Export the device draft before choosing the online version. Review conflicting records separately; an exported older record with the same ID will not replace the newer online record through additive import.
- A network failure leaves the draft in the browser. Initial offline loading requires retrying the server; this is not a full offline-first/PWA application.
- Wait for server confirmation before closing the app. Mobile browsers can terminate tabs without delivering unload events; the local draft is the fallback, not a promise that an unsent edit is already on the other device.
- Two actively editing devices can conflict at workspace level, even when editing different records. Use one active training device at a time. This implementation deliberately favors conflict detection over silent last-write-wins data loss.
- Drafts are not encrypted in browser storage. Sign-out removes a verified clean draft; an unacknowledged draft is retained with a warning. Use a trusted browser profile. Clearing site data removes drafts and device preferences, not confirmed server records.
- Deleting training data through Settings queues deletion of the live workspace content on all devices. This does not erase previous downloads, browser drafts on other devices or infrastructure backups under Supabase's retention policies.
- Hosted database and authentication usage can incur provider charges or plan limits. No application session quota or subscription billing is implemented.

## Scoring and model limitations

Rubric `sk-text-v1` assesses text evidence in 15 categories. Null categories are excluded from the overall rounded arithmetic mean. Every scored category must contain a literal citation from a saved turn. This proves citation existence, not the correctness of AI interpretation. Voice confidence, tone, interruption frequency, silence and talk/listen ratio are unavailable without reliable audio analysis.

The optional adjusted analytic is explicitly experimental: `clamp(raw + 2 * (difficulty - 5), 0, 100)`. It is a documented heuristic, not empirical calibration. Simulated customer outcomes are not real conversion results. Model quality and latency on the target 14 GB RAM / 4 GB GPU computer remain unverified.

The dashboard currently requests fonts from Google Fonts and a photo from Unsplash. These receive ordinary web-request metadata, not transcripts; assets would need local bundling for a fully offline site.

## Tests

The package test task runs Vitest with `src/vitest.config.ts`; production builds run the tests first. Tests cover scoring, schemas, local persistence, explicit import behavior, JSONB key ordering, per-account draft isolation, stale revisions, malformed responses, network retry, mounted synchronization state and auth/owner/recovery routing.

Auth, component and workspace API tests use isolated mocks. They do not prove successful real-account login, recovery email delivery, synchronization across two physical devices or microphone/model operation. Separate database checks inspect grants and test denial of unapproved access without creating production test accounts or fake training records.

## Remaining work

- Publish to the selected HTTPS host, configure actual production callback URLs and activate the approved account.
- Exercise real login, email recovery and two-device synchronization; keep a backup before importing valuable records.
- Add cloud inference only after explicit provider/data-processing consent and transparent costs, with server-side secrets and authorization.
- Verified Slovak STT/TTS, streaming/full-duplex audio, recordings/replay and audio-derived metrics.
- Advanced persona editors, document/URL ingestion, fully structured outcome flags, detailed objection analysis, automatic spaced repetition and remaining advanced analytics.
- The original Windows-local SQLite/server architecture is not included in this approved online PostgreSQL direction.

Do not describe the entire original application scope, phone voice flow or production deployment as complete on the basis of compilation and mocked tests alone.
