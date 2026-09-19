import { Router, type Request, type Response } from "express";
import { z } from "zod";
import { ProfileRepository } from "../data/ProfileRepository.js";
import { applyFilters } from "../services/FilterService.js";
import { InterpretService } from "../services/InterpretService.js";
import { ScoreService } from "../services/ScoreService.js";
import { RefineService } from "../services/RefineService.js";
import { FiltersSchema, RubricSchema } from "../schemas/index.js";
import { AppError } from "../types.js";

const RESULTS_SHOWN = 5;

const ERROR_STATUS: Record<AppError["code"], number> = {
  TIMEOUT: 504,
  RATE_LIMIT: 429,
  INVALID_LLM_OUTPUT: 502,
  UPSTREAM_ERROR: 502,
};

/**
 * Why this file exists: the only layer in the app that knows HTTP exists.
 * Every handler is deliberately three lines of "parse request body with
 * Zod -> call exactly one service -> shape the JSON response" - no business
 * logic lives here, so the search/filter/score/refine behavior stays fully
 * testable and reusable without spinning up Express. It's also the single
 * place that turns a typed AppError into an HTTP status + JSON error body,
 * so every route fails the same deliberate way instead of a raw 500/crash.
 */
export function buildSearchRoutes(deps: {
  profileRepository: ProfileRepository;
  interpretService: InterpretService;
  scoreService: ScoreService;
  refineService: RefineService;
}) {
  const router = Router();
  const { profileRepository, interpretService, scoreService, refineService } = deps;

  router.post("/interpret", async (req: Request, res: Response) => {
    const body = z.object({ query: z.string().min(1) }).safeParse(req.body);
    if (!body.success) return res.status(400).json({ error: { code: "BAD_REQUEST", message: "query is required" } });

    try {
      const { filters, rubric } = await interpretService.interpret(body.data.query);
      res.json({ filters, rubric });
    } catch (err) {
      sendError(res, err);
    }
  });

  router.post("/run", async (req: Request, res: Response) => {
    const body = z.object({ filters: FiltersSchema, rubric: RubricSchema }).safeParse(req.body);
    if (!body.success) return res.status(400).json({ error: { code: "BAD_REQUEST", message: body.error.message } });

    try {
      const matched = applyFilters(profileRepository.getAll(), body.data.filters);
      if (matched.length === 0) {
        return res.json({ matchCount: 0, results: [] });
      }
      const results = await scoreService.scoreAndRank(matched, body.data.rubric);
      res.json({ matchCount: matched.length, results: results.slice(0, RESULTS_SHOWN) });
    } catch (err) {
      sendError(res, err);
    }
  });

  const RefineRequestSchema = z.object({
    filters: FiltersSchema,
    rubric: RubricSchema,
    previousResults: z.array(
      z.object({
        profile: z.record(z.string(), z.unknown()),
        score: z.number(),
        explanation: z.string(),
      })
    ),
    feedback: z.object({
      thumbs: z.array(z.object({ profile_id: z.string(), verdict: z.enum(["up", "down"]) })),
      chat_message: z.string().optional(),
    }),
  });

  router.post("/refine", async (req: Request, res: Response) => {
    const body = RefineRequestSchema.safeParse(req.body);
    if (!body.success) return res.status(400).json({ error: { code: "BAD_REQUEST", message: body.error.message } });

    try {
      const { filters, rubric, previousResults, feedback } = body.data;
      const refined = await refineService.refine(
        profileRepository.getAll(),
        filters,
        rubric,
        previousResults as never,
        feedback
      );
      res.json({
        filters: refined.filters,
        rubric: refined.rubric,
        whatChanged: refined.whatChanged,
        matchCount: refined.results.length,
        results: refined.results.slice(0, RESULTS_SHOWN),
      });
    } catch (err) {
      sendError(res, err);
    }
  });

  return router;
}

function sendError(res: Response, err: unknown) {
  if (err instanceof AppError) {
    return res.status(ERROR_STATUS[err.code]).json({ error: { code: err.code, message: err.message } });
  }
  console.error(err);
  res.status(500).json({ error: { code: "UNKNOWN", message: "Something went wrong. Please try again." } });
}
