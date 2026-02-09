import Anthropic from "@anthropic-ai/sdk";

export function getAnthropicClient() {
  return new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });
}

// Re-export shared AI prompt utilities so existing imports from "@/lib/ai" keep working
export {
  parsePageText,
  getRelevantContext,
  buildExplainSystemPrompt,
  buildChatSystemPrompt,
  buildVisionSystemPrompt,
  getRelevantContextForPages,
} from "@cookednote/shared/lib/ai-prompts";
