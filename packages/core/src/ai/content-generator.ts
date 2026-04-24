/**
 * Go Virall Content Generator — AI-powered content creation.
 * 4 content types: post ideas, captions, scripts, bio.
 */

import { aiChat } from './provider';
import { getCharLimitNote, getContentFormats } from './platform-limits';

export type ContentType =
  | 'post_ideas'
  | 'captions'
  | 'scripts'
  | 'bio';

export type PrimaryGoal =
  | 'grow-audience'
  | 'monetize'
  | 'launch-product'
  | 'community'
  | 'land-deals';

export interface ContentGeneratorInput {
  platform: string;
  contentType: ContentType;
  topic: string;
  tone: string;
  count: number;
  primaryGoal?: PrimaryGoal | null;
  platformHandle?: string | null;
  followerCount?: number | null;
}

export interface ContentResult {
  data: Record<string, unknown>;
  provider: string;
  tokensUsed?: number;
  costCents?: number;
}

/** Content-generation directive tuned to each user-level mission. */
const GOAL_DIRECTIVES: Record<PrimaryGoal, string> = {
  'grow-audience':
    'GOAL — GROW AUDIENCE: Prioritize hooks that maximize reach, shareability, and discovery. Favor formats the algorithm pushes to non-followers. Captions should end with discovery-friendly CTAs.',
  monetize:
    'GOAL — MONETIZE: Prioritize content that builds commercial trust and positions the creator for brand deals. Include clear CTAs to a link-in-bio, product, or offer.',
  'launch-product':
    'GOAL — LAUNCH PRODUCT: Build anticipation content, behind-the-scenes, and launch countdowns. Every piece should drive curiosity about the upcoming product.',
  community:
    'GOAL — BUILD COMMUNITY: Prioritize content that sparks conversation and engagement. Use questions, polls, and "tag someone who" style hooks. Favor depth over virality.',
  'land-deals':
    'GOAL — LAND DEALS: Demonstrate expertise and audience quality. Create content that showcases niche authority and engaged audience metrics that brands want to see.',
};

function goalDirective(primaryGoal?: PrimaryGoal | null): string {
  if (!primaryGoal) return '';
  const directive = GOAL_DIRECTIVES[primaryGoal];
  return directive ? `\n\n${directive}` : '';
}

function profileContext(input: ContentGeneratorInput): string {
  const parts: string[] = [`PLATFORM: ${input.platform}`];
  if (input.platformHandle) parts.push(`HANDLE: @${input.platformHandle}`);
  if (input.followerCount) parts.push(`FOLLOWERS: ${input.followerCount.toLocaleString()}`);
  return parts.join('\n');
}

const CONTENT_PROMPTS: Record<ContentType, (input: ContentGeneratorInput) => string> = {
  post_ideas: (input) => `You are a viral content strategist. Generate ${input.count} post ideas.

${profileContext(input)}

TOPIC/THEME: ${input.topic}
TONE: ${input.tone}
${getCharLimitNote(input.platform, 'caption')}${goalDirective(input.primaryGoal)}

Generate exactly ${input.count} post ideas. For each idea include:
- title: Catchy post title (5-10 words)
- hook: Opening hook line that grabs attention
- angle: The unique perspective or angle
- format: Recommended format — choose from: ${getContentFormats(input.platform).join(', ')}
- hashtags: Array of 5 relevant hashtags (with #)
- estimatedEngagement: "high", "medium", or "low"

IMPORTANT: Respond ONLY with valid, complete JSON. No markdown, no explanation, no emojis. Just the JSON object: { "ideas": [...] }`,

  captions: (input) => `You are a social media copywriter who crafts viral captions. Generate ${input.count} captions.

${profileContext(input)}

TOPIC/THEME: ${input.topic}
TONE: ${input.tone}
${getCharLimitNote(input.platform, 'caption')}${goalDirective(input.primaryGoal)}

Generate exactly ${input.count} ready-to-post captions. For each caption include:
- text: The full caption text (engaging, ${input.tone} tone, include line breaks for readability, no emojis). MUST respect the platform character limit.
- callToAction: A compelling CTA at the end
- hashtags: Array of 5-8 relevant hashtags (with #)
- tone: The tone achieved
- estimatedLength: "short" (<100 chars), "medium" (100-300 chars), or "long" (300+ chars)

IMPORTANT: Respond ONLY with valid, complete JSON. No markdown, no explanation, no emojis. Just the JSON object: { "captions": [...] }`,

  scripts: (input) => `You are a video script writer for social media. Generate ${input.count} short-form video scripts.

${profileContext(input)}

TOPIC/THEME: ${input.topic}
TONE: ${input.tone}${goalDirective(input.primaryGoal)}

Generate exactly ${input.count} scripts optimized for ${input.platform}. For each script include:
- title: Script title
- hook: Opening hook (first 3 seconds — most critical)
- body: Main content (keep punchy, ${input.tone} tone)
- callToAction: Closing CTA
- duration: Estimated duration (e.g. "30s", "60s", "90s")
- visualNotes: Brief notes on visuals/b-roll suggestions

IMPORTANT: Respond ONLY with valid, complete JSON. No markdown, no explanation, no emojis. Just the JSON object: { "scripts": [...] }`,

  bio: (input) => `You are a social media branding expert. Generate ${input.count} optimized bio options.

${profileContext(input)}

TOPIC/THEME: ${input.topic}
TONE: ${input.tone}
${getCharLimitNote(input.platform, 'bio')}${goalDirective(input.primaryGoal)}

Generate exactly ${input.count} bio variations optimized for discovery and conversion. For each bio include:
- text: The full bio text (MUST respect the platform character limit, use line breaks, no emojis)
- style: The style approach (e.g. "Professional", "Creative", "Minimalist", "Authority", "Approachable")
- callToAction: The CTA included in the bio (no emojis)
- keywords: Array of SEO/discovery keywords used

IMPORTANT: Respond ONLY with valid, complete JSON. No markdown, no explanation, no emojis. Just the JSON object: { "bios": [...] }`,
};

/** Map from ContentType to the expected top-level JSON key */
const CONTENT_KEY: Record<ContentType, string> = {
  post_ideas: 'ideas',
  captions: 'captions',
  scripts: 'scripts',
  bio: 'bios',
};

/**
 * Attempt to repair truncated JSON by closing unclosed strings,
 * removing trailing incomplete values, and closing open brackets/braces.
 */
function repairJSON(text: string): string {
  let s = text;

  // Fix unquoted hashtag values
  s = s.replace(/([,\[])(\s*)#([A-Za-z0-9_]+)"/g, '$1$2"#$3"');

  // Detect unclosed strings
  let inString = false;
  let escape = false;
  for (const ch of s) {
    if (escape) {
      escape = false;
      continue;
    }
    if (ch === '\\') {
      escape = true;
      continue;
    }
    if (ch === '"') {
      inString = !inString;
      continue;
    }
  }
  if (inString) s += '"';

  // Remove trailing incomplete key-value pairs / trailing commas
  s = s.replace(/,\s*"[^"]*"\s*:\s*"[^"]*"\s*$/, '');
  s = s.replace(/,\s*"[^"]*"\s*:\s*"[^"]*$/, '');
  s = s.replace(/,\s*"[^"]*"\s*:\s*\[[^\]]*$/, '');
  s = s.replace(/,\s*"[^"]*"\s*:\s*$/, '');
  s = s.replace(/,\s*"[^"]*"\s*$/, '');
  s = s.replace(/,\s*$/, '');

  // Track nesting, close in reverse
  const stack: string[] = [];
  inString = false;
  escape = false;
  for (const ch of s) {
    if (escape) {
      escape = false;
      continue;
    }
    if (ch === '\\') {
      escape = true;
      continue;
    }
    if (ch === '"') {
      inString = !inString;
      continue;
    }
    if (inString) continue;
    if (ch === '{') stack.push('}');
    else if (ch === '[') stack.push(']');
    else if (ch === '}' || ch === ']') stack.pop();
  }
  while (stack.length > 0) s += stack.pop();
  return s;
}

function tryParse(content: string): Record<string, unknown> | null {
  try {
    const v = JSON.parse(content);
    if (v && typeof v === 'object') return v as Record<string, unknown>;
    return null;
  } catch {
    return null;
  }
}

function normalizeKeys(
  obj: Record<string, unknown>,
  expectedKey: string,
): Record<string, unknown> {
  if (obj[expectedKey] && Array.isArray(obj[expectedKey])) return obj;
  for (const [, value] of Object.entries(obj)) {
    if (Array.isArray(value) && value.length > 0) {
      return { ...obj, [expectedKey]: value };
    }
  }
  return obj;
}

function parseJSON(text: string, contentType: ContentType): Record<string, unknown> {
  const expectedKey = CONTENT_KEY[contentType];

  // Strip think tags if present
  const cleaned = text.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();

  // Strategy 1: direct parse
  const direct = tryParse(cleaned);
  if (direct) {
    if (Array.isArray(direct)) return { [expectedKey]: direct };
    return normalizeKeys(direct, expectedKey);
  }

  // Strategy 1b: repair then parse
  const repaired1 = repairJSON(cleaned);
  const r1 = tryParse(repaired1);
  if (r1) {
    if (Array.isArray(r1)) return { [expectedKey]: r1 };
    return normalizeKeys(r1, expectedKey);
  }

  // Strategy 2: extract {...} or [...]
  const braceMatch = cleaned.match(/(\{[\s\S]*\})/);
  if (braceMatch) {
    const r = tryParse(braceMatch[1].trim());
    if (r) {
      if (Array.isArray(r)) return { [expectedKey]: r };
      return normalizeKeys(r, expectedKey);
    }
  }
  const bracketMatch = cleaned.match(/(\[[\s\S]*\])/);
  if (bracketMatch) {
    const r = tryParse(bracketMatch[1].trim());
    if (r && Array.isArray(r)) return { [expectedKey]: r };
  }

  // Strategy 3: extract from markdown code blocks
  const codeMatch =
    cleaned.match(/```(?:json)?\s*([\s\S]*?)```/) ||
    cleaned.match(/```(?:json)?\s*([\s\S]*)```/);
  if (codeMatch) {
    const content = codeMatch[1].trim();
    const r = tryParse(content);
    if (r) {
      if (Array.isArray(r)) return { [expectedKey]: r };
      return normalizeKeys(r, expectedKey);
    }
  }

  // Strategy 4: repair truncated JSON
  let raw = cleaned.replace(/^```(?:json)?\s*/, '').replace(/```\s*$/, '').trim();
  if (!raw.startsWith('{') && !raw.startsWith('[')) {
    raw = `{${raw}`;
  }
  const repaired = repairJSON(raw);
  const r = tryParse(repaired);
  if (r) {
    if (Array.isArray(r)) return { [expectedKey]: r };
    return normalizeKeys(r, expectedKey);
  }

  throw new Error('Could not parse AI response as JSON');
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
    throw new Error('All AI providers failed. Check your API keys in Settings.');
  }

  try {
    const data = parseJSON(response.text, input.contentType);
    return {
      data,
      provider: response.provider,
      tokensUsed: response.tokensUsed,
      costCents: response.costCents,
    };
  } catch {
    // Fallback to raw text
    return {
      data: { raw: response.text },
      provider: response.provider,
      tokensUsed: response.tokensUsed,
      costCents: response.costCents,
    };
  }
}
