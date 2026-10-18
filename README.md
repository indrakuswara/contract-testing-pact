# Contract Testing with Pact — Perpustakaan Articles API

Consumer-driven contract testing in TypeScript, modelled on a real project:
the **Perpustakaan Shalawat & Maulid** digital library, whose reader shows
every article as structured units with four layers — Arabic, Latin
transliteration, Indonesian translation, and English translation.

## Why contract testing?

API tests written from the provider's side alone have a blind spot: the
provider can rename a field, drop a layer, or change a type, and every
provider-side test still passes — while the consumer breaks in production.
Consumer-driven contract testing flips the responsibility:

1. The **consumer** records the exact shape it depends on as a *contract*
   (a Pact file), using matchers (`like`/`eachLike`) instead of fixed values.
2. The **provider** later replays that contract against the real API.
   If the provider no longer satisfies it, verification fails **before
   deploy** — even though the provider's code "works" on its own terms.

```
  ┌──────────────┐   records expectations    ┌────────────────────┐
  │   Consumer   │ ────────────────────────► │  Pact file (JSON)  │
  │  ReaderWeb   │   (consumer test, mock    │  pacts/ReaderWeb-  │
  │              │    server from Pact)      │  Perpustakaan...   │
  └──────────────┘                           └────────────────────┘
                                                        │
                                                        │ replayed by
                                                        ▼
  ┌──────────────┐   must satisfy contract   ┌────────────────────┐
  │   Provider   │ ◄──────────────────────── │  Pact Verifier     │
  │ Perpustakaan │   (provider verification │  (in the provider  │
  │ ArticlesApi  │    vs. the real Express  │   test suite)      │
  │              │    app, random port)     │                    │
  └──────────────┘                           └────────────────────┘
```

## What's in this repo

| Path | What it is |
| --- | --- |
| `src/provider/app.ts` | Express app: `GET /articles/:slug` → 200 + article JSON for a known PUBLISHED slug, 404 JSON otherwise. Exported without `listen()` so tests own the port. |
| `src/provider/articles.ts` | In-memory dataset mirroring the real library's content model (`Article` + four-layer `ArticleUnit`). |
| `src/provider/server.ts` | Manual entry point (`npm run start:provider`, default port 8081). |
| `src/consumer/libraryClient.ts` | Consumer client using Node's native `fetch`; throws `ArticleNotFoundError` on 404. |
| `test/consumer.pact.test.ts` | Consumer contract test (Pact V3, `MatchersV3`): published-article 200 + unknown-slug 404. Writes the pact to `pacts/`. |
| `test/provider.verification.test.ts` | Provider verification: boots the real app on a random port and replays the pact with state handlers. |
| `pacts/` | The generated contract. This is a deliverable, not a build artifact — it is committed to git. |
| `VERIFICATION-NOTES.md` | Honest run log, including the deliberate field-rename experiment that proves the contract catches breaking changes. |

## Running the tests

```bash
npm install
npm run test:consumer   # consumer records/updates the contract in pacts/
npm run test:provider   # provider replays the contract against the real app
npm test                # both suites (3 tests)
```

> **Note:** `test/provider.verification.test.ts` strips inherited
> `*_PROXY` environment variables for its own process. The Pact verifier
> talks to the provider on localhost; in sandboxes with a mandatory egress
> proxy those variables can route localhost traffic (and Pact telemetry)
> through the proxy and hang verification.

## Stack

- TypeScript (ESM), Node.js 24
- [@pact-foundation/pact](https://docs.pact.io/) 17.1.4 (Pact V3, consumer + verifier)
- Express 5.3.0 (provider)
- Vitest 5.0.5 (test runner), tsx (manual provider run)

## The interview story

I modelled the contract on my own production project, a digital shalawat
library whose reader depends on four text layers per unit. The consumer
test pins exactly that dependency with matchers, and provider verification
replays it against the real Express app. To prove the safety net works, I
deliberately renamed the provider's `translation` field to `terjemahan`:
the provider's responses still looked fine, but verification failed with
`Actual map is missing the following keys: translation` — the exact class
of silent breaking change contract testing exists to catch. Reverting the
rename turned the suite green again.

## Roadmap

- **GitHub Actions**: run consumer tests, publish the pact, then verify the
  provider on every push.
- **Phase 2**: add a real public endpoint (`GET /api/v1/articles/:slug`) to
  the production Perpustakaan app — e.g. for a future mobile app or embeds
  for study groups — and move provider verification against that real app.
- **Pact Broker / PactFlow**: publish contracts and use `can-i-deploy` to
  gate releases on verification results.
