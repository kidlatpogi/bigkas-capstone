/**
 * Contract reference for the Python FastAPI service (no runtime exports).
 * Canonical types: services/python-ai-service/models/schemas.py
 * Script generation models: services/python-ai-service/api/routes/ai.py
 *
 * Mobile or shared clients should mirror these field names when calling the same API.
 */

/**
 * @typedef {Object} ScriptGenerationRequestBody
 * @property {string} user_id
 * @property {string} prompt
 * @property {string} vibe
 * @property {number} target_word_count
 * @property {number} duration_minutes
 * @property {'new'|'regenerate'} [action]
 */

/**
 * @typedef {Object} ScriptGenerationResponseBody
 * @property {string} title
 * @property {string} content
 * @property {number} generation_tokens
 * @property {number} regeneration_tokens
 */

/**
 * @typedef {Object} UserTokensResponseBody
 * @property {number} generation_tokens
 * @property {number} regeneration_tokens
 */

export {};
