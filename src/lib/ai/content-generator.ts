/**
 * Go Virall Content Generator — AI-powered content creation
 * 6 content types: post ideas, captions, calendar, scripts, carousels, bio
 */

import { aiChat } from "./provider";
import { profileSummary, metricsSummary } from "./social-analysis";
import { PLATFORM_ALGORITHMS } from "./platform-algorithms";
import type { SocialPlatform } from "@/types";

export type ContentType =
  | "post_ideas"
  | "captions"
  | "calendar"
  | "scripts"
  | "carousels"
  | "bio";

export interface ContentGeneratorInput {
  profile: Record<string, unknown>;
  metrics: Record<string, unknown>[];
  contentType: ContentType;
  topic: string;
  tone: string;
  count: number;
}

interface ContentResult {
  data: Record<string, unknown>;
  provider: string;
  tokensUsed?: number;
  costCents?: number;
}

const CONTENT_PROMPTS: Record<ContentType, (input: ContentGeneratorInput) => string> = {
  post_ideas: (input) => `You are a viral content strategist. Generate ${input.count} post ideas for this social media creator.

PROFILE:
${profileSummary(input.profile)}

RECENT METRICS:
${metricsSummary(input.metrics)}

TOPIC/THEME: ${input.topic}
TONE: ${input.tone}

Generate exactly ${input.count} post ideas. For each idea include:
- title: Catchy post title (5-10 words)
- hook: Opening hook line that grabs attention
- angle: The unique perspective or angle
- format: Recommended format — choose from: ${PLATFORM_ALGORITHMS[(input.profile.platform as SocialPlatform) || "instagram"]?.contentFormats.join(", ") || "carousel, reel, story, static, thread"}
- hashtags: Array of 5 relevant hashtags (with #)
- estimatedEngagement: "high", "medium", or "low"

IMPORTANT: Respond ONLY with valid, complete JSON. No markdown, no explanation, no emojis. Just the JSON object: { "ideas": [...] }`,

  captions: (input) => `You are a social media copywriter who crafts viral captions. Generate ${input.count} captions for this creator.

PROFILE:
${profileSummary(input.profile)}

TOPIC/THEME: ${input.topic}
TONE: ${input.tone}

Generate exactly ${input.count} ready-to-post captions. For each caption include:
- text: The full caption text (engaging, ${input.tone} tone, include line breaks for readability, no emojis)
- callToAction: A compelling CTA at the end
- hashtags: Array of 5-8 relevant hashtags (with #)
- tone: The tone achieved
- estimatedLength: "short" (<100 chars), "medium" (100-300 chars), or "long" (300+ chars)

IMPORTANT: Respond ONLY with valid, complete JSON. No markdown, no explanation, no emojis. Just the JSON object: { "captions": [...] }`,

  calendar: (input) => `You are a content planning expert. Create a 7-day content calendar for this social media creator.

PROFILE:
${profileSummary(input.profile)}

RECENT METRICS:
${metricsSummary(input.metrics)}

TOPIC/THEME: ${input.topic}
TONE: ${input.tone}

Create a 7-day content calendar. For each day include:
- day: Day name (Monday-Sunday)
- time: Optimal posting time (e.g. "9:00 AM", "6:30 PM")
- contentType: Type of content — choose from: ${PLATFORM_ALGORITHMS[(input.profile.platform as SocialPlatform) || "instagram"]?.contentFormats.join(", ") || "reel, carousel, story, static post, live, thread"}
- topic: Specific topic for that day
- caption: A brief caption idea (1-2 sentences, no emojis)
- hashtags: Array of 3-5 hashtags

IMPORTANT: Respond ONLY with valid, complete JSON. No markdown, no explanation, no emojis. Just the JSON object: { "calendar": [...] }`,

  scripts: (input) => `You are a video script writer for social media. Generate ${input.count} short-form video scripts.

PROFILE:
${profileSummary(input.profile)}

TOPIC/THEME: ${input.topic}
TONE: ${input.tone}

Generate exactly ${input.count} content scripts optimized for ${(input.profile.platform as string) || "social media"}. For each script include:
- title: Script title
- hook: Opening hook (first 3 seconds — most critical)
- body: Main content (keep punchy, ${input.tone} tone)
- callToAction: Closing CTA
- duration: Estimated duration (e.g. "30s", "60s", "90s")
- visualNotes: Brief notes on visuals/b-roll suggestions

IMPORTANT: Respond ONLY with valid, complete JSON. No markdown, no explanation, no emojis. Just the JSON object: { "scripts": [...] }`,

  carousels: (input) => `You are a carousel content designer for social media. Generate ${input.count} carousel concepts.

PROFILE:
${profileSummary(input.profile)}

TOPIC/THEME: ${input.topic}
TONE: ${input.tone}

Generate exactly ${input.count} carousel concepts. For each carousel include:
- title: Carousel title/hook for slide 1
- slides: Array of 4-5 slides, each with:
  - slideNumber: 1-based index
  - headline: Bold headline text for the slide
  - body: Supporting text (1-2 sentences)
- caption: Suggested caption for the post
- hashtags: Array of 5 hashtags

IMPORTANT: Respond ONLY with valid, complete JSON. No markdown, no explanation, no emojis. Just the JSON object: { "carousels": [...] }`,

  bio: (input) => `You are a social media branding expert. Generate ${input.count} optimized bio options.

PROFILE:
${profileSummary(input.profile)}

TOPIC/THEME: ${input.topic}
TONE: ${input.tone}

Generate exactly ${input.count} bio variations optimized for discovery and conversion. For each bio include:
- text: The full bio text (respect platform character limits, use line breaks, no emojis)
- style: The style approach (e.g. "Professional", "Creative", "Minimalist", "Authority", "Approachable")
- callToAction: The CTA included in the bio (no emojis)
- keywords: Array of SEO/discovery keywords used

IMPORTANT: Respond ONLY with valid, complete JSON. No markdown, no explanation, no emojis. Just the JSON object: { "bios": [...] }`,
};

/**
 * Attempt to repair truncated JSON by closing unclosed strings,
 * removing trailing incomplete values, and closing open brackets/braces.
 */
function repairJSON(text: string): string {
  let s = text;

  // Pass 0: fix unquoted hashtag values (AI drops opening quotes)
  // e.g., ["#tag1", #tag2", "#tag3"] → ["#tag1", "#tag2", "#tag3"]
  s = s.replace(/([,\[])(\s*)#([A-Za-z0-9_]+)"/g, '$1$2"#$3"');

  // Pass 1: detect unclosed strings
  let inString = false;
  let escape = false;
  for (const ch of s) {
    if (escape) { escape = false; continue; }
    if (ch === "\\") { escape = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
  }
  if (inString) s += '"';

  // Pass 2: remove trailing incomplete key-value pairs / trailing commas
  s = s.replace(/,\s*"[^"]*"\s*:\s*"[^"]*"\s*$/, "");
  s = s.replace(/,\s*"[^"]*"\s*:\s*"[^"]*$/, "");
  s = s.replace(/,\s*"[^"]*"\s*:\s*\[[^\]]*$/, "");
  s = s.replace(/,\s*"[^"]*"\s*:\s*$/, "");
  s = s.replace(/,\s*"[^"]*"\s*$/, "");
  s = s.replace(/,\s*$/, "");

  // Pass 3: track nesting order with a stack, close in reverse
  const stack: string[] = [];
  inString = false;
  escape = false;
  for (const ch of s) {
    if (escape) { escape = false; continue; }
    if (ch === "\\") { escape = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (ch === "{") stack.push("}");
    else if (ch === "[") stack.push("]");
    else if (ch === "}" || ch === "]") stack.pop();
  }

  // Close in reverse nesting order (e.g. { [ { → } ] } not ] } })
  while (stack.length > 0) s += stack.pop();
  return s;
}

function tryParse(content: string): Record<string, unknown> | null {
  try {
    const v = JSON.parse(content);
    if (v && typeof v === "object") return v as Record<string, unknown>;
    return null;
  } catch { return null; }
}

/** Map from ContentType to the expected top-level JSON key */
const CONTENT_KEY: Record<ContentType, string> = {
  post_ideas: "ideas",
  captions: "captions",
  calendar: "calendar",
  scripts: "scripts",
  carousels: "carousels",
  bio: "bios",
};

/**
 * Normalize parsed JSON: if the expected key is missing, try to find the
 * first array value and remap it under the expected key.
 */
function normalizeKeys(obj: Record<string, unknown>, expectedKey: string): Record<string, unknown> {
  if (obj[expectedKey] && Array.isArray(obj[expectedKey])) return obj;
  // Look for any array value in the object
  for (const [key, value] of Object.entries(obj)) {
    if (Array.isArray(value) && value.length > 0) {
      return { ...obj, [expectedKey]: value };
    }
  }
  return obj;
}

function parseJSON(text: string, contentType: ContentType): Record<string, unknown> {
  const expectedKey = CONTENT_KEY[contentType];
  console.log("[parseJSON v4] Input length:", text.length);
  console.log("[parseJSON v4] First 200:", text.slice(0, 200));
  console.log("[parseJSON v4] Last 200:", text.slice(-200));

  // Log the exact parse error for Strategy 1
  try {
    const v = JSON.parse(text.trim());
    if (v && typeof v === "object") {
      console.log("[parseJSON v4] Strategy 1 SUCCESS");
      if (Array.isArray(v)) return { [expectedKey]: v };
      return normalizeKeys(v as Record<string, unknown>, expectedKey);
    }
  } catch (e) {
    const msg = (e as Error).message;
    console.log("[parseJSON v4] Strategy 1 failed:", msg);
    // Log context around the error position
    const posMatch = msg.match(/position\s+(\d+)/i);
    if (posMatch) {
      const pos = parseInt(posMatch[1]);
      console.log("[parseJSON v4] Error at position", pos, "context:", JSON.stringify(text.slice(Math.max(0, pos - 30), pos + 30)));
    }
    // Log hex of last 20 chars to detect invisible characters
    console.log("[parseJSON v4] Last 20 chars hex:", Array.from(text.slice(-20)).map(c => c.charCodeAt(0).toString(16).padStart(4, '0')).join(' '));
  }

  // Strategy 1 alt: repair then parse (handles truncated JSON)
  const earlyRepaired = repairJSON(text.trim());
  const repairedResult = tryParse(earlyRepaired);
  if (repairedResult) {
    console.log("[parseJSON v4] Strategy 1-repair SUCCESS");
    if (Array.isArray(repairedResult)) return { [expectedKey]: repairedResult };
    return normalizeKeys(repairedResult, expectedKey);
  }

  // Strategy 2: direct parse (maybe it's clean JSON)
  const direct = tryParse(text.trim());
  if (direct) {
    if (Array.isArray(direct)) return { [expectedKey]: direct };
    return normalizeKeys(direct, expectedKey);
  }

  // Strategy 2: extract {...} or [...] directly from text
  const braceMatch = text.match(/(\{[\s\S]*\})/);
  if (braceMatch) {
    const r = tryParse(braceMatch[1].trim());
    if (r) {
      if (Array.isArray(r)) return { [expectedKey]: r };
      return normalizeKeys(r, expectedKey);
    }
  }
  const bracketMatch = text.match(/(\[[\s\S]*\])/);
  if (bracketMatch) {
    const r = tryParse(bracketMatch[1].trim());
    if (r && Array.isArray(r)) return { [expectedKey]: r };
  }

  // Strategy 3: extract from markdown code blocks
  const codeMatch =
    text.match(/```(?:json)?\s*([\s\S]*?)```/) ||
    text.match(/```(?:json)?\s*([\s\S]*)```/);
  if (codeMatch) {
    const content = codeMatch[1].trim();
    const r = tryParse(content);
    if (r) {
      if (Array.isArray(r)) return { [expectedKey]: r };
      return normalizeKeys(r, expectedKey);
    }
    const r2 = tryParse(`{${content}}`);
    if (r2) return normalizeKeys(r2, expectedKey);
  }

  // Strategy 4: repair truncated JSON
  let raw = text.replace(/^```(?:json)?\s*/, "").replace(/```\s*$/, "").trim();
  const repairedDirect = repairJSON(raw);
  const rd = tryParse(repairedDirect);
  if (rd) {
    if (Array.isArray(rd)) return { [expectedKey]: rd };
    return normalizeKeys(rd, expectedKey);
  }
  if (!raw.startsWith("{") && !raw.startsWith("[")) {
    raw = `{${raw}`;
  }
  const repaired = repairJSON(raw);
  const r = tryParse(repaired);
  if (r) {
    if (Array.isArray(r)) return { [expectedKey]: r };
    return normalizeKeys(r, expectedKey);
  }

  // Last resort — throw so caller falls back to raw
  throw new Error("Could not parse AI response as JSON");
}

export async function generateContentAI(
  input: ContentGeneratorInput,
): Promise<ContentResult> {
  const promptFn = CONTENT_PROMPTS[input.contentType];
  if (!promptFn) {
    throw new Error(`Unknown content type: ${input.contentType}`);
  }

  const prompt = promptFn(input);

  const response = await aiChat(prompt, {
    temperature: 0.8,
    maxTokens: 8192,
    timeout: 120000,
    jsonMode: true,
  });

  if (!response) {
    throw new Error(
      "All AI providers failed. Check your API keys in Settings.",
    );
  }

  console.log("[ContentGen v2] Provider:", response.provider);
  console.log("[ContentGen v2] Raw text (first 800 chars):", response.text.slice(0, 800));

  try {
    const data = parseJSON(response.text, input.contentType);
    const expectedKey = CONTENT_KEY[input.contentType];
    console.log("[ContentGen v2] Parse SUCCESS. Keys:", Object.keys(data));
    console.log("[ContentGen v2] Expected key present:", expectedKey, "→", !!data[expectedKey]);
    return { data, provider: response.provider, tokensUsed: response.tokensUsed, costCents: response.costCents };
  } catch (parseErr) {
    console.error("[ContentGen v2] Parse FAILED:", parseErr);
    console.log("[ContentGen v2] Falling back to raw. Full text length:", response.text.length);
    return {
      data: { raw: response.text },
      provider: response.provider,
      tokensUsed: response.tokensUsed,
      costCents: response.costCents,
    };
  }
}
