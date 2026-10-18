import express from "express";
import { findPublishedArticle } from "./articles.ts";

// Express app for the articles provider. The app is exported WITHOUT
// calling listen() so tests can bind it to any port (including a random
// one during Pact provider verification).
export const app = express();

app.get("/articles/:slug", (req, res) => {
  const article = findPublishedArticle(req.params.slug);
  if (!article) {
    res.status(404).json({ error: "Article not found" });
    return;
  }
  res.status(200).json(article);
});
