"use client";

// Hinge-style multi-step onboarding: one field (or group) per full-screen step,
// with a progress-dot header and a circular next/back nav, like Hinge's own
// account-setup flow (see reference screenshots) but for a flat-swap profile
// instead of a dating profile.

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { SPRING_QUICK, usePrefersReducedMotion } from "@/lib/motion";
import { estimateDayRateFromMonthlyRentCents } from "@/lib/pricing";
import CityPicker from "@/components/CityPicker";
import { EUROPEAN_CITIES } from "@/lib/cities";
import ChipSelect from "@/components/onboarding/ChipSelect";
import PhotoGridEditor from "@/components/onboarding/PhotoGridEditor";
import VideoUploader from "@/components/onboarding/VideoUploader";
import PromptsEditor from "@/components/onboarding/PromptsEditor";
import PaymentMethodEditor from "@/components/PaymentMethodEditor";
import { Input, Textarea } from "@/components/ui/Input";
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
  pricePerMonthCents: "",
  smoker: "",
  pets: "",
  selfPhotoUrls: [],
  flatPhotoUrls: [],
  flatVideoUrl: "",
  selfDescription: "",
  flatDescription: "",
  prompts: [],
  shortTermRentalRegistrationNumber: "",
  shortTermRentalRegistrationExempt: false,
};

// Not part of ProfileFormData (it lives on User, not Profile — saved via a
// separate call to /api/user/payment-handle, see handleNext), but collected
// in the same wizard flow since the brief wants it asked for at listing
// creation, not mid-confirmation.
interface PaymentDestination {
  paymentMethod: string;
  paymentHandle: string;
  paymentHandleAccountName: string;
}
const EMPTY_PAYMENT_DESTINATION: PaymentDestination = {
  paymentMethod: "",
  paymentHandle: "",
  paymentHandleAccountName: "",
};

// Combined wizard state: the Profile fields (saved via POST /api/profile)
// plus the payment destination (User fields, saved via PUT
// /api/user/payment-handle) — collected in the same flow since the brief
// wants payment details asked for at listing creation, not confirmation,
// but they're two separate API calls on submit (see handleNext).
type WizardData = ProfileFormData & PaymentDestination;
const EMPTY_WIZARD_DATA: WizardData = { ...EMPTY_PROFILE, ...EMPTY_PAYMENT_DESTINATION };

type SetField = <K extends keyof WizardData>(key: K, value: WizardData[K]) => void;

interface StepDef {
  icon: string;
  title: string;
  subtitle?: string;
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

function textAreaStep(
  field: keyof WizardData,
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
      <Textarea
        autoFocus
        rows={6}
        maxLength={1000}
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
    icon: "📍",
    title: "What's the exact address?",
    subtitle: "Optional for now. Only shown to someone once you've matched, never on your public card.",
    render: (data, setField) => (
      <Input
        autoFocus
        value={data.address}
        onChange={(e) => setField("address", e.target.value)}
        placeholder="Street and number"
        className="text-lg"
      />
    ),
    isValid: () => true,
  },
  {
    icon: "📅",
    title: "When's your flat available from?",
    subtitle:
      "This is when YOUR flat is free for someone else to stay in it, not when you want to travel — you'll set your own trip dates separately when you browse other people's flats.",
    render: (data, setField) => (
      <Input
        type="date"
        autoFocus
        value={data.availableFrom}
        onChange={(e) => setField("availableFrom", e.target.value)}
        className="text-lg"
      />
    ),
    isValid: (data) => data.availableFrom.length > 0,
  },
  {
    icon: "📅",
    title: "And your flat's available until when?",
    subtitle: "Still your flat's own availability window, same as the last step.",
    render: (data, setField) => (
      <Input
        type="date"
        autoFocus
        min={data.availableFrom || undefined}
        value={data.availableTo}
        onChange={(e) => setField("availableTo", e.target.value)}
        className="text-lg"
      />
    ),
    isValid: (data) => data.availableTo.length > 0 && data.availableTo > data.availableFrom,
  },
  chipStep("accommodates", "👥", "How many people can your flat host?", ACCOMMODATES_OPTIONS),
  {
    icon: "💶",
    title: "What's a fair price?",
    subtitle:
      "You're a student helping another student out for a semester, not running a rental business — most people here price close to what they themselves already pay, not what the market would bear. In euros; StudSwap never collects or moves this money. Start with your monthly rent if that's easier to picture, we'll suggest a day rate from it; per day is what actually gets used for short stays, per month just for long ones.",
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
                ? "Estimated from your rent above (roughly rent ÷ 30) — adjust it if your situation is different."
                : "This is what's actually used for short stays. Enter your rent above and we'll suggest one."}
            </p>
          </div>
      </div>
    ),
    isValid: (data) => {
      const dayPrice = Number(data.pricePerDayCents);
      if (!Number.isInteger(dayPrice) || dayPrice < 100) return false;
      if (!data.pricePerMonthCents) return true;
      const monthPrice = Number(data.pricePerMonthCents);
      return Number.isInteger(monthPrice) && monthPrice >= 100;
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
    subtitle: `Recommended: at least ${MIN_SELF_PHOTO_COUNT}, up to ${MAX_SELF_PHOTO_COUNT}. You can skip this for now, but complete photo sets typically get far more likes and matches — we'll keep reminding you to finish this from your profile.`,
    render: (data, setField) => (
      <PhotoGridEditor
        photoUrls={data.selfPhotoUrls}
        onChange={(urls) => setField("selfPhotoUrls", urls)}
        minCount={MIN_SELF_PHOTO_COUNT}
        maxCount={MAX_SELF_PHOTO_COUNT}
        markProfilePicture
        minIsRecommended
      />
    ),
    // Skippable: photos matter a lot for matching, but forcing them here
    // just loses people mid-signup. See ProfileCompletionBanner for the
    // Hinge-style nudge that follows up on this after onboarding.
    isValid: () => true,
  },
  {
    icon: "🏡",
    title: "Add photos of your flat",
    subtitle: `Recommended: at least ${MIN_FLAT_PHOTO_COUNT}, up to ${MAX_FLAT_PHOTO_COUNT}. This is skippable too — but the first flat photo becomes the very first thing people see on your card, so it's worth coming back to.`,
    render: (data, setField) => (
      <PhotoGridEditor
        photoUrls={data.flatPhotoUrls}
        onChange={(urls) => setField("flatPhotoUrls", urls)}
        minCount={MIN_FLAT_PHOTO_COUNT}
        maxCount={MAX_FLAT_PHOTO_COUNT}
        markProfilePicture
        coverLabel="Cover photo"
        minIsRecommended
      />
    ),
    isValid: () => true,
  },
  {
    icon: "🎬",
    title: "Add a video of your flat",
    subtitle: "Optional. A quick walkthrough gives a much better sense of the place than photos alone.",
    render: (data, setField) => (
      <VideoUploader value={data.flatVideoUrl} onChange={(url) => setField("flatVideoUrl", url)} />
    ),
    isValid: () => true,
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
  {
    icon: "💸",
    title: "How should people pay you?",
    subtitle:
      "Optional for now — you can skip this and add it later. Shown to a matched counterpart only after you've both confirmed and paid, so they can pay you directly; you'll just need to add it before you can confirm a swap where you're owed money. StudSwap never touches this money.",
    render: (data, setField) => (
      <PaymentMethodEditor
        value={data}
        onChange={(next) => {
          setField("paymentMethod", next.paymentMethod);
          setField("paymentHandle", next.paymentHandle);
          setField("paymentHandleAccountName", next.paymentHandleAccountName);
        }}
        autoFocus
      />
    ),
    // Skippable: /api/matches/[id]/confirm already blocks confirming a match
    // where this user is owed money until they've filled this in, so there's
    // no need to force it at listing creation.
    isValid: () => true,
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
      // A prompt slot can have a question picked but no answer typed yet (e.g.
      // the optional 3rd one), only complete prompts should ever be submitted.
      const { paymentMethod, paymentHandle, paymentHandleAccountName, ...profileData } = data;
      const payload = {
        ...profileData,
        prompts: profileData.prompts.filter((p) => p.question && p.answer.trim().length > 0),
      };
      const [profileRes, paymentHandleRes] = await Promise.all([
        fetch("/api/profile", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }),
        fetch("/api/user/payment-handle", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ paymentMethod, paymentHandle, paymentHandleAccountName }),
        }),
      ]);
      if (!profileRes.ok) {
        const body = await profileRes.json().catch(() => null);
        setError(body?.error ?? "Could not save your profile. Please check the form and try again.");
        setSubmitting(false);
        return;
      }
      if (!paymentHandleRes.ok) {
        setError("Could not save your payment details. Please try again.");
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
            {step.subtitle && <p className="mb-2 text-sm text-gray-400">{step.subtitle}</p>}
            <div className="mt-4">{step.render(data, setField)}</div>
          </motion.div>
        </AnimatePresence>
      </div>

      {error && <p className="mb-2 text-sm text-red-600">{error}</p>}

      <div className="flex justify-end">
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
