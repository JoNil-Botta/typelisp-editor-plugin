import type { Skill } from "./types.js";
/** Format model-visible skill metadata for inclusion in the harness system prompt. */
export declare function formatSkillsForSystemPrompt(skills: Skill[]): string;
