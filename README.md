# Tréner Hovorov

Slovak private sales-practice client built with React, TypeScript, Vite, Tailwind and shadcn/ui. This delivery is a browser-local implementation, **not the complete production/server architecture requested in the original specification**.

## Implemented

- Slovak UI, dark default and optional light theme, responsive sidebar and all primary navigation destinations.
- Business and product CRUD, confirmed business facts, customer-known product facts, separate internal product information.
- 16 lead intents, 19 dynamic scenario presets, independent difficulty/rudeness controls.
- Actual Ollama model discovery and structured persona generation, customer turns and separate evaluation requests. No scripted replacement replies or fabricated metrics.
- Customer simulator does not receive scoring rubrics, reports or private product fields. Scenario persona is hidden from the live UI except for public background.
- Persisted text turns, elapsed call duration, manual pause/resume, interrupted-session continuation, explicit retry on provider errors.
- Optional browser speech recognition with sk-SK requested, and synthesis limited to system voices declaring a Slovak language tag. Explicit consent is required. Browser speech services may send audio externally.
- Real microphone permission and level test using local Web Audio processing, without recording or uploading test audio.
- Fifteen-category model evaluation with versioned rubric, model identifier, literal transcript-evidence validation, nullable unavailable categories, actionable practice links.
- Call reports and timestamped transcripts; history search/filter/sort/compare/delete; JSON and CSV exports.
- Analytics generated only from persisted calls, sample-size warnings, difficulty filter, raw scores and separately labelled experimental adjustment.
- Coaching skill profile calculated from actual reports, optional Ollama-generated persistent weekly plan.
- Unit tests and persistence/provider integration tests. These do not certify real microphone, browser speech, model quality or mobile HTTPS operation.

## First use on Windows in the Dyad preview

1. Open **Moje podnikanie**, add confirmed business information and save it. Add a product under **Produkty a ponuky** if needed. Unknown prices and guarantees should remain empty.
2. Install Ollama for Windows from its official website. Add a locally runnable model with structured JSON output support using your preferred Ollama model-management interface. No particular model has been verified on the user's hardware.
3. Allow only the exact application origin in the Windows `OLLAMA_ORIGINS` environment variable and reopen Ollama so its process receives the updated environment. Avoid wildcard origins. The application deliberately has no public generic proxy.
4. In **Nastavenia**, enter the private Ollama origin, use **Overiť pripojenie a načítať modely**, select a model and save. Browser CORS, mixed-content and private-network restrictions can block the connection; a successful network connection does not verify Slovak language quality.
5. Use **Otestovať mikrofón**. If speech services are acceptable, explicitly enable them, choose an available Slovak-labelled voice, listen to the sample and save settings. If no Slovak voice is exposed by the browser, voice mode is unavailable; the app will not substitute an unrelated language silently.
6. Create a scenario under **Nový hovor**. In the live screen, enable voice and press the microphone or play the customer's opening. Voice turns use browser STT, Ollama, then browser TTS. Manual microphone activation can interrupt synthesized speech. This is not streaming full-duplex audio or automatic barge-in.
7. End the call, generate the report, then review history, analytics and coaching. If evaluation fails literal-evidence validation, retry; the transcript stays saved.
8. Export backups regularly. Browser storage is not an archival database and is removed when site data is cleared.

## Hardware and cost

The target computer has roughly 14 GB RAM, 4 GB graphics memory and a weak CPU. Low latency is not promised. Small quantized models may fit but need actual Slovak-quality testing. Model requests have a three-minute timeout and errors remain visible. Ollama inference has no per-token API fee; electricity, hardware and model licenses still apply. No software session quota or billing is implemented. Browser storage and hardware capacity are finite.

## Privacy and deployment boundaries

Training data is currently serialized into this origin's `localStorage`. It is **not SQLite**, not encrypted at rest, not automatically synchronized between devices and not protected by an application login. Do not publish this version as an authenticated private service. Local browser extensions or scripts with same-origin access can read local data. Use a trusted device and browser profile.

The Supabase client is initialized for the completed integration but is not used to upload training data. No public database tables or permissive RLS policies were created. No API secrets are accepted or stored in the browser. External cloud inference connectors are not implemented.

From a phone, `localhost` refers to the phone, not the Windows host. Microphone access requires a secure context such as trusted HTTPS. An HTTPS preview may not be able to call an HTTP Ollama endpoint directly. A complete private-network deployment requires a properly secured local backend/proxy, trusted HTTPS, access controls and explicit firewall/origin rules. That backend and a Windows installer are **not included**. Do not expose Ollama directly to the public internet.

Typography is loaded from Google Fonts and the dashboard photo from Unsplash; these requests expose ordinary web-request metadata, not transcripts. They would need bundling locally for fully offline deployment.

## Scoring

Rubric `sk-text-v1`: 0–20 absent/seriously flawed, 21–40 weak, 41–60 partial, 61–80 good, 81–100 excellent, null where the transcript does not support evaluation. Overall score is the rounded arithmetic mean of non-null category scores, not a separately invented model rating. Each scored category must include a literal substring of a recorded turn. Literal validation proves citation existence, not the correctness of the AI's interpretation.

No audio-based confidence, tone, talk/listen ratio, filler or silence measurements are reported. Customer outcomes are simulated, not real conversions. Comparable-call reporting matches intent, difficulty, rudeness, rubric and model; other scenario differences may still matter.

The optional adjusted analytic is explicitly experimental: `clamp(raw + 2 * (difficulty - 5), 0, 100)`. This is a documented heuristic, **not empirically calibrated scoring**. Default analytics show raw scores. Mixed difficulty/model aggregates are labelled as such.

## Tests and verification

The package test task runs Vitest using `src/vitest.config.ts`. It covers empty-state data, actual save/load of test records, interrupted transcript persistence, corrupted JSON handling, average/null scoring, response schema validation, endpoint restrictions, provider model discovery and mocked failure/retry/malformed output. Test records are created only inside isolated tests and never loaded into production analytics. Production build runs the test suite first.

Real-browser end-to-end tests for microphone permission, Slovak voice quality, speech recognition, real Ollama conversations and mobile HTTPS have **not** been executed in this environment. Successful unit tests and compilation must not be described as verification of those flows.

## Remaining scope from the original specification

- SQLite server persistence, migrations, secure local API and Windows deployment packaging.
- Shared private-network database, single-user server access protection and HTTPS proxy deployment.
- Fully local verified Slovak STT/TTS adapters, additional secure external providers, token/audio usage accounting and actual provider prices.
- True streaming, automatic turn detection/barge-in, recordings, consented replay and audio measurements.
- Document upload parsing/security and URL ingestion; current knowledge entry is plain text only.
- Detailed configurable persona trait editors beyond current context and difficulty/rudeness inputs.
- Full structured outcome flags, objection extraction, granular report sections and report version history.
- Fully fixed benchmark template protocol, automatic spaced repetition scheduling, milestones/streak calendar and weekly review history.
- All requested advanced analytics, moving averages and previous-period analysis.
- JSON import/restore, retention automation, full browser E2E and real model/hardware evaluation.

No claim is made that the entire original specification is finished or that voice quality has been verified.
