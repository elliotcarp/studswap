"use client";

// Read-only profile view with per-field "Edit" affordance: editing one field
// doesn't require refilling the rest of the profile.

import { useState } from "react";
import Link from "next/link";
import { signOut } from "next-auth/react";
import CityPicker from "@/components/CityPicker";
import ProfileCard from "@/components/ProfileCard";
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
import type { ProfileFormData, RatingSummary } from "@/types";

type FieldKey = keyof ProfileFormData;

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

const SIMPLE_FIELDS: {
  key: FieldKey;
  label: string;
  display: (data: ProfileFormData) => string;
  edit: (data: ProfileFormData, setValue: (v: string) => void) => React.ReactNode;
}[] = [
  { key: "name", label: "Name", display: (d) => d.name, edit: (d, set) => <TextEditor value={d.name} onChange={set} /> },
  { key: "age", label: "Age", display: (d) => d.age, edit: (d, set) => <AgeEditor value={d.age} onChange={set} /> },
  {
    key: "university",
    label: "University",
    display: (d) => d.university,
    edit: (d, set) => <TextEditor value={d.university} onChange={set} />,
  },
  {
    key: "program",
    label: "Field of study",
    display: (d) => d.program,
    edit: (d, set) => <TextEditor value={d.program} onChange={set} />,
  },
  {
    key: "yearOfStudy",
    label: "Year of study",
    display: (d) => d.yearOfStudy,
    edit: (d, set) => <ChipSelect options={YEAR_OF_STUDY_OPTIONS} value={d.yearOfStudy} onChange={set} />,
  },
  {
    key: "homeCity",
    label: "Flat location",
    display: (d) => d.homeCity,
    edit: (d, set) => <CityPicker value={d.homeCity} onChange={set} />,
  },
  {
    key: "address",
    label: "Exact address",
    display: (d) => (d.address ? d.address : "Not added yet"),
    edit: (d, set) => <TextEditor value={d.address} onChange={set} />,
  },
  {
    key: "availableFrom",
    label: "Available from",
    display: (d) => formatDate(d.availableFrom),
    edit: (d, set) => <DateEditor value={d.availableFrom} onChange={set} />,
  },
  {
    key: "availableTo",
    label: "Available to",
    display: (d) => formatDate(d.availableTo),
    edit: (d, set) => <DateEditor value={d.availableTo} onChange={set} />,
  },
  {
    key: "accommodates",
    label: "Accommodates",
    display: (d) => d.accommodates,
    edit: (d, set) => <ChipSelect options={ACCOMMODATES_OPTIONS} value={d.accommodates} onChange={set} />,
  },
  {
    key: "pricePerDayCents",
    label: "Price per day",
    display: (d) => `€${(Number(d.pricePerDayCents) / 100).toFixed(0)}/day`,
    edit: (d, set) => <PriceEditor value={d.pricePerDayCents} onChange={set} />,
  },
  {
    key: "smoker",
    label: "Smoker",
    display: (d) => d.smoker,
    edit: (d, set) => <ChipSelect options={SMOKER_OPTIONS} value={d.smoker} onChange={set} />,
  },
  {
    key: "pets",
    label: "Pets",
    display: (d) => d.pets,
    edit: (d, set) => <ChipSelect options={PETS_OPTIONS} value={d.pets} onChange={set} />,
  },
  {
    key: "selfDescription",
    label: "About you",
    display: (d) => d.selfDescription,
    edit: (d, set) => <TextAreaEditor value={d.selfDescription} onChange={set} />,
  },
  {
    key: "flatDescription",
    label: "About your flat",
    display: (d) => d.flatDescription,
    edit: (d, set) => <TextAreaEditor value={d.flatDescription} onChange={set} />,
  },
];

function TextEditor({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <input
      autoFocus
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-gray-400"
    />
  );
}

function TextAreaEditor({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <textarea
      autoFocus
      rows={4}
      maxLength={1000}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-gray-400"
    />
  );
}

function AgeEditor({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <input
      type="number"
      autoFocus
      inputMode="numeric"
      min={16}
      max={99}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-gray-400"
    />
  );
}

// value/onChange are in cents (matches ProfileFormData.pricePerDayCents /
// the API's cents-based schema); the input itself shows and accepts euros.
function PriceEditor({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const euros = value ? String(Number(value) / 100) : "";
  return (
    <input
      type="number"
      autoFocus
      inputMode="numeric"
      min={1}
      max={1000}
      value={euros}
      onChange={(e) => onChange(String(Math.round(Number(e.target.value) * 100)))}
      placeholder="€ per day"
      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-gray-400"
    />
  );
}

function DateEditor({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <input
      type="date"
      autoFocus
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-gray-400"
    />
  );
}

export default function ProfileView({
  initialProfile,
  initialPaymentHandle,
  ratingSummary,
}: {
  initialProfile: ProfileFormData;
  initialPaymentHandle: string;
  ratingSummary: RatingSummary;
}) {
  const [profile, setProfile] = useState(initialProfile);
  const [editingKey, setEditingKey] = useState<FieldKey | "selfPhotos" | "flatPhotos" | "prompts" | "paymentHandle" | null>(
    null
  );
  const [draft, setDraft] = useState<ProfileFormData | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<"edit" | "preview">("edit");
  const [paymentHandle, setPaymentHandle] = useState(initialPaymentHandle);
  const [paymentHandleDraft, setPaymentHandleDraft] = useState(initialPaymentHandle);
  const [savingPaymentHandle, setSavingPaymentHandle] = useState(false);
  const [paymentHandleError, setPaymentHandleError] = useState<string | null>(null);

  async function savePaymentHandle() {
    setSavingPaymentHandle(true);
    setPaymentHandleError(null);
    try {
      const res = await fetch("/api/user/payment-handle", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentHandle: paymentHandleDraft }),
      });
      if (!res.ok) {
        setPaymentHandleError("Could not save. Please try again.");
        setSavingPaymentHandle(false);
        return;
      }
      setPaymentHandle(paymentHandleDraft);
      setEditingKey(null);
    } catch {
      setPaymentHandleError("Could not save. Please try again.");
    } finally {
      setSavingPaymentHandle(false);
    }
  }

  function startEditing(key: FieldKey | "selfPhotos" | "flatPhotos" | "prompts") {
    setDraft(profile);
    setEditingKey(key);
    setError(null);
  }

  function cancelEditing() {
    setEditingKey(null);
    setDraft(null);
  }

  async function save() {
    if (!draft) return;
    setSaving(true);
    setError(null);
    try {
      // A prompt slot can have a question picked but no answer typed yet (e.g.
      // the optional 3rd one), only complete prompts should ever be submitted.
      const payload = {
        ...draft,
        prompts: draft.prompts.filter((p) => p.question && p.answer.trim().length > 0),
      };
      const res = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        setError(body?.error ?? "Could not save changes. Please try again.");
        setSaving(false);
        return;
      }
      setProfile(payload);
      setEditingKey(null);
      setDraft(null);
    } catch {
      setError("Could not save changes. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="flex flex-col p-6 pb-24 md:ml-56 md:pb-6">
      <div className="mx-auto w-full max-w-2xl">
      <h1 className="mb-4 font-display text-2xl font-bold">Your profile</h1>

      <div className="mb-6 flex rounded-lg bg-gray-100 p-1">
        <button
          type="button"
          onClick={() => setTab("edit")}
          className={`flex-1 rounded-md py-2 text-sm font-medium transition-colors ${
            tab === "edit" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"
          }`}
        >
          Edit
        </button>
        <button
          type="button"
          onClick={() => setTab("preview")}
          className={`flex-1 rounded-md py-2 text-sm font-medium transition-colors ${
            tab === "preview" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"
          }`}
        >
          Preview
        </button>
      </div>

      {tab === "preview" ? (
        <div className="relative mx-auto h-[75vh] w-full max-w-md">
          <ProfileCard
            profile={{ ...profile, userId: "preview", ratingSummary }}
            showAddress
            ratingDisplay="full"
          />
        </div>
      ) : (
      <>
      {/* Payment handle: how a matched counterpart should pay you directly
          once you've both confirmed — StudSwap never moves this money. */}
      <section className="mb-6 border-b pb-4">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm font-medium text-gray-500">How should people pay you?</span>
          {editingKey !== "paymentHandle" && (
            <button
              type="button"
              onClick={() => {
                setPaymentHandleDraft(paymentHandle);
                setPaymentHandleError(null);
                setEditingKey("paymentHandle");
              }}
              className="text-sm font-medium text-riviera"
            >
              Edit
            </button>
          )}
        </div>
        {editingKey === "paymentHandle" ? (
          <div className="mt-2 flex flex-col gap-2">
            <input
              autoFocus
              value={paymentHandleDraft}
              onChange={(e) => setPaymentHandleDraft(e.target.value)}
              placeholder="e.g. PayPal: you@example.com, or your IBAN"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-gray-400"
            />
            <SaveCancelRow
              onSave={savePaymentHandle}
              onCancel={() => setEditingKey(null)}
              saving={savingPaymentHandle}
              error={paymentHandleError}
            />
          </div>
        ) : (
          <p className="mt-1 text-base">{paymentHandle || "Not added yet"}</p>
        )}
      </section>

      {/* Photos of you */}
      <section className="mb-6 border-b pb-4">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm font-medium text-gray-500">Photos of you</span>
          {editingKey !== "selfPhotos" && (
            <button
              type="button"
              onClick={() => startEditing("selfPhotos")}
              className="text-sm font-medium text-riviera"
            >
              Edit
            </button>
          )}
        </div>
        {editingKey === "selfPhotos" && draft ? (
          <div className="flex flex-col gap-2">
            <PhotoGridEditor
              photoUrls={draft.selfPhotoUrls}
              onChange={(urls) => setDraft({ ...draft, selfPhotoUrls: urls })}
              minCount={MIN_SELF_PHOTO_COUNT}
              maxCount={MAX_SELF_PHOTO_COUNT}
              markProfilePicture
            />
            <SaveCancelRow onSave={save} onCancel={cancelEditing} saving={saving} error={error} />
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2 md:grid-cols-5">
            {profile.selfPhotoUrls.map((url) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={url} src={url} alt="" className="aspect-square rounded-lg object-cover" />
            ))}
          </div>
        )}
      </section>

      {/* Photos of the flat */}
      <section className="mb-6 border-b pb-4">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm font-medium text-gray-500">Photos of the flat</span>
          {editingKey !== "flatPhotos" && (
            <button
              type="button"
              onClick={() => startEditing("flatPhotos")}
              className="text-sm font-medium text-riviera"
            >
              Edit
            </button>
          )}
        </div>
        {editingKey === "flatPhotos" && draft ? (
          <div className="flex flex-col gap-2">
            <PhotoGridEditor
              photoUrls={draft.flatPhotoUrls}
              onChange={(urls) => setDraft({ ...draft, flatPhotoUrls: urls })}
              minCount={MIN_FLAT_PHOTO_COUNT}
              maxCount={MAX_FLAT_PHOTO_COUNT}
            />
            <SaveCancelRow onSave={save} onCancel={cancelEditing} saving={saving} error={error} />
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2 md:grid-cols-5">
            {profile.flatPhotoUrls.map((url) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={url} src={url} alt="" className="aspect-square rounded-lg object-cover" />
            ))}
          </div>
        )}
      </section>

      {/* Simple fields */}
      {SIMPLE_FIELDS.map((field) => (
        <section key={field.key} className="mb-2 border-b py-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-500">{field.label}</span>
            {editingKey !== field.key && (
              <button
                type="button"
                onClick={() => startEditing(field.key)}
                className="text-sm font-medium text-riviera"
              >
                Edit
              </button>
            )}
          </div>
          {editingKey === field.key && draft ? (
            <div className="mt-2 flex flex-col gap-2">
              {field.edit(draft, (value) => setDraft({ ...draft, [field.key]: value }))}
              <SaveCancelRow onSave={save} onCancel={cancelEditing} saving={saving} error={error} />
            </div>
          ) : (
            <p className="mt-1 text-base">{field.display(profile)}</p>
          )}
        </section>
      ))}

      {/* Prompts */}
      <section className="mb-6 mt-4">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm font-medium text-gray-500">Profile answers</span>
          {editingKey !== "prompts" && (
            <button type="button" onClick={() => startEditing("prompts")} className="text-sm font-medium text-riviera">
              Edit
            </button>
          )}
        </div>
        {editingKey === "prompts" && draft ? (
          <div className="flex flex-col gap-2">
            <PromptsEditor prompts={draft.prompts} onChange={(prompts) => setDraft({ ...draft, prompts })} />
            <SaveCancelRow onSave={save} onCancel={cancelEditing} saving={saving} error={error} />
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {profile.prompts.map((p) => (
              <div key={p.question} className="rounded-xl border border-gray-200 p-3">
                <p className="text-sm font-medium text-gray-500">{p.question}</p>
                <p className="mt-1 text-base">{p.answer}</p>
              </div>
            ))}
          </div>
        )}
      </section>

      <button
        type="button"
        onClick={() => signOut({ callbackUrl: "/" })}
        className="mt-6 rounded-lg border border-red-500 px-4 py-3 text-sm font-medium text-red-600"
      >
        Log out
      </button>

      <section className="mt-6 overflow-hidden rounded-2xl border border-gray-200">
        <p className="bg-gray-50 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
          Legal documents
        </p>
        {LEGAL_LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            target="_blank"
            className="flex items-center justify-between border-t border-gray-100 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50"
          >
            {link.label}
            <span className="text-gray-300">›</span>
          </Link>
        ))}
      </section>
      </>
      )}
      </div>
    </main>
  );
}

const LEGAL_LINKS = [
  { href: "/terms", label: "Terms of Service" },
  { href: "/peer-agreement", label: "Peer Swap Agreement" },
  { href: "/privacy", label: "Privacy Policy" },
];

function SaveCancelRow({
  onSave,
  onCancel,
  saving,
  error,
}: {
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
  error?: string | null;
}) {
  return (
    <div className="flex flex-col gap-2">
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex gap-2">
      <button
        type="button"
        onClick={onSave}
        disabled={saving}
        className="rounded-lg bg-riviera px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {saving ? "Saving…" : "Save"}
      </button>
      <button type="button" onClick={onCancel} className="rounded-lg px-4 py-2 text-sm font-medium text-gray-500">
        Cancel
      </button>
      </div>
    </div>
  );
}
