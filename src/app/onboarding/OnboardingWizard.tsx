"use client";

// Hinge-style multi-step onboarding: one field (or group) per full-screen step,
// with a progress-dot header and a circular next/back nav, like Hinge's own
// account-setup flow (see reference screenshots) but for a flat-swap profile
// instead of a dating profile.

import { useState } from "react";
import { useRouter } from "next/navigation";
import CityPicker from "@/components/CityPicker";
import { EUROPEAN_CITIES } from "@/lib/cities";
import ChipSelect from "@/components/onboarding/ChipSelect";
import PhotoGridEditor from "@/components/onboarding/PhotoGridEditor";
import PromptsEditor from "@/components/onboarding/PromptsEditor";
import {
  YEAR_OF_STUDY_OPTIONS,
  SMOKER_OPTIONS,
  PETS_OPTIONS,
  ACCOMMODATES_OPTIONS,
  MIN_SELF_PHOTO_COUNT,
  MAX_SELF_PHOTO_COUNT,
  MIN_FLAT_PHOTO_COUNT,
  MAX_FLAT_PHOTO_COUNT,
} from "@/lib/onboardingOptions";
import { MIN_PROMPT_COUNT } from "@/lib/prompts";
import type { ProfileFormData } from "@/types";

const EMPTY_PROFILE: ProfileFormData = {
  name: "",
  age: "",
  university: "",
  program: "",
  yearOfStudy: "",
  homeCity: "",
  address: "",
  availableFrom: "",
  availableTo: "",
  accommodates: "",
  pricePerDayCents: "",
  smoker: "",
  pets: "",
  selfPhotoUrls: [],
  flatPhotoUrls: [],
  selfDescription: "",
  flatDescription: "",
  prompts: [],
};

type SetField = <K extends keyof ProfileFormData>(key: K, value: ProfileFormData[K]) => void;

interface StepDef {
  icon: string;
  title: string;
  subtitle?: string;
  render: (data: ProfileFormData, setField: SetField) => React.ReactNode;
  isValid: (data: ProfileFormData) => boolean;
}

function textInputStep(
  field: keyof ProfileFormData,
  icon: string,
  title: string,
  placeholder: string
): StepDef {
  return {
    icon,
    title,
    render: (data, setField) => (
      <input
        autoFocus
        value={data[field] as string}
        onChange={(e) => setField(field, e.target.value as never)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-gray-300 px-4 py-3 text-lg focus:outline-none focus:ring-2 focus:ring-gray-400"
      />
    ),
    isValid: (data) => (data[field] as string).trim().length > 0,
  };
}

function textAreaStep(
  field: keyof ProfileFormData,
  icon: string,
  title: string,
  placeholder: string,
  subtitle?: string
): StepDef {
  return {
    icon,
    title,
    subtitle,
    render: (data, setField) => (
      <textarea
        autoFocus
        rows={6}
        maxLength={1000}
        value={data[field] as string}
        onChange={(e) => setField(field, e.target.value as never)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-gray-300 px-4 py-3 text-lg focus:outline-none focus:ring-2 focus:ring-gray-400"
      />
    ),
    isValid: (data) => (data[field] as string).trim().length > 0,
  };
}

function chipStep(
  field: keyof ProfileFormData,
  icon: string,
  title: string,
  options: string[]
): StepDef {
  return {
    icon,
    title,
    render: (data, setField) => (
      <ChipSelect
        options={options}
        value={data[field] as string}
        onChange={(value) => setField(field, value as never)}
      />
    ),
    isValid: (data) => (data[field] as string).length > 0,
  };
}

const MIN_AGE = 16;
const MAX_AGE = 99;

const STEPS: StepDef[] = [
  textInputStep("name", "👤", "What's your name?", "Your name"),
  {
    icon: "🎂",
    title: "How old are you?",
    render: (data, setField) => (
      <input
        type="number"
        autoFocus
        inputMode="numeric"
        min={MIN_AGE}
        max={MAX_AGE}
        value={data.age}
        onChange={(e) => setField("age", e.target.value)}
        placeholder="Age"
        className="w-full rounded-lg border border-gray-300 px-4 py-3 text-lg focus:outline-none focus:ring-2 focus:ring-gray-400"
      />
    ),
    isValid: (data) => {
      const age = Number(data.age);
      return Number.isInteger(age) && age >= MIN_AGE && age <= MAX_AGE;
    },
  },
  textInputStep("university", "🎓", "Where do you study?", "e.g. EPFL"),
  textInputStep("program", "📚", "What's your field of study?", "e.g. Computer Science"),
  chipStep("yearOfStudy", "🏫", "What year are you in?", YEAR_OF_STUDY_OPTIONS),
  {
    icon: "🏠",
    title: "Where's your flat?",
    subtitle: "Pick your city from the list. This keeps location filtering exact.",
    render: (data, setField) => (
      <CityPicker value={data.homeCity} onChange={(city) => setField("homeCity", city)} />
    ),
    isValid: (data) => EUROPEAN_CITIES.includes(data.homeCity),
  },
  {
    icon: "📍",
    title: "What's the exact address?",
    subtitle: "Optional for now. Only shown to someone once you've matched, never on your public card.",
    render: (data, setField) => (
      <input
        autoFocus
        value={data.address}
        onChange={(e) => setField("address", e.target.value)}
        placeholder="Street and number"
        className="w-full rounded-lg border border-gray-300 px-4 py-3 text-lg focus:outline-none focus:ring-2 focus:ring-gray-400"
      />
    ),
    isValid: () => true,
  },
  {
    icon: "📅",
    title: "When are you available from?",
    render: (data, setField) => (
      <input
        type="date"
        autoFocus
        value={data.availableFrom}
        onChange={(e) => setField("availableFrom", e.target.value)}
        className="w-full rounded-lg border border-gray-300 px-4 py-3 text-lg focus:outline-none focus:ring-2 focus:ring-gray-400"
      />
    ),
    isValid: (data) => data.availableFrom.length > 0,
  },
  {
    icon: "📅",
    title: "Until when?",
    render: (data, setField) => (
      <input
        type="date"
        autoFocus
        min={data.availableFrom || undefined}
        value={data.availableTo}
        onChange={(e) => setField("availableTo", e.target.value)}
        className="w-full rounded-lg border border-gray-300 px-4 py-3 text-lg focus:outline-none focus:ring-2 focus:ring-gray-400"
      />
    ),
    isValid: (data) => data.availableTo.length > 0 && data.availableTo > data.availableFrom,
  },
  chipStep("accommodates", "👥", "How many people can your flat host?", ACCOMMODATES_OPTIONS),
  {
    icon: "💶",
    title: "Set a price for your flat, per day",
    subtitle:
      "In euros. StudSwap doesn't collect or move this money. It's only used to show the stay cost or fairness difference to a potential swap partner; you two settle it directly between yourselves.",
    render: (data, setField) => (
      <input
        type="number"
        autoFocus
        inputMode="numeric"
        min={1}
        max={1000}
        value={data.pricePerDayCents ? String(Number(data.pricePerDayCents) / 100) : ""}
        onChange={(e) => setField("pricePerDayCents", String(Math.round(Number(e.target.value) * 100)))}
        placeholder="e.g. 40 / day"
        className="w-full rounded-lg border border-gray-300 px-4 py-3 text-lg focus:outline-none focus:ring-2 focus:ring-gray-400"
      />
    ),
    isValid: (data) => {
      const price = Number(data.pricePerDayCents);
      return Number.isInteger(price) && price >= 100;
    },
  },
  chipStep("smoker", "🚬", "Do you smoke?", SMOKER_OPTIONS),
  chipStep("pets", "🐾", "Pets at home?", PETS_OPTIONS),
  textAreaStep(
    "selfDescription",
    "📝",
    "Describe yourself",
    "A bit about who you are, your habits, what you're like to share a home with…"
  ),
  textAreaStep(
    "flatDescription",
    "🏡",
    "Describe your flat",
    "What's it like, what's nearby, anything a swap partner should know…"
  ),
  {
    icon: "🖼️",
    title: "Add photos of you",
    subtitle: `At least ${MIN_SELF_PHOTO_COUNT}, up to ${MAX_SELF_PHOTO_COUNT}`,
    render: (data, setField) => (
      <PhotoGridEditor
        photoUrls={data.selfPhotoUrls}
        onChange={(urls) => setField("selfPhotoUrls", urls)}
        minCount={MIN_SELF_PHOTO_COUNT}
        maxCount={MAX_SELF_PHOTO_COUNT}
        markProfilePicture
      />
    ),
    isValid: (data) => data.selfPhotoUrls.length >= MIN_SELF_PHOTO_COUNT,
  },
  {
    icon: "🏡",
    title: "Add photos of your flat",
    subtitle: `At least ${MIN_FLAT_PHOTO_COUNT}, up to ${MAX_FLAT_PHOTO_COUNT}`,
    render: (data, setField) => (
      <PhotoGridEditor
        photoUrls={data.flatPhotoUrls}
        onChange={(urls) => setField("flatPhotoUrls", urls)}
        minCount={MIN_FLAT_PHOTO_COUNT}
        maxCount={MAX_FLAT_PHOTO_COUNT}
      />
    ),
    isValid: (data) => data.flatPhotoUrls.length >= MIN_FLAT_PHOTO_COUNT,
  },
  {
    icon: "💬",
    title: "Write your profile answers",
    subtitle: `${MIN_PROMPT_COUNT} required`,
    render: (data, setField) => (
      <PromptsEditor prompts={data.prompts} onChange={(prompts) => setField("prompts", prompts)} />
    ),
    isValid: (data) =>
      data.prompts.filter((p) => p.question && p.answer.trim().length > 0).length >= MIN_PROMPT_COUNT,
  },
];

export default function OnboardingWizard({ initialProfile }: { initialProfile?: ProfileFormData }) {
  const router = useRouter();
  const [stepIndex, setStepIndex] = useState(0);
  const [data, setData] = useState<ProfileFormData>(initialProfile ?? EMPTY_PROFILE);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const step = STEPS[stepIndex];
  const isLast = stepIndex === STEPS.length - 1;
  const canAdvance = step.isValid(data);

  const setField: SetField = (key, value) => setData((prev) => ({ ...prev, [key]: value }));

  async function handleNext() {
    if (!canAdvance) return;
    if (!isLast) {
      setStepIndex((i) => i + 1);
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      // A prompt slot can have a question picked but no answer typed yet (e.g.
      // the optional 3rd one), only complete prompts should ever be submitted.
      const payload = {
        ...data,
        prompts: data.prompts.filter((p) => p.question && p.answer.trim().length > 0),
      };
      const res = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        setError(body?.error ?? "Could not save your profile. Please check the form and try again.");
        setSubmitting(false);
        return;
      }
      router.push("/swipe");
    } catch {
      setError("Could not save your profile. Please try again.");
      setSubmitting(false);
    }
  }

  function handleBack() {
    if (stepIndex > 0) setStepIndex((i) => i - 1);
  }

  return (
    <div className="flex h-screen justify-center">
    <div className="flex h-full w-full max-w-lg flex-col p-6">
      <div className="mb-6 flex items-center gap-3">
        <button
          type="button"
          onClick={handleBack}
          aria-label="Back"
          className={`text-xl ${stepIndex === 0 ? "invisible" : ""}`}
        >
          ←
        </button>
        {/* "Torn perforations": done steps fill solid, the current step gets
            the one gradient pop on screen, upcoming steps stay dashed-outline
            (a ticket-stub tear-line) rather than plain gray dots, this is a
            genuine linear sequence, unlike the marketing sections, so a more
            specific progress device is earned here. */}
        <div className="flex flex-1 gap-1">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className={
                i < stepIndex
                  ? "h-1.5 flex-1 rounded-full bg-riviera"
                  : i === stepIndex
                    ? "h-1.5 flex-1 rounded-full bg-gradient-to-r from-bloom to-riviera"
                    : "h-1.5 flex-1 rounded-full border border-dashed border-gray-300"
              }
            />
          ))}
        </div>
      </div>

      {/* -mx-1/px-1 cancel out visually (outer edges land in the same place as an
          unpadded block) but give the focus ring's box-shadow a few pixels of
          room before this div's own overflow-y-auto clips the x-axis too. */}
      <div className="-mx-1 flex flex-1 flex-col overflow-y-auto px-1 [scrollbar-gutter:stable]">
        <span className="mb-3 text-3xl">{step.icon}</span>
        <h1 className="font-display text-2xl font-bold">{step.title}</h1>
        {step.subtitle && <p className="mb-2 text-sm text-gray-400">{step.subtitle}</p>}
        {/* Keyed on stepIndex so React remounts step.render's subtree fresh on
            every step change, instead of reusing the same component instance
            in the same tree position — without this, PhotoGridEditor (whose
            internal photo list is seeded once via useState, not synced to
            prop changes) kept showing the previous step's photos when moving
            from "Add photos of you" to "Add photos of your flat". */}
        <div className="mt-4" key={stepIndex}>{step.render(data, setField)}</div>
      </div>

      {error && <p className="mb-2 text-sm text-red-600">{error}</p>}

      <div className="flex justify-end">
        <button
          type="button"
          onClick={handleNext}
          disabled={!canAdvance || submitting}
          aria-label={isLast ? "Finish" : "Next"}
          className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-r from-bloom to-riviera text-2xl text-white shadow-lg shadow-bloom/30 disabled:opacity-40 disabled:shadow-none"
        >
          {submitting ? "…" : isLast ? "✓" : "→"}
        </button>
      </div>
    </div>
    </div>
  );
}
