import type { Article } from "../provider/articles.ts";

export class ArticleNotFoundError extends Error {
  constructor(slug: string) {
    super(`Article not found: ${slug}`);
    this.name = "ArticleNotFoundError";
  }
}

// Minimal consumer-side client for the articles API, using Node's native
// fetch. This stands in for the code the public reader web app would use
// if it fetched articles over HTTP instead of reading the database
// directly.
export async function getArticle(baseUrl: string, slug: string): Promise<Article> {
  const response = await fetch(`${baseUrl}/articles/${slug}`);
  if (response.status === 404) {
    throw new ArticleNotFoundError(slug);
  }
  if (!response.ok) {
    throw new Error(`Unexpected response ${response.status} when fetching article "${slug}"`);
  }
  return (await response.json()) as Article;
}
