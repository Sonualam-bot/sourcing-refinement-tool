try {
  process.loadEnvFile();
} catch {
  // No .env file present (e.g. running in Docker where the env is injected
  // directly by docker-compose) - fall back to whatever is already in process.env.
}

import express from "express";
import cors from "cors";
import { ProfileRepository } from "./data/ProfileRepository.js";
import { GeminiClient } from "./llm/GeminiClient.js";
import { InterpretService } from "./services/InterpretService.js";
import { ScoreService } from "./services/ScoreService.js";
import { RefineService } from "./services/RefineService.js";
import { buildSearchRoutes } from "./routes/searchRoutes.js";

/**
 * Why this file exists: the only place object graphs get assembled. Every
 * service in this app takes its dependencies through its constructor
 * (LLMClient, ScoreService, ProfileRepository) rather than constructing them
 * itself - this is where those wires actually get connected, once, so
 * swapping GeminiClient for a different LLMClient implementation (tests, a
 * different provider) means changing this file and nothing else.
 */
const apiKey = process.env.GEMINI_API_KEY ?? "";
const llmClient = new GeminiClient(apiKey);
const profileRepository = new ProfileRepository();
const scoreService = new ScoreService(llmClient);

const routes = buildSearchRoutes({
  profileRepository,
  interpretService: new InterpretService(llmClient),
  scoreService,
  refineService: new RefineService(llmClient, scoreService),
});

const app = express();
app.use(cors());
app.use(express.json({ limit: "1mb" }));
app.get("/api/health", (_req, res) => res.json({ ok: true }));
app.use("/api/search", routes);

const PORT = Number(process.env.PORT) || 4000;
app.listen(PORT, () => {
  console.log(`Sourcing loop server listening on :${PORT}`);
});
