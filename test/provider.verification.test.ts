import path from "node:path";
import { fileURLToPath } from "node:url";
import type { Server } from "node:http";
import { afterAll, beforeAll, describe, it } from "vitest";
import { Verifier } from "@pact-foundation/pact";
import { app } from "../src/provider/app.ts";

// The Pact verifier must talk directly to the provider on localhost. In
// sandboxes / CI setups with a mandatory egress proxy, inherited *_PROXY
// variables can route the verifier's localhost calls (and Pact's
// anonymous telemetry) through the proxy and hang verification for
// minutes, so strip them for this test process and opt out of tracking.
for (const key of ["http_proxy", "https_proxy", "HTTP_PROXY", "HTTPS_PROXY", "ALL_PROXY", "all_proxy"]) {
  delete process.env[key];
}
process.env.PACT_DO_NOT_TRACK = "true";

const dir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

// Provider verification: replay the contract the consumer recorded
// (pacts/ReaderWeb-PerpustakaanArticlesApi.json) against the REAL
// provider app. If the provider renames a field, drops a layer, or
// changes a type, this fails even if the provider's own code "works".
describe("PerpustakaanArticlesApi provider verification", () => {
  let server: Server;
  let port: number;

  beforeAll(async () => {
    await new Promise<void>((resolve) => {
      server = app.listen(0, () => resolve());
    });
    const address = server.address();
    if (!address || typeof address === "string") {
      throw new Error("Could not determine provider port");
    }
    port = address.port;
  });

  afterAll(async () => {
    await new Promise<void>((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
  });

  it("satisfies the ReaderWeb contract", async () => {
    const verifier = new Verifier({
      providerBaseUrl: `http://127.0.0.1:${port}`,
      pactUrls: [path.resolve(dir, "pacts", "ReaderWeb-PerpustakaanArticlesApi.json")],
      stateHandlers: {
        "a published article with slug qad-kafani exists": async () => {
          // The in-memory dataset already contains qad-kafani as PUBLISHED,
          // so no setup is needed for this state.
          return "Published qad-kafani article is present in the dataset";
        },
        "no article with slug does-not-exist exists": async () => {
          // The dataset contains no such slug, so the provider will 404.
          return "No article with that slug exists in the dataset";
        },
      },
      logLevel: "warn",
      // Generous: the Rust core needs a moment to boot and replay.
      timeout: 60000,
    });

    await verifier.verifyProvider();
  }, 120_000);
});
