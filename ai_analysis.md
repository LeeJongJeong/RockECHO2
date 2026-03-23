# AI Module Notes

This document reflects the refactored AI pipeline in `src/ai` and `src/services/ai-service.ts`.

## Modules

- `src/ai/prompt.ts`: builds the system and user prompts for OpenAI-compatible calls
- `src/ai/client.ts`: calls the configured OpenAI-compatible endpoint and falls back on auth or parse errors
- `src/ai/fallback.ts`: deterministic rule-based generation used when API access is unavailable or invalid
- `src/ai/pattern-detect.ts`: maps raw input to fallback incident categories
- `src/ai/sanitize.ts`: normalizes generated output into the expected knowledge-entry shape
- `src/services/ai-service.ts`: orchestrates generation, persistence, and activity-log creation

## Runtime Behavior

1. `POST /api/ai/generate` validates `incident_id`, `raw_input`, and `dbms`.
2. The service checks `OPENAI_API_KEY`.
3. If a key is present, the OpenAI-compatible client is used.
4. On auth failures, malformed JSON, or missing keys, the fallback generator is used.
5. The generated entry is stored with:
   - `status = 'ai_generated'`
   - `cause_confidence = 'ai_inferred'`
6. An `activity_log` row is written with action `ai_generated`.

## Refactor Goal

The route no longer owns prompt construction, HTTP client logic, fallback behavior, sanitization, and persistence in one file. Those responsibilities are now isolated so behavior can be tested and changed independently.