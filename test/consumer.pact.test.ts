import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { MatchersV3, PactV3 } from "@pact-foundation/pact";
import { ArticleNotFoundError, getArticle } from "../src/consumer/libraryClient.ts";

const { eachLike, like, string } = MatchersV3;

const dir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const provider = new PactV3({
  consumer: "ReaderWeb",
  provider: "PerpustakaanArticlesApi",
  dir: path.resolve(dir, "pacts"),
  logLevel: "warn",
});

// The example body the consumer expects. Matchers say "any value of this
// shape/type", so the contract survives content edits but breaks when a
// field is renamed, removed, or changes type.
const articleBody = {
  id: string("ae085c4b-3839-4269-a1c0-fcc8aadd37d9"),
  title: string("Qad Kafani"),
  slug: string("qad-kafani"),
  type: string("SHALAWAT"),
  description: string("A classical shalawat attributed to Imam Abdullah bin 'Alawi al-Haddad."),
  status: string("PUBLISHED"),
  publishedAt: string("2026-10-04T00:00:00.000Z"),
  units: eachLike({
    id: string("qad-kafani-1"),
    arab: string("قَدْ كَفَانِيْ عِلْمُ رَبِّيْ"),
    latin: string("Qad kafani 'ilmu Rabbi"),
    translation: string("Sungguh telah cukup bagiku pengetahuan Tuhanku"),
    english: string("The knowledge of my Lord has truly sufficed me"),
  }),
};

describe("ReaderWeb consumer contract", () => {
  it("gets a published article with all four reader layers", async () => {
    await provider
      .given("a published article with slug qad-kafani exists")
      .uponReceiving("a request for the qad-kafani article")
      .withRequest({
        method: "GET",
        path: "/articles/qad-kafani",
      })
      .willRespondWith({
        status: 200,
        headers: { "Content-Type": like("application/json") },
        body: articleBody,
      })
      .executeTest(async (mockServer) => {
        const article = await getArticle(mockServer.url, "qad-kafani");
        expect(article.slug).toBe("qad-kafani");
        expect(article.status).toBe("PUBLISHED");
        expect(article.units.length).toBeGreaterThan(0);
        expect(article.units[0].arab).toBeTruthy();
        expect(article.units[0].latin).toBeTruthy();
        expect(article.units[0].translation).toBeTruthy();
        expect(article.units[0].english).toBeTruthy();
      });
  });

  it("gets a 404 for an unknown slug", async () => {
    await provider
      .given("no article with slug does-not-exist exists")
      .uponReceiving("a request for an unknown article")
      .withRequest({
        method: "GET",
        path: "/articles/does-not-exist",
      })
      .willRespondWith({
        status: 404,
        headers: { "Content-Type": like("application/json") },
        body: { error: string("Article not found") },
      })
      .executeTest(async (mockServer) => {
        await expect(getArticle(mockServer.url, "does-not-exist")).rejects.toBeInstanceOf(
          ArticleNotFoundError,
        );
      });
  });
});
