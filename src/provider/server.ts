import { app } from "./app.ts";

// Manual entry point for running the provider on its own:
//   npm run start:provider   (PORT env var optional, default 8081)
const port = Number(process.env.PORT ?? 8081);

app.listen(port, () => {
  console.log(`PerpustakaanArticlesApi listening on http://localhost:${port}`);
});
