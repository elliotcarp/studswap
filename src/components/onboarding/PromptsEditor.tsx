"use client";

// "Write your profile answers": pick at least 2 unique prompts and answer
// each, Hinge-style. Starts with the minimum number of slots and lets you
// add more (up to the size of the prompt bank) or remove optional ones.

import { useState } from "react";
import { MAX_PROMPT_COUNT, MIN_PROMPT_COUNT, PROMPTS } from "@/lib/prompts";
import type { PromptAnswer } from "@/types";

export default function PromptsEditor({
  prompts,
  onChange,
}: {
  prompts: PromptAnswer[];
  onChange: (prompts: PromptAnswer[]) => void;
}) {
  // How many slots are visible has to be tracked separately from how many
  // have data: an empty slot added via "Add another prompt" has nothing to
  // send in onChange yet, so slot count can't just be derived from
  // prompts.length (that was the bug: a freshly added empty slot got
  // filtered back out before it ever got a chance to render).
  const [slotCount, setSlotCount] = useState(() => Math.max(MIN_PROMPT_COUNT, prompts.length));
  const slots: PromptAnswer[] = Array.from({ length: slotCount }, (_, i) => prompts[i] ?? { question: "", answer: "" });

  function updateSlot(index: number, next: PromptAnswer) {
    const updated = slots.map((slot, i) => (i === index ? next : slot));
    onChange(updated.filter((slot) => slot.question || slot.answer));
  }

  function removeSlot(index: number) {
    setSlotCount((n) => Math.max(MIN_PROMPT_COUNT, n - 1));
    onChange(slots.filter((_, i) => i !== index).filter((slot) => slot.question || slot.answer));
  }

  function addSlot() {
    setSlotCount((n) => Math.min(MAX_PROMPT_COUNT, n + 1));
  }

  return (
    <div className="flex flex-col gap-5">
      {slots.map((slot, index) => {
        const takenElsewhere = slots
          .filter((_, i) => i !== index)
          .map((s) => s.question);
        const availableOptions = PROMPTS.filter(
          (p) => p === slot.question || !takenElsewhere.includes(p)
        );

        return (
          <div key={index} className="flex flex-col gap-2 rounded-xl border border-gray-200 p-3">
            <div className="flex items-center justify-between">
              {index >= MIN_PROMPT_COUNT ? (
                <p className="text-xs text-gray-400">Optional</p>
              ) : (
                <span />
              )}
              {index >= MIN_PROMPT_COUNT && (
                <button
                  type="button"
                  onClick={() => removeSlot(index)}
                  className="text-xs font-medium text-gray-400"
                >
                  Remove
                </button>
              )}
            </div>
            <select
              value={slot.question}
              onChange={(e) => updateSlot(index, { question: e.target.value, answer: slot.answer })}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-400"
            >
              <option value="">Select a prompt</option>
              {availableOptions.map((prompt) => (
                <option key={prompt} value={prompt}>
                  {prompt}
                </option>
              ))}
            </select>
            <textarea
              value={slot.answer}
              onChange={(e) => updateSlot(index, { question: slot.question, answer: e.target.value })}
              disabled={!slot.question}
              rows={2}
              maxLength={300}
              placeholder={slot.question ? "Your answer" : "Pick a prompt first"}
              className="rounded-lg border border-gray-300 px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-gray-400 disabled:bg-gray-50 disabled:text-gray-400"
            />
          </div>
        );
      })}
      {slotCount < MAX_PROMPT_COUNT && (
        <button
          type="button"
          onClick={addSlot}
          className="rounded-lg border border-dashed border-gray-300 py-2.5 text-sm font-medium text-gray-500"
        >
          + Add another prompt
        </button>
      )}
    </div>
  );
}
