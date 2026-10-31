import { z } from "zod";
import { invokeLLM } from "./_core/llm";

export const browserPlanStepSchema = z.object({
  type: z.enum(["navigate", "observe", "focus", "type", "click", "scroll", "extract", "wait", "verify"]),
  label: z.string().min(1).max(90),
  reason: z.string().min(1).max(180),
  url: z.string().max(500).optional(),
  selector: z.string().max(500).optional(),
  text: z.string().max(500).optional(),
  direction: z.enum(["up", "down"]).optional(),
  amount: z.number().min(100).max(1400).optional(),
  ms: z.number().min(250).max(5000).optional(),
});

export const browserPlanSchema = z.object({
  summary: z.string().min(1).max(180),
  steps: z.array(browserPlanStepSchema).min(2).max(12),
});

export type BrowserPlan = z.infer<typeof browserPlanSchema>;

const plannerSystem = `You are the planning engine for Orange Agent, a transparent browser automation assistant.
Turn the user's goal into a practical, ordered browser plan. The plan will be executed by a Chrome extension on the user's active tab, so prefer visible, reversible actions and explain why each step exists.

Rules:
- Return JSON only with {summary, steps}.
- Use 2 to 12 steps.
- Use only these step types: navigate, observe, focus, type, click, scroll, extract, wait, verify.
- For a research request, open a relevant public research/search website, search the user's exact goal, inspect results, extract useful information, and verify the result is relevant.
- For shopping/comparison requests, include search, opening or comparing useful results, extracting prices/features, and a verification step.
- For forms, include navigation, focus, type, review/verify, and never submit irreversible actions without an explicit user instruction.
- Use realistic CSS selectors when a page is known (Google search uses textarea[name='q'], input[name='q']; generic pages can use input, textarea, button).
- If the goal does not specify a URL, use a relevant public search URL such as https://www.google.com/.
- Never invent a completed answer. Plan the browser work needed to obtain it.
- Keep labels short and plain-language. Keep reasons specific.`;

function extractText(result: Awaited<ReturnType<typeof invokeLLM>>) {
  const content = result.choices?.[0]?.message?.content;
  if (Array.isArray(content)) return content.map((part) => part.type === "text" ? part.text : "").join("");
  return content ?? "";
}

function parsePlan(raw: string): BrowserPlan {
  const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  const candidate = start >= 0 && end > start ? cleaned.slice(start, end + 1) : cleaned;
  return browserPlanSchema.parse(JSON.parse(candidate));
}

export async function createBrowserPlan(goal: string, currentUrl?: string): Promise<BrowserPlan> {
  const result = await invokeLLM({
    model: "gpt-5-mini",
    messages: [
      { role: "system", content: plannerSystem },
      {
        role: "user",
        content: JSON.stringify({
          goal,
          currentUrl: currentUrl || "about:blank",
          instruction: "Create the complete multi-step browser plan now. Include enough steps to accomplish the goal, not just a single search.",
        }),
      },
    ],
    maxTokens: 2400,
    responseFormat: { type: "json_object" },
  });

  const raw = extractText(result);
  if (!raw) throw new Error("The planner returned no plan");
  return parsePlan(raw);
}
