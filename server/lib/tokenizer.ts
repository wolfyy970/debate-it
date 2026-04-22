import { getEncoding } from 'js-tiktoken';

// Map model IDs to tiktoken encodings
// cl100k_base covers GPT-4, GPT-3.5, Claude, and most modern models
// p50k_base covers older GPT-3 models
const MODEL_TO_ENCODING: Record<string, string> = {
  // OpenAI
  'openai/gpt-5': 'cl100k_base',
  'openai/gpt-5-pro': 'cl100k_base',
  'openai/gpt-5-mini': 'cl100k_base',
  'openai/o3-pro': 'cl100k_base',
  'openai/gpt-5.1': 'cl100k_base',
  'openai/gpt-5.2': 'cl100k_base',
  'openai/gpt-5.3-codex': 'cl100k_base',
  'openai/gpt-5.4': 'cl100k_base',
  
  // Anthropic
  'anthropic/claude-opus-4': 'cl100k_base',
  'anthropic/claude-sonnet-4': 'cl100k_base',
  'anthropic/claude-opus-4.5': 'cl100k_base',
  'anthropic/claude-sonnet-4.5': 'cl100k_base',
  
  // Google
  'google/gemini-2.5-pro': 'cl100k_base',
  'google/gemini-2.5-pro-preview': 'cl100k_base',
  'google/gemini-2.5-flash': 'cl100k_base',
  'google/gemini-2.5-flash-lite': 'cl100k_base',
  'google/gemini-3.1-pro-preview': 'cl100k_base',
  'google/gemini-3.1-flash-image-preview': 'cl100k_base',
  
  // xAI
  'x-ai/grok-4': 'cl100k_base',
  'x-ai/grok-3': 'cl100k_base',
  'x-ai/grok-3-mini': 'cl100k_base',
  'x-ai/grok-4-fast': 'cl100k_base',
  
  // DeepSeek
  'deepseek/deepseek-r1-0528': 'cl100k_base',
  'deepseek/deepseek-v3.2': 'cl100k_base',
  'deepseek/deepseek-chat-v3.1': 'cl100k_base',
  
  // Mistral
  'mistralai/mistral-medium-3': 'cl100k_base',
  'mistralai/mistral-small-3.2-24b-instruct': 'cl100k_base',
  'mistralai/devstral-medium': 'cl100k_base',
  'mistralai/devstral-small': 'cl100k_base',
  'mistralai/mistral-large-2512': 'cl100k_base',
  
  // Qwen
  'qwen/qwen3-235b-a22b-2507': 'cl100k_base',
  'qwen/qwen3-235b-a22b-thinking-2507': 'cl100k_base',
  'qwen/qwen3-coder': 'cl100k_base',
  'qwen/qwen3-30b-a3b': 'cl100k_base',
  'qwen/qwen3-14b': 'cl100k_base',
  'qwen/qwen3.6-plus': 'cl100k_base',
  
  // Moonshot / Kimi
  'moonshotai/kimi-k2': 'cl100k_base',
  'moonshotai/kimi-k2-thinking': 'cl100k_base',
  'moonshotai/kimi-k2.5': 'cl100k_base',
  'moonshotai/kimi-k2.6': 'cl100k_base',
};

const encoders = new Map<string, ReturnType<typeof getEncoding>>();

function getEncoder(encodingName: string): ReturnType<typeof getEncoding> {
  if (!encoders.has(encodingName)) {
    encoders.set(encodingName, getEncoding(encodingName));
  }
  return encoders.get(encodingName)!;
}

export function countTokens(text: string, model: string): number {
  try {
    const encodingName = MODEL_TO_ENCODING[model] || 'cl100k_base';
    const encoder = getEncoder(encodingName);
    const tokens = encoder.encode(text);
    return tokens.length;
  } catch (error) {
    // Fallback: approximate with character count / 4
    console.warn(`Token counting failed for model ${model}, using approximation:`, error);
    return Math.ceil(text.length / 4);
  }
}

export function countMessagesTokens(
  messages: { role: string; content: string }[],
  model: string
): number {
  let total = 0;
  for (const message of messages) {
    total += countTokens(message.content, model);
    // Add overhead for role formatting (~4 tokens per message)
    total += 4;
  }
  return total;
}
