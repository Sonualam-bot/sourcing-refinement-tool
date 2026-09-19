# The Sourcing Refinement Loop

A full-stack app that runs Flexiple's sourcing refinement loop end to end for a single search
session: free text → LLM-generated objective filters + a subjective fit rubric → local filtering
over the supplied 48-profile dataset → LLM scoring/ranking with per-profile, field-grounded
explanations → a chat/thumbs-driven refinement loop → freeze to a final shortlist.

## Setup

1. Get a free Gemini API key: https://aistudio.google.com/apikey
2. Copy `.env.example` to `.env` at the repo root and set `GEMINI_API_KEY`.
3. Run:

```
docker compose up
```

4. Open http://localhost:8080

That's it - one command, no local Node/npm install required. The client (nginx, serving the
built React app and reverse-proxying `/api/*` to the server) is the only exposed port; the server
container is internal.

**Env var:** `GEMINI_API_KEY` (required). `GEMINI_MODEL` (optional, defaults to `gemini-3.6-flash`).

### Running without Docker

For development (hot reload):

```
cd server && npm install && npm run dev   # :4000, reads server/.env
cd client && npm install && npm run dev   # :5173, proxies /api to :4000
```

Or as a built, production-style run (mirrors what the Docker image does, minus the container):

```
cd server && npm install && npm run build && npm start   # :4000
cd client && npm install && npm run build && npm start   # :5173, proxies /api to :4000
```

## Prompts

All three LLM interactions live as commented, readable template functions in
`server/src/llm/prompts/` (`interpret.prompt.ts`, `score.prompt.ts`, `refine.prompt.ts`). Each
file's header comment explains the reasoning behind how it's shaped, not just what it does.

## Decisions

**What I prioritized:** the loop actually working end to end against real Gemini calls, with every
state the assignment calls out designed on purpose (first load, thinking, empty results, LLM
failure + recovery, frozen summary) - verified live in a browser, not just assumed from code.
Second priority was structuring the LLM interactions and state machine so the technical judgment
behind them is visible: an explicit discriminated-union state machine on the client
(`state/searchReducer.ts`), a Dependency-Inversion boundary around the LLM provider
(`llm/LLMClient.ts` / `llm/GeminiClient.ts`), and a single validate-and-repair choke point every
LLM response goes through (`utils/callLLMForJSON.ts`).

**Stateless server, client owns session state.** No login/persistence is in scope, so the server
never holds a session - every request carries the full context it needs and returns the next
state. Simpler than session/cookie machinery, and fully correct for a single-session flow.

**Model-fallback chain, ordered by quota headroom, not capability.** The Gemini free tier tracks
its daily request quota per model, and a refinement loop that fires an LLM call on nearly every
recruiter action burns through a small daily allotment fast. `GeminiClient` first tried newest-
model-first, then oldest-first, and both broke down under live testing: the newest model hit its
20-requests/day cap, and the "most stable" older model turned out to be unavailable to this key's
project entirely (404). The chain now leads with "lite" model variants specifically because
they sit in a separate quota bucket from the full-size models - confirmed live against this key,
not assumed from the model name - so exhausting one model's daily quota degrades to a genuinely
different allotment instead of the same roll of the dice. Malformed/invalid JSON is a separate
concern, handled with one repair pass that shows the validation error back to the model, in
`callLLMForJSON.ts`.

**Docker is a packaging step, not the dev loop.** Iterating inside containers is slow, so the app
was built and tested natively the whole way through; Dockerfiles and `docker-compose.yml` were
added at the end so the *deliverable* satisfies "one command, no local installs," verified with a
clean `docker compose down && docker compose up` and a real Gemini call through the nginx proxy.

**Both feedback modes, one endpoint.** The assignment describes both per-profile yes/no and
free-text chat feedback; the refine endpoint accepts a combined `{ thumbs, chat_message }` object
so either (or both) drive the same refine prompt, rather than picking one and cutting the other.

**What I cut:** persistence, auth, multi-session support (explicitly out of scope). No automated
test suite beyond a couple of manual sanity checks on `FilterService`'s pure matching logic -
given the time box, end-to-end verification against real Gemini calls in an actual browser was a
better use of the remaining time than unit tests around code that was already being exercised
live. The GHCR-image stretch goal (pushing a prebuilt image so a reviewer never has to clone) was
also cut to keep the core loop and Docker packaging solid within the time box.
