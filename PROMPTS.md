# LLM Prompts

Three Gemini calls drive the whole loop. Each one lives as a commented, typed template function
in `server/src/llm/prompts/` — this file is a readable index into those, not a separate source of
truth; if the two ever disagree, the code is correct. All three use Gemini's structured output
(`responseMimeType: "application/json"` + a `responseSchema`), and every response is re-validated
server-side with Zod before it's trusted (see `server/src/utils/callLLMForJSON.ts`) — the schema
tells Gemini what to produce, it is never assumed to have complied.

## 1. Interpret — free text → filters + rubric

**File:** `server/src/llm/prompts/interpret.prompt.ts` · **Called from:** `POST /api/search/interpret`

**Why one call, not two:** a single recruiter sentence usually mixes objective and subjective
signal in the same clause — "startups" is a filterable `company_type`, "who ships fast" is not.
Splitting objective-filter-extraction from rubric-writing into two separate calls would mean
guessing, ourselves, which half of the sentence belongs to which prompt. Asking the model for both
in one call with full context does that language-understanding step once, correctly.

```
You are helping a recruiter turn a free-text search into a structured search.

Recruiter's search: "${query}"

Produce two things:

1. OBJECTIVE FILTERS - only include a constraint if the recruiter's text actually implies it.
   Do not invent constraints they did not ask for. Leave arrays empty / numbers null when the
   text gives no signal for that field.
   - skills: array of specific skill/technology keywords (match the dataset's own terms where
     obvious, e.g. "RDS" -> "AWS RDS", "Node" -> "Node.js").
   - years_experience_min / years_experience_max: numeric bounds if a range or minimum is implied.
   - locations: array of city names if a location is implied.
   - company_types: subset of ["startup", "scaleup", "enterprise", "agency"] if company background
     is implied (e.g. "worked at startups" -> ["startup"]).

2. SUBJECTIVE FIT RUBRIC - what makes a candidate a strong fit for this specific search, beyond
   the objective filters. Write it as if briefing a colleague who will judge candidates by hand.
   - summary: one or two sentences capturing what "good" looks like for this search.
   - criteria: 3-5 short bullet points a judge could actually apply to a resume (e.g. "depth over
     breadth in the core stack", "career trajectory shows increasing ownership", not vague praise).

Return JSON only, matching the schema.
```

**Structured output schema:** `{ filters: { skills[], years_experience_min, years_experience_max,
locations[], company_types[] }, rubric: { summary, criteria[] } }`

## 2. Score — filtered profiles + rubric → ranked, explained scores

**File:** `server/src/llm/prompts/score.prompt.ts` · **Called from:** `POST /api/search/run` (and
internally by refine)

**Why it only ever sees the already-filtered subset:** `FilterService` (pure, no LLM) does the
cheap objective narrowing first — skills/years/location/company-type — entirely locally against
the sample dataset. This call spends model budget only on the genuinely subjective judgment a hard
filter can't do, on however many profiles survived filtering, never the full 48-profile pool.

**Why the explanation rules exist:** the assignment requires explanations to cite real profile
fields, not generic praise. That's enforced by direct instruction here — and a live testing pass
caught the model referencing internal `profile_id`s (e.g. "p06 has...") in otherwise-good
explanations, so the "never mention the candidate's id" rule was added after that observation, not
guessed upfront.

```
You are scoring candidates against a fit rubric for a recruiter.

RUBRIC
Summary: ${rubric.summary}
Criteria:
${rubric.criteria joined as "- <criterion>" lines}

CANDIDATES (JSON array, one object per candidate):
${filtered profiles, compacted: id, current_title, years_experience, location, current_company,
  current_company_type, skills, past_companies, education, summary}

For EVERY candidate above, return a score from 0-100 (100 = ideal fit) and a short explanation.

Rules for the explanation:
- 1-2 sentences, specific to this candidate.
- Must name real values from their record (e.g. an actual skill, their current_company, years_experience,
  current_company_type, or a past company) - never generic praise like "strong candidate" or "great fit"
  with no supporting detail.
- Never mention the candidate's id (e.g. "p06") in the explanation text - the reader already sees who
  it's about next to the explanation. Write it as a plain sentence about the person, not a data dump
  (e.g. "6 years at a startup with deep AWS RDS experience" not "p06 has 6 years...").
- If the candidate is a weak fit, say why using the same kind of specific detail (e.g. "3 years
  experience is below the target range" or "no AWS RDS in their skill list").

Return JSON only, matching the schema, with exactly one entry per candidate id.
```

**Structured output schema:** `{ scores: [{ profile_id, score (0-100), explanation }] }`

`ScoreService` joins each returned `profile_id` back to the full `Profile` object for the
frontend, sorts by score descending, and silently drops any `profile_id` that doesn't match a
real profile (a hallucinated id) rather than letting it crash the response.

## 3. Refine — recruiter feedback → adjusted filters + rubric + what changed

**File:** `server/src/llm/prompts/refine.prompt.ts` · **Called from:** `POST /api/search/refine`

**Why candidates are numbered 1..N in the prompt:** free-text feedback like *"1 is too junior, 2
and 4 are right"* is positional, referring to what the recruiter saw on screen, not to internal
profile ids. The prompt reproduces that same 1..N order so the model can resolve "1" itself,
instead of the app trying to parse natural-language position references before ever calling the LLM.

**Why `what_changed` is a required output field, not just a side effect:** the assignment asks for
refinement that "visibly responds to feedback in a way a recruiter would trust." Requiring the
model to produce a short, recruiter-facing sentence explaining its own edit is what makes that
trust concrete in the UI (`DiffNote`), rather than silently swapping the rubric out from under the
recruiter between rounds.

```
You are refining a candidate search based on recruiter feedback.

CURRENT FILTERS: ${filters as JSON}
CURRENT RUBRIC: ${rubric as JSON}

CANDIDATES THE RECRUITER JUST REVIEWED (numbered in the order shown to them):
${previous results, numbered 1..N: position, profile_id, current_title, years_experience,
  location, current_company, current_company_type, skills, previous_score, previous_explanation}

STRUCTURED FEEDBACK (per-profile thumbs, if any):
${e.g. "- profile p04: recruiter marked GOOD MATCH" per thumbed candidate, or "(none given)"}

FREE-TEXT FEEDBACK FROM RECRUITER (if any, may reference candidates by their position number above,
e.g. "1 is too junior, 2 and 4 are right"):
${feedback.chat_message, or "(none given)"}

Using this feedback, decide how the FILTERS and/or RUBRIC should change so future results better
match what the recruiter wants. Small, targeted adjustments are better than rewriting everything -
only change what the feedback actually justifies. If feedback conflicts or is unclear, make the
smallest reasonable interpretation and say so in what_changed.

Return the full updated filters object, the full updated rubric object (even for fields that did not
change), and what_changed: a short, specific, recruiter-facing sentence describing what you adjusted
and why (e.g. "Raised the minimum years of experience to 5 since candidate 1 was marked too junior at 3
years, and added emphasis on payments-domain experience since 2 and 4 were both approved payments
engineers.").

Return JSON only, matching the schema.
```

**Structured output schema:** `{ filters: {...same shape as interpret...}, rubric: {...}, what_changed: string }`

`RefineService` takes the adjusted filters/rubric this call returns and immediately re-runs the
same local-filter → score pipeline used by `/run`, so a refine round produces a fully re-ranked
result set from one HTTP call, not two round trips from the client.

## Failure handling (applies to all three calls)

- **Model fallback:** `GeminiClient` tries a short, ordered list of models before failing outright
  (see its file header for the live-testing story behind the current order — free-tier daily quota
  is tracked per model, so this is ordered by which models have a genuinely separate quota bucket,
  not by capability).
- **Structured-output validation + repair:** every response is parsed and Zod-validated in
  `callLLMForJSON.ts`. On a validation failure, one repair pass re-prompts with the invalid output
  and the exact validation error, asking for corrected JSON. If that also fails, a typed
  `AppError("INVALID_LLM_OUTPUT", ...)` is thrown and surfaced as a designed error state in the UI
  — never a crash or a silent fallback to fake data.
