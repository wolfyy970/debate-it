import type { ToolDefinition } from './types';

export const TOOL_DEFINITIONS: ToolDefinition[] = [
  {
    name: 'search_web',
    description:
      'Search the web for factual information, data, studies, or evidence. Use this when you need to verify claims, find statistics, or gather evidence for your argument.',
    parameters: {
      query: {
        type: 'string',
        description: 'A specific, focused search query. Be precise.',
      },
      reason: {
        type: 'string',
        description: 'Briefly explain what factual claim you are verifying or what evidence you need.',
      },
    },
    required: ['query', 'reason'],
  },
  {
    name: 'read_url',
    description:
      'Read the full content of a web page to get detailed information from a source. Use this when search results provide a promising URL but the snippet is insufficient.',
    parameters: {
      url: {
        type: 'string',
        description: 'The full URL to read',
      },
      reason: {
        type: 'string',
        description: 'Why you need to read this specific page',
      },
    },
    required: ['url', 'reason'],
  },
];
