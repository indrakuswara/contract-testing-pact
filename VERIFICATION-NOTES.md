# Verification Notes — honest run log

Environment: Node v24.20.0, npm 10.9.4, Linux sandbox.
Installed versions (exact, from `npm ls`): `@pact-foundation/pact` 17.1.4
(pact-core 20.2.0), `express` 5.3.0, `vitest` 5.0.5, `tsx` 4.23.15,
`typescript` 7.0.2, `@types/express` 5.0.6, `@types/node` 26.6.5.
All runs below were executed on 2026-10-18 (UTC) in this workspace.

## 1. Consumer test — PASS

Command: `npm run test:consumer`

```
✓ test/consumer.pact.test.ts (2 tests)
Test Files  1 passed (1)
     Tests  2 passed (2)
```

Both interactions ran the real client (`getArticle`) against the Pact mock
server: (a) published `qad-kafani` → 200 with matcher-checked body
(id/title/slug/type/description/status/publishedAt + units with
arab/latin/translation/english), (b) unknown slug → 404, client throws
`ArticleNotFoundError`. Contract written to
`pacts/ReaderWeb-PerpustakaanArticlesApi.json` (5,248 bytes).

## 2. Provider verification — PASS (after two environment fixes)

Command: `npm run test:provider`

Final result:

```
Verifying a pact between ReaderWeb and PerpustakaanArticlesApi
  a request for an unknown article — status 404 (OK), body matching (OK)
  a request for the qad-kafani article — status 200 (OK), body matching (OK)
✓ test/provider.verification.test.ts (1 test)
     Tests  1 passed (1)
```

Two real issues were hit and fixed on the way — recorded here because they
are the kind of thing that bites in CI too:

1. **Pact filename case.** First run failed with
   `pactffiVerifierAddDirectorySource failed validation: '.../pacts/readerweb-perpustakaanarticlesapi.json' does not exist`.
   Pact 17 writes the pact file preserving consumer/provider case
   (`ReaderWeb-PerpustakaanArticlesApi.json`), unlike older versions that
   lowercased it. Fixed the path in the provider test.
2. **Proxy environment hang.** With the filename fixed, verification hung
   until the 120 s test timeout, throwing
   `Error: Proxy connection ended before receiving CONNECT response`
   (from `https-proxy-agent`). This sandbox forces all traffic through an
   egress proxy (`http_proxy`/`https_proxy`/`ALL_PROXY` set,
   `NODE_USE_ENV_PROXY=1`), and the verifier's localhost traffic and/or
   Pact's anonymous telemetry got routed through it. Setting
   `PACT_DO_NOT_TRACK=true` alone did **not** fix the hang (verified,
   90 s timeout). Fix that worked: the provider test deletes the inherited
   `*_PROXY` variables from its own `process.env` and sets
   `PACT_DO_NOT_TRACK=true` before creating the Verifier — plain
   `npm run test:provider` then passes in ~2 s. Verified again with a
   completely proxy-free environment: also passes.

Full suite after fixes — `npm test`: **2 test files passed, 3 tests passed**.

Manual smoke test of the provider (`PORT=18099 npx tsx src/provider/server.ts`):
`GET /articles/qad-kafani` → 200 with the article JSON;
`GET /articles/nope` → `404 {"error":"Article not found"}`.

## 3. The rename experiment — contract catches a silent breaking change

Goal: prove the contract fails when the provider breaks the shape the
consumer depends on, even though the provider still "works".

Steps:

1. Renamed the field `translation` → `terjemahan` in the provider only
   (`src/provider/articles.ts`: the `ArticleUnit` field and both data
   entries). The pact file and consumer code were **not** touched.
2. Ran `npm run test:provider` → **FAILED, exit code 1, 1 test failed.**
   Original error summary from the verifier:

   ```
   1) Verifying a pact between ReaderWeb and PerpustakaanArticlesApi
      Given a published article with slug qad-kafani exists —
      a request for the qad-kafani article
       1.1) has a matching body
              $.units[1] -> Actual map is missing the following keys: translation
              $.units[0] -> Actual map is missing the following keys: translation
   There were 1 pact failures
   ```

   Mismatch detail: actual unit keys were
   `["arab","english","id","latin","terjemahan"]` vs. expected
   `["arab","english","id","latin","translation"]` (type `BodyMismatch`).
   Note the 404 interaction still passed — only the broken interaction
   failed, which is exactly the granularity you want.
3. Reverted the rename (restored `src/provider/articles.ts` verbatim;
   `translation` present again, `terjemahan` gone).
4. Re-ran the full suite — `npm test`: **2 test files passed, 3 tests
   passed**, exit code 0. Green again.

Takeaway: a field rename that no provider-side test would flag — same
status code, same JSON validity, data all present under a new name —
fails provider verification immediately, naming the missing key and the
exact JSON paths. That is the whole point of consumer-driven contracts.
