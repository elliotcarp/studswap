// Prompt bank for Hinge-style profile answers. Pick at least 2, write a short answer to each.
export const PROMPTS: string[] = [
  "My flat in three words",
  "The neighborhood is known for...",
  "You'll love this place if...",
  "My ideal swap partner...",
  "Non-negotiable for whoever stays here...",
  "Best local spot near me",
  "What I'll miss most while I'm away",
  "A tip for surviving my city",
  "My flatmates would describe me as...",
  "Green flag in a swap",
  "Red flag in a swap (don't @ me)",
  "Sundays in my city look like...",
  "The one thing you must bring",
  "Ask me about my flat's...",
  "Why I'm doing a flat swap",
];

export const MIN_PROMPT_COUNT = 2;
export const MAX_PROMPT_COUNT = PROMPTS.length;
