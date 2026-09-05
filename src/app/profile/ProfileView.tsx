"use client";

// Read-only profile view with per-field "Edit" affordance: editing one field
// doesn't require refilling the rest of the profile.

import { useState } from "react";
import Link from "next/link";
import { signOut } from "next-auth/react";
import CityPicker from "@/components/CityPicker";
import ProfileCard from "@/components/ProfileCard";
import ProfileCompletionBanner from "@/components/ProfileCompletionBanner";
import ChipSelect from "@/components/onboarding/ChipSelect";
import PhotoGridEditor from "@/components/onboarding/PhotoGridEditor";
import VideoUploader from "@/components/onboarding/VideoUploader";
import PromptsEditor from "@/components/onboarding/PromptsEditor";
import Surface from "@/components/ui/Surface";
import Button from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import PaymentMethodEditor, { PaymentMethodSummary, type PaymentMethodValue } from "@/components/PaymentMethodEditor";
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
    key: "pricePerMonthCents",
    label: "Price per month (long stays)",
    display: (d) => (d.pricePerMonthCents ? `€${(Number(d.pricePerMonthCents) / 100).toFixed(0)}/month` : "Not added yet"),
    edit: (d, set) => <PriceEditor value={d.pricePerMonthCents} onChange={set} placeholder="€ per month (optional)" />,
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
  return <Input autoFocus value={value} onChange={(e) => onChange(e.target.value)} />;
}

function TextAreaEditor({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return <Textarea autoFocus rows={4} maxLength={1000} value={value} onChange={(e) => onChange(e.target.value)} />;
}

function AgeEditor({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <Input
      type="number"
      autoFocus
      inputMode="numeric"
      min={16}
      max={99}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

// value/onChange are in cents (matches ProfileFormData.pricePerDayCents /
// the API's cents-based schema); the input itself shows and accepts euros.
// An emptied field stays empty (not "0") so it round-trips correctly for
// the optional pricePerMonthCents, not just the required per-day price.
function PriceEditor({
  value,
  onChange,
  placeholder = "€ per day",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  const euros = value ? String(Number(value) / 100) : "";
  return (
    <Input
      type="number"
      autoFocus
      inputMode="numeric"
      min={1}
      max={1000}
      value={euros}
      onChange={(e) => onChange(e.target.value ? String(Math.round(Number(e.target.value) * 100)) : "")}
      placeholder={placeholder}
    />
  );
}

function DateEditor({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return <Input type="date" autoFocus value={value} onChange={(e) => onChange(e.target.value)} />;
}

export default function ProfileView({
  initialProfile,
  initialPaymentMethod,
  initialPaymentHandle,
  initialPaymentHandleAccountName,
  ratingSummary,
}: {
  initialProfile: ProfileFormData;
  initialPaymentMethod: string;
  initialPaymentHandle: string;
  initialPaymentHandleAccountName: string;
  ratingSummary: RatingSummary;
}) {
  const [profile, setProfile] = useState(initialProfile);
  const [editingKey, setEditingKey] = useState<
    FieldKey | "selfPhotos" | "flatPhotos" | "flatVideo" | "prompts" | "paymentHandle" | "registration" | null
  >(null);
  const [draft, setDraft] = useState<ProfileFormData | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<"edit" | "preview">("edit");
  const [payment, setPayment] = useState<PaymentMethodValue>({
    paymentMethod: initialPaymentMethod,
    paymentHandle: initialPaymentHandle,
    paymentHandleAccountName: initialPaymentHandleAccountName,
  });
  const [paymentDraft, setPaymentDraft] = useState<PaymentMethodValue>(payment);
  const [savingPaymentHandle, setSavingPaymentHandle] = useState(false);
  const [paymentHandleError, setPaymentHandleError] = useState<string | null>(null);

  // Drives the same "needs more photos" highlight as ProfileCompletionBanner
  // above, but on the section itself, right where the fix actually happens.
  // Deliberately scoped to photos only, not payment info (that's optional
  // until you actually try to confirm a match, no need to nag for it here).
  const needsSelfPhotos = profile.selfPhotoUrls.length < MIN_SELF_PHOTO_COUNT;
  const needsFlatPhotos = profile.flatPhotoUrls.length < MIN_FLAT_PHOTO_COUNT;

  async function savePaymentHandle() {
    setSavingPaymentHandle(true);
    setPaymentHandleError(null);
    try {
      const res = await fetch("/api/user/payment-handle", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(paymentDraft),
      });
      if (!res.ok) {
        setPaymentHandleError("Could not save. Please try again.");
        setSavingPaymentHandle(false);
        return;
      }
      setPayment(paymentDraft);
      setEditingKey(null);
    } catch {
      setPaymentHandleError("Could not save. Please try again.");
    } finally {
      setSavingPaymentHandle(false);
    }
  }

  function startEditing(key: FieldKey | "selfPhotos" | "flatPhotos" | "flatVideo" | "prompts" | "registration") {
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
    <main className="app-bg flex flex-col p-6 pb-24 md:ml-56 md:pb-6">
      <div className="mx-auto w-full max-w-2xl">
      <h1 className="mb-5 font-display text-3xl font-bold text-chalk">Your profile</h1>

      <ProfileCompletionBanner
        selfPhotoCount={profile.selfPhotoUrls.length}
        flatPhotoCount={profile.flatPhotoUrls.length}
      />

      <div className="mb-6 flex rounded-full bg-white p-1 shadow-surface">
        <button
          type="button"
          onClick={() => setTab("edit")}
          className={`flex-1 rounded-full py-2 text-sm font-semibold transition-colors ${
            tab === "edit" ? "bg-gradient-to-r from-bloom to-riviera text-white shadow-surface" : "text-carbon-text"
          }`}
        >
          Edit
        </button>
        <button
          type="button"
          onClick={() => setTab("preview")}
          className={`flex-1 rounded-full py-2 text-sm font-semibold transition-colors ${
            tab === "preview" ? "bg-gradient-to-r from-bloom to-riviera text-white shadow-surface" : "text-carbon-text"
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
      <div className="flex flex-col gap-4">
      {/* Payment method: how a matched counterpart should pay you directly
          once you've both confirmed — StudSwap never moves this money. */}
      <Surface className="p-5">
        <div className="mb-3 flex items-center justify-between">
          <span className="text-sm font-semibold text-chalk">How should people pay you?</span>
          {editingKey !== "paymentHandle" && (
            <button
              type="button"
              onClick={() => {
                setPaymentDraft(payment);
                setPaymentHandleError(null);
                setEditingKey("paymentHandle");
              }}
              className="text-sm font-semibold text-riviera"
            >
              Edit
            </button>
          )}
        </div>
        {editingKey === "paymentHandle" ? (
          <div className="flex flex-col gap-3">
            <PaymentMethodEditor value={paymentDraft} onChange={setPaymentDraft} autoFocus />
            <SaveCancelRow
              onSave={savePaymentHandle}
              onCancel={() => setEditingKey(null)}
              saving={savingPaymentHandle}
              error={paymentHandleError}
            />
          </div>
        ) : (
          <PaymentMethodSummary
            method={payment.paymentMethod}
            handle={payment.paymentHandle}
            accountName={payment.paymentHandleAccountName}
          />
        )}
      </Surface>

      {/* Short-term rental registration: required (EU 2024/1028) for any
          listing that could end up as a one-directional stay, which is any
          listing here — so collected the same way for everyone, exempt or
          not. Compliance data only, never shown to another user. */}
      <Surface className="p-5">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm font-semibold text-chalk">Short-term rental registration</span>
          {editingKey !== "registration" && (
            <button
              type="button"
              onClick={() => startEditing("registration")}
              className="text-sm font-semibold text-riviera"
            >
              Edit
            </button>
          )}
        </div>
        {editingKey === "registration" && draft ? (
          <div className="flex flex-col gap-2">
            <p className="text-xs text-carbon-text">
              If the city your flat is in runs a short-term rental registration scheme, add the registration
              number here. Required under EU rules if it applies to you, tick exempt if it doesn't.
            </p>
            <Input
              autoFocus
              value={draft.shortTermRentalRegistrationNumber}
              onChange={(e) => setDraft({ ...draft, shortTermRentalRegistrationNumber: e.target.value, shortTermRentalRegistrationExempt: false })}
              disabled={draft.shortTermRentalRegistrationExempt}
              placeholder="Registration number"
            />
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={draft.shortTermRentalRegistrationExempt}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    shortTermRentalRegistrationExempt: e.target.checked,
                    shortTermRentalRegistrationNumber: e.target.checked ? "" : draft.shortTermRentalRegistrationNumber,
                  })
                }
              />
              My city doesn&apos;t require this
            </label>
            <SaveCancelRow onSave={save} onCancel={cancelEditing} saving={saving} error={error} />
          </div>
        ) : (
          <p className="text-base">
            {profile.shortTermRentalRegistrationExempt
              ? "Exempt"
              : profile.shortTermRentalRegistrationNumber || "Not added yet"}
          </p>
        )}
      </Surface>

      {/* Photos of you */}
      <Surface className={`p-5 ${needsSelfPhotos ? "ring-2 ring-bloom/60" : ""}`}>
        <div className="mb-2 flex items-center justify-between">
          <span className="flex items-center gap-2 text-sm font-semibold text-chalk">
            Photos of you
            {needsSelfPhotos && (
              <span className="rounded-full bg-bloom/15 px-2 py-0.5 text-xs font-medium text-bloom-text">
                Add more
              </span>
            )}
          </span>
          {editingKey !== "selfPhotos" && (
            <button
              type="button"
              onClick={() => startEditing("selfPhotos")}
              className="text-sm font-semibold text-riviera"
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
              minIsRecommended
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
      </Surface>

      {/* Photos of the flat */}
      <Surface className={`p-5 ${needsFlatPhotos ? "ring-2 ring-bloom/60" : ""}`}>
        <div className="mb-2 flex items-center justify-between">
          <span className="flex items-center gap-2 text-sm font-semibold text-chalk">
            Photos of the flat
            {needsFlatPhotos && (
              <span className="rounded-full bg-bloom/15 px-2 py-0.5 text-xs font-medium text-bloom-text">
                Add more
              </span>
            )}
          </span>
          {editingKey !== "flatPhotos" && (
            <button
              type="button"
              onClick={() => startEditing("flatPhotos")}
              className="text-sm font-semibold text-riviera"
            >
              Edit
            </button>
          )}
        </div>
        <p className="mb-2 text-xs text-carbon-text">
          The first photo here is the very first thing people see on your card. Mark one as the cover
          photo below to control which.
        </p>
        {editingKey === "flatPhotos" && draft ? (
          <div className="flex flex-col gap-2">
            <PhotoGridEditor
              photoUrls={draft.flatPhotoUrls}
              onChange={(urls) => setDraft({ ...draft, flatPhotoUrls: urls })}
              minCount={MIN_FLAT_PHOTO_COUNT}
              maxCount={MAX_FLAT_PHOTO_COUNT}
              markProfilePicture
              coverLabel="Cover photo"
              minIsRecommended
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
      </Surface>

      {/* Video of the flat (optional) */}
      <Surface className="p-5">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm font-semibold text-chalk">Video of the flat</span>
          {editingKey !== "flatVideo" && (
            <button
              type="button"
              onClick={() => startEditing("flatVideo")}
              className="text-sm font-semibold text-riviera"
            >
              Edit
            </button>
          )}
        </div>
        {editingKey === "flatVideo" && draft ? (
          <div className="flex flex-col gap-2">
            <VideoUploader value={draft.flatVideoUrl} onChange={(url) => setDraft({ ...draft, flatVideoUrl: url })} />
            <SaveCancelRow onSave={save} onCancel={cancelEditing} saving={saving} error={error} />
          </div>
        ) : profile.flatVideoUrl ? (
          <video src={profile.flatVideoUrl} controls className="aspect-video w-full rounded-lg bg-black" />
        ) : (
          <p className="text-base text-carbon">Not added yet</p>
        )}
      </Surface>

      {/* Simple fields */}
      <Surface className="divide-y divide-carbon-line px-5">
        {SIMPLE_FIELDS.map((field) => (
          <div key={field.key} className="py-4 first:pt-5 last:pb-5">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-chalk">{field.label}</span>
              {editingKey !== field.key && (
                <button
                  type="button"
                  onClick={() => startEditing(field.key)}
                  className="text-sm font-semibold text-riviera"
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
          </div>
        ))}
      </Surface>

      {/* Prompts */}
      <Surface className="p-5">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm font-semibold text-chalk">Profile answers</span>
          {editingKey !== "prompts" && (
            <button type="button" onClick={() => startEditing("prompts")} className="text-sm font-semibold text-riviera">
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
              <div key={p.question} className="rounded-xl bg-gray-50 p-3">
                <p className="text-sm font-medium text-gray-500">{p.question}</p>
                <p className="mt-1 text-base">{p.answer}</p>
              </div>
            ))}
          </div>
        )}
      </Surface>

      <Button variant="danger" className="mt-2 !rounded-xl" onClick={() => signOut({ callbackUrl: "/" })}>
        Log out
      </Button>

      <Surface className="overflow-hidden">
        <p className="bg-gray-50 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
          Legal documents
        </p>
        {LEGAL_LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="flex items-center justify-between border-t border-carbon-line px-4 py-3 text-sm text-gray-700 hover:bg-gray-50"
          >
            {link.label}
            <span className="text-gray-300">›</span>
          </Link>
        ))}
      </Surface>
      </div>
      )}
      </div>
    </main>
  );
}

const LEGAL_LINKS = [
  { href: "/terms", label: "Terms of Service" },
  { href: "/fees", label: "Fees and Refunds Policy" },
  { href: "/peer-agreement", label: "Peer Swap Agreement" },
  { href: "/damage-deposit-agreement", label: "Damage Deposit Agreement" },
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
        <Button onClick={onSave} disabled={saving} className="!px-4 !py-2 text-sm">
          {saving ? "Saving…" : "Save"}
        </Button>
        <Button variant="ghost" onClick={onCancel} className="!px-4 !py-2 text-sm">
          Cancel
        </Button>
      </div>
    </div>
  );
}
