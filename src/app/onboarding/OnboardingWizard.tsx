"use client";

// Hinge-style multi-step onboarding: one field (or group) per full-screen step,
// with a progress-dot header and a circular next/back nav, like Hinge's own
// account-setup flow (see reference screenshots) but for a flat-swap profile
// instead of a dating profile.
//
// Deliberately short: only what's essential to a usable listing (identity,
// city, dates, capacity, arrangement type, price, compliance) — everything
// else (address, smoker/pets, descriptions, photos, prompts, payment,
// room type, amenities, neighbourhood) is deferred to the post-entry
// completion checklist on /profile (see ProfileCompletionBanner) instead of
// blocking the student from reaching the app at all.

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { SPRING_QUICK, usePrefersReducedMotion } from "@/lib/motion";
import { estimateDayRateFromMonthlyRentCents } from "@/lib/pricing";
import CityPicker from "@/components/CityPicker";
import { EUROPEAN_CITIES } from "@/lib/cities";
import ChipSelect from "@/components/onboarding/ChipSelect";
import { Input } from "@/components/ui/Input";
import {
  YEAR_OF_STUDY_OPTIONS,
  ACCOMMODATES_OPTIONS,
  ARRANGEMENT_PREFERENCE_OPTIONS,
} from "@/lib/onboardingOptions";
import type { ProfileFormData } from "@/types";

// Fields not collected by this wizard (address, smoker/pets, descriptions,
// photos, prompts, room type, amenities, neighbourhood) start empty and are
// filled in later via the post-entry completion checklist on /profile —
// ProfileFormData still needs a value for all of them since it's the shared
// shape with the profile edit page.
const EMPTY_PROFILE: ProfileFormData = {
  name: "",
  age: "",
  university: "",
  program: "",
  yearOfStudy: "",
  homeCity: "",
  neighbourhood: "",
  address: "",
  availableFrom: "",
  availableTo: "",
  accommodates: "",
  roomType: "",
  amenities: [],
  pricePerDayCents: "",
  pricePerMonthCents: "",
  smoker: "",
  pets: "",
  arrangementPreference: "",
  selfPhotoUrls: [],
  flatPhotoUrls: [],
  flatVideoUrl: "",
  selfDescription: "",
  flatDescription: "",
  prompts: [],
  shortTermRentalRegistrationNumber: "",
  shortTermRentalRegistrationExempt: false,
};

type WizardData = ProfileFormData;
const EMPTY_WIZARD_DATA: WizardData = EMPTY_PROFILE;

type SetField = <K extends keyof WizardData>(key: K, value: WizardData[K]) => void;

interface StepDef {
  icon: string;
  title: string;
  // A function lets a later step's copy react to an earlier answer (e.g.
  // the price step explaining itself differently depending on the chosen
  // arrangement preference).
  subtitle?: string | ((data: WizardData) => string);
  render: (data: WizardData, setField: SetField) => React.ReactNode;
  isValid: (data: WizardData) => boolean;
}

function textInputStep(
  field: keyof WizardData,
  icon: string,
  title: string,
  placeholder: string
): StepDef {
  return {
    icon,
    title,
    render: (data, setField) => (
      <Input
        autoFocus
        value={data[field] as string}
        onChange={(e) => setField(field, e.target.value as never)}
        placeholder={placeholder}
        className="text-lg"
      />
    ),
    isValid: (data) => (data[field] as string).trim().length > 0,
  };
}

function chipStep(
  field: keyof WizardData,
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
      <Input
        type="number"
        autoFocus
        inputMode="numeric"
        min={MIN_AGE}
        max={MAX_AGE}
        value={data.age}
        onChange={(e) => setField("age", e.target.value)}
        placeholder="Age"
        className="text-lg"
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
    icon: "📅",
    title: "When's your flat available?",
    subtitle: "This is when YOUR flat is free for someone else to stay in it.",
    render: (data, setField) => (
      <div className="flex flex-col gap-4">
        <div>
          <label className="mb-1 block text-xs font-medium text-carbon-text">From</label>
          <Input
            type="date"
            autoFocus
            value={data.availableFrom}
            onChange={(e) => setField("availableFrom", e.target.value)}
            className="text-lg"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-carbon-text">To</label>
          <Input
            type="date"
            min={data.availableFrom || undefined}
            value={data.availableTo}
            onChange={(e) => setField("availableTo", e.target.value)}
            className="text-lg"
          />
        </div>
      </div>
    ),
    // Not skippable: a listing with no real availability window is unusable
    // (and used to get a fabricated placeholder range silently written to
    // it instead — see git history). Dates are essential, not optional.
    isValid: (data) =>
      data.availableFrom.length > 0 && data.availableTo.length > 0 && data.availableTo > data.availableFrom,
  },
  chipStep("accommodates", "👥", "How many people can your flat host?", ACCOMMODATES_OPTIONS),
  {
    icon: "🔁",
    title: "What are you open to?",
    subtitle:
      "A mutual swap: you stay at their place while they stay at yours. A paid stay: someone books your place directly, no swap back required.",
    render: (data, setField) => (
      <ChipSelect
        options={ARRANGEMENT_PREFERENCE_OPTIONS}
        value={data.arrangementPreference}
        onChange={(value) => setField("arrangementPreference", value)}
      />
    ),
    isValid: (data) => data.arrangementPreference.length > 0,
  },
  {
    icon: "💶",
    title: "What's a fair price?",
    subtitle: (data) =>
      data.arrangementPreference === "Mutual swap only"
        ? "Used only to calculate the fairness gap between your flat and a swap partner's — you're never charged or paid this directly, you just settle the difference between you."
        : data.arrangementPreference === "Paid stay only"
          ? "This is what you'll actually charge someone to book your place directly, paid person-to-person, StudSwap never touches it."
          : "For a swap, this is only used to calculate the fairness gap with a partner's place. For a paid stay, it's what you'll actually charge, person-to-person.",
    render: (data, setField) => (
      <div className="flex flex-col gap-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-carbon-text">
              Your monthly rent (optional, just to help estimate)
            </label>
            <Input
              type="number"
              autoFocus
              inputMode="numeric"
              min={1}
              max={20000}
              value={data.pricePerMonthCents ? String(Number(data.pricePerMonthCents) / 100) : ""}
              onChange={(e) =>
                setField(
                  "pricePerMonthCents",
                  e.target.value ? String(Math.round(Number(e.target.value) * 100)) : ""
                )
              }
              // Estimate on blur, once the full number's been typed, rather
              // than on every keystroke — computing it digit-by-digit would
              // lock in a nonsense estimate from whatever was typed first
              // (e.g. "9" before "900") and never revisit it. Only fills an
              // empty day price, so it never overwrites one the student
              // already reviewed or typed themselves.
              onBlur={() => {
                if (data.pricePerMonthCents && !data.pricePerDayCents) {
                  setField(
                    "pricePerDayCents",
                    String(estimateDayRateFromMonthlyRentCents(Number(data.pricePerMonthCents)))
                  );
                }
              }}
              placeholder="e.g. 900 / month"
              className="text-lg"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-carbon-text">Price per day</label>
            <Input
              type="number"
              inputMode="numeric"
              min={1}
              max={1000}
              value={data.pricePerDayCents ? String(Number(data.pricePerDayCents) / 100) : ""}
              onChange={(e) => setField("pricePerDayCents", String(Math.round(Number(e.target.value) * 100)))}
              placeholder="e.g. 40 / day"
              className="text-lg"
            />
            <p className="mt-1 text-xs text-gray-400">
              {data.pricePerMonthCents
                ? "Estimated from your rent above (roughly rent ÷ 30), adjust it if your situation is different."
                : "This is what's actually used for short stays. Enter your rent above and we'll suggest one."}
            </p>
          </div>
      </div>
    ),
    // Not skippable: a listing with no deliberately-set price used to get a
    // fabricated placeholder (€30/day) silently written to it instead — see
    // git history. A price is essential, not optional, even though it's
    // only ever used for display/settlement math, never charged by us.
    isValid: (data) => {
      const dayPrice = Number(data.pricePerDayCents);
      if (!Number.isInteger(dayPrice) || dayPrice < 100) return false;
      if (!data.pricePerMonthCents) return true;
      const monthPrice = Number(data.pricePerMonthCents);
      return Number.isInteger(monthPrice) && monthPrice >= 100;
    },
  },
  {
    icon: "📋",
    title: "Short-term rental registration",
    subtitle:
      "Some cities require a registration number for short-term stays, and this could be booked as a one-directional paid stay, not just a swap. Add yours, or tick exempt if your city doesn't require one.",
    render: (data, setField) => (
      <div className="flex flex-col gap-3">
        <Input
          autoFocus
          value={data.shortTermRentalRegistrationNumber}
          onChange={(e) => {
            setField("shortTermRentalRegistrationNumber", e.target.value);
            setField("shortTermRentalRegistrationExempt", false);
          }}
          disabled={data.shortTermRentalRegistrationExempt}
          placeholder="Registration number"
        />
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={data.shortTermRentalRegistrationExempt}
            onChange={(e) => {
              setField("shortTermRentalRegistrationExempt", e.target.checked);
              if (e.target.checked) setField("shortTermRentalRegistrationNumber", "");
            }}
          />
          My city doesn&apos;t require this
        </label>
      </div>
    ),
    isValid: (data) => data.shortTermRentalRegistrationExempt || data.shortTermRentalRegistrationNumber.trim().length > 0,
  },
];

export default function OnboardingWizard({ initialProfile }: { initialProfile?: WizardData }) {
  const router = useRouter();
  const [stepIndex, setStepIndex] = useState(0);
  // Which way the step transition should slide (skill §7: forward and back
  // must be mirror images of each other, not the same animation both ways).
  const [direction, setDirection] = useState<1 | -1>(1);
  const [data, setData] = useState<WizardData>(initialProfile ?? EMPTY_WIZARD_DATA);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const reducedMotion = usePrefersReducedMotion();

  const step = STEPS[stepIndex];
  const isLast = stepIndex === STEPS.length - 1;
  const canAdvance = step.isValid(data);

  const setField: SetField = (key, value) => setData((prev) => ({ ...prev, [key]: value }));

  async function handleNext() {
    if (!canAdvance) return;
    if (!isLast) {
      setDirection(1);
      setStepIndex((i) => i + 1);
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const profileRes = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!profileRes.ok) {
        const body = await profileRes.json().catch(() => null);
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
    if (stepIndex > 0) {
      setDirection(-1);
      setStepIndex((i) => i - 1);
    }
  }

  // Enter advances the step, matching the arrow button — but only from a
  // plain text-ish input, never a textarea (Enter should insert a newline
  // there, e.g. selfDescription/flatDescription) or a checkbox/button
  // (Enter/Space already has a native meaning on those, e.g. toggling the
  // registration-exempt checkbox or picking a payment method tile). On a
  // step with more than one input (e.g. price/day + price/month), Enter on
  // an earlier field moves to the next one instead of skipping the rest of
  // the step — only Enter on the last field actually advances.
  function handleKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (e.key !== "Enter") return;
    const target = e.target as HTMLElement;
    if (target.tagName !== "INPUT") return;
    const inputType = (target as HTMLInputElement).type;
    if (inputType === "checkbox" || inputType === "radio" || inputType === "file") return;
    e.preventDefault();
    const stepInputs = [...e.currentTarget.querySelectorAll('input:not([type="checkbox"])')];
    const nextInput = stepInputs[stepInputs.indexOf(target) + 1] as HTMLInputElement | undefined;
    if (nextInput) {
      nextInput.focus();
      return;
    }
    handleNext();
  }

  const stepVariants = {
    enter: (dir: 1 | -1) => (reducedMotion ? { opacity: 0 } : { opacity: 0, x: dir > 0 ? 24 : -24 }),
    center: { opacity: 1, x: 0 },
    exit: (dir: 1 | -1) => (reducedMotion ? { opacity: 0 } : { opacity: 0, x: dir > 0 ? -24 : 24 }),
  };

  return (
    <div className="app-bg flex h-screen justify-center">
    <div className="flex h-full w-full max-w-lg flex-col p-6" onKeyDown={handleKeyDown}>
      <div className="mb-6 flex items-center gap-3">
        <button
          type="button"
          onClick={handleBack}
          aria-label="Back"
          className={`text-xl transition-transform active:scale-90 ${stepIndex === 0 ? "invisible" : ""}`}
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
        <AnimatePresence mode="wait" custom={direction} initial={false}>
          {/* Keyed on stepIndex so React remounts step.render's subtree fresh on
              every step change, instead of reusing the same component instance
              in the same tree position — without this, PhotoGridEditor (whose
              internal photo list is seeded once via useState, not synced to
              prop changes) kept showing the previous step's photos when moving
              from "Add photos of you" to "Add photos of your flat". The slide
              direction mirrors Next vs. Back (skill §7). */}
          <motion.div
            key={stepIndex}
            custom={direction}
            variants={stepVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={reducedMotion ? { duration: 0.1 } : SPRING_QUICK}
          >
            <span className="mb-3 text-3xl">{step.icon}</span>
            <h1 className="font-display text-2xl font-bold">{step.title}</h1>
            {step.subtitle && (
              <p className="mb-2 text-sm text-gray-400">
                {typeof step.subtitle === "function" ? step.subtitle(data) : step.subtitle}
              </p>
            )}
            <div className="mt-4">{step.render(data, setField)}</div>
          </motion.div>
        </AnimatePresence>
      </div>

      {error && <p className="mb-2 text-sm text-red-600">{error}</p>}

      <div className="flex items-center justify-end">
        <button
          type="button"
          onClick={handleNext}
          disabled={!canAdvance || submitting}
          aria-label={isLast ? "Finish" : "Next"}
          className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-r from-bloom to-riviera text-2xl text-white shadow-lg shadow-bloom/30 transition-transform active:scale-95 disabled:opacity-40 disabled:shadow-none"
        >
          {submitting ? "…" : isLast ? "✓" : "→"}
        </button>
      </div>
    </div>
    </div>
  );
}
