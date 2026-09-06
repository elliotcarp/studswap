"use client";

// Read-only profile view with one "Edit" affordance per section: editing a
// section doesn't require refilling the rest of the profile. Grouped into
// Personal profile / Accommodation / Availability and pricing / Preferences
// / Payment and compliance / Media, rather than one long flat list of
// identical per-field rows.

import { useState } from "react";
import Link from "next/link";
import { signOut } from "next-auth/react";
import CityPicker from "@/components/CityPicker";
import ProfileCard from "@/components/ProfileCard";
import ProfileCompletionBanner, { type ChecklistItem } from "@/components/ProfileCompletionBanner";
import ChipSelect from "@/components/onboarding/ChipSelect";
import MultiChipSelect from "@/components/onboarding/MultiChipSelect";
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
  ROOM_TYPE_OPTIONS,
  AMENITY_OPTIONS,
  ARRANGEMENT_PREFERENCE_OPTIONS,
  MIN_SELF_PHOTO_COUNT,
  MAX_SELF_PHOTO_COUNT,
  MIN_FLAT_PHOTO_COUNT,
  MAX_FLAT_PHOTO_COUNT,
} from "@/lib/onboardingOptions";
import { MIN_PROMPT_COUNT } from "@/lib/prompts";
import type { ProfileFormData, RatingSummary } from "@/types";

type FieldKey = keyof ProfileFormData;
type SectionKey = "personal" | "accommodation" | "availability" | "preferences" | "payment" | "media";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

// Priority-ordered: photos first (they gate discovery visibility itself),
// then prompts and payment (explicitly named in the original brief), then
// everything else one at a time — so the banner keeps pointing at the next
// thing worth adding instead of stopping after the first three.
function computeChecklist(profile: ProfileFormData, hasPaymentMethod: boolean): (ChecklistItem & { section: SectionKey })[] {
  const items: (ChecklistItem & { section: SectionKey })[] = [];

  const missingSelf = Math.max(0, MIN_SELF_PHOTO_COUNT - profile.selfPhotoUrls.length);
  const missingFlat = Math.max(0, MIN_FLAT_PHOTO_COUNT - profile.flatPhotoUrls.length);
  if (missingSelf > 0 || missingFlat > 0) {
    const parts: string[] = [];
    if (missingSelf > 0) parts.push(`${missingSelf} more photo${missingSelf === 1 ? "" : "s"} of you`);
    if (missingFlat > 0) parts.push(`${missingFlat} more of your flat`);
    items.push({
      key: "photos",
      section: "media",
      icon: "📸",
      message: (
        <>
          <strong>Add {parts.join(" and ")}.</strong> Your listing won&apos;t show to anyone until you do.
        </>
      ),
    });
  }

  const promptCount = profile.prompts.filter((p) => p.question && p.answer.trim().length > 0).length;
  if (promptCount < MIN_PROMPT_COUNT) {
    const missing = MIN_PROMPT_COUNT - promptCount;
    items.push({
      key: "prompts",
      section: "personal",
      icon: "💬",
      message: (
        <>
          <strong>
            Answer {missing} more profile prompt{missing === 1 ? "" : "s"}.
          </strong>{" "}
          A little personality goes a long way in a swap decision.
        </>
      ),
    });
  }

  if (!hasPaymentMethod) {
    items.push({
      key: "payment",
      section: "payment",
      icon: "💸",
      message: (
        <>
          <strong>Add how you&apos;d like to get paid.</strong> You&apos;ll need this before you can confirm a swap
          where you&apos;re owed money.
        </>
      ),
    });
  }

  if (!profile.roomType) {
    items.push({
      key: "roomType",
      section: "accommodation",
      icon: "🏠",
      message: <strong>Add your room type.</strong>,
    });
  }
  if (profile.amenities.length === 0) {
    items.push({
      key: "amenities",
      section: "accommodation",
      icon: "🧰",
      message: <strong>Add a few amenities.</strong>,
    });
  }
  if (!profile.neighbourhood) {
    items.push({
      key: "neighbourhood",
      section: "accommodation",
      icon: "📍",
      message: <strong>Add your neighbourhood or area.</strong>,
    });
  }
  if (!profile.smoker) {
    items.push({
      key: "smoker",
      section: "preferences",
      icon: "🚬",
      message: <strong>Let people know if you smoke.</strong>,
    });
  }
  if (!profile.pets) {
    items.push({
      key: "pets",
      section: "preferences",
      icon: "🐾",
      message: <strong>Let people know about pets.</strong>,
    });
  }
  if (!profile.selfDescription) {
    items.push({
      key: "selfDescription",
      section: "personal",
      icon: "📝",
      message: <strong>Write a bit about yourself.</strong>,
    });
  }
  if (!profile.flatDescription) {
    items.push({
      key: "flatDescription",
      section: "accommodation",
      icon: "🏡",
      message: <strong>Write a bit about your flat.</strong>,
    });
  }
  if (!profile.address) {
    items.push({
      key: "address",
      section: "accommodation",
      icon: "📍",
      message: <strong>Add your exact address.</strong>,
    });
  }

  return items;
}

interface SimpleField {
  key: FieldKey;
  section: SectionKey;
  label: string;
  display: (data: ProfileFormData) => string;
  edit: (data: ProfileFormData, setValue: (v: string) => void) => React.ReactNode;
}

const SIMPLE_FIELDS: SimpleField[] = [
  {
    key: "name",
    section: "personal",
    label: "Name",
    display: (d) => d.name,
    edit: (d, set) => <TextEditor value={d.name} onChange={set} />,
  },
  {
    key: "age",
    section: "personal",
    label: "Age",
    display: (d) => d.age,
    edit: (d, set) => <AgeEditor value={d.age} onChange={set} />,
  },
  {
    key: "university",
    section: "personal",
    label: "University",
    display: (d) => d.university,
    edit: (d, set) => <TextEditor value={d.university} onChange={set} />,
  },
  {
    key: "program",
    section: "personal",
    label: "Field of study",
    display: (d) => d.program,
    edit: (d, set) => <TextEditor value={d.program} onChange={set} />,
  },
  {
    key: "yearOfStudy",
    section: "personal",
    label: "Year of study",
    display: (d) => d.yearOfStudy,
    edit: (d, set) => <ChipSelect options={YEAR_OF_STUDY_OPTIONS} value={d.yearOfStudy} onChange={set} />,
  },
  {
    key: "selfDescription",
    section: "personal",
    label: "About you",
    display: (d) => (d.selfDescription ? d.selfDescription : "Not added yet"),
    edit: (d, set) => <TextAreaEditor value={d.selfDescription} onChange={set} />,
  },
  {
    key: "homeCity",
    section: "accommodation",
    label: "Flat location",
    display: (d) => d.homeCity,
    edit: (d, set) => <CityPicker value={d.homeCity} onChange={set} />,
  },
  {
    key: "neighbourhood",
    section: "accommodation",
    label: "Neighbourhood / area",
    display: (d) => (d.neighbourhood ? d.neighbourhood : "Not added yet"),
    edit: (d, set) => <TextEditor value={d.neighbourhood} onChange={set} placeholder="e.g. Le Flon" />,
  },
  {
    key: "address",
    section: "accommodation",
    label: "Exact address",
    display: (d) => (d.address ? d.address : "Not added yet"),
    edit: (d, set) => <TextEditor value={d.address} onChange={set} />,
  },
  {
    key: "accommodates",
    section: "accommodation",
    label: "Accommodates",
    display: (d) => d.accommodates,
    edit: (d, set) => <ChipSelect options={ACCOMMODATES_OPTIONS} value={d.accommodates} onChange={set} />,
  },
  {
    key: "roomType",
    section: "accommodation",
    label: "Room type",
    display: (d) => (d.roomType ? d.roomType : "Not added yet"),
    edit: (d, set) => <ChipSelect options={ROOM_TYPE_OPTIONS} value={d.roomType} onChange={set} />,
  },
  {
    key: "flatDescription",
    section: "accommodation",
    label: "About your flat",
    display: (d) => (d.flatDescription ? d.flatDescription : "Not added yet"),
    edit: (d, set) => <TextAreaEditor value={d.flatDescription} onChange={set} />,
  },
  {
    key: "availableFrom",
    section: "availability",
    label: "Available from",
    display: (d) => formatDate(d.availableFrom),
    edit: (d, set) => <DateEditor value={d.availableFrom} onChange={set} />,
  },
  {
    key: "availableTo",
    section: "availability",
    label: "Available to",
    display: (d) => formatDate(d.availableTo),
    edit: (d, set) => <DateEditor value={d.availableTo} onChange={set} />,
  },
  {
    key: "pricePerDayCents",
    section: "availability",
    label: "Price per day",
    display: (d) => `€${(Number(d.pricePerDayCents) / 100).toFixed(0)}/day`,
    edit: (d, set) => <PriceEditor value={d.pricePerDayCents} onChange={set} />,
  },
  {
    key: "pricePerMonthCents",
    section: "availability",
    label: "Price per month (long stays)",
    display: (d) => (d.pricePerMonthCents ? `€${(Number(d.pricePerMonthCents) / 100).toFixed(0)}/month` : "Not added yet"),
    edit: (d, set) => <PriceEditor value={d.pricePerMonthCents} onChange={set} placeholder="€ per month (optional)" />,
  },
  {
    key: "smoker",
    section: "preferences",
    label: "Smoker",
    display: (d) => (d.smoker ? d.smoker : "Not added yet"),
    edit: (d, set) => <ChipSelect options={SMOKER_OPTIONS} value={d.smoker} onChange={set} />,
  },
  {
    key: "pets",
    section: "preferences",
    label: "Pets",
    display: (d) => (d.pets ? d.pets : "Not added yet"),
    edit: (d, set) => <ChipSelect options={PETS_OPTIONS} value={d.pets} onChange={set} />,
  },
  {
    key: "arrangementPreference",
    section: "preferences",
    label: "Open to",
    display: (d) => d.arrangementPreference,
    edit: (d, set) => <ChipSelect options={ARRANGEMENT_PREFERENCE_OPTIONS} value={d.arrangementPreference} onChange={set} />,
  },
];

const SECTION_TITLES: Record<SectionKey, string> = {
  personal: "Personal profile",
  accommodation: "Accommodation",
  availability: "Availability and pricing",
  preferences: "Preferences",
  payment: "Payment and compliance",
  media: "Media",
};

function fieldsFor(section: SectionKey) {
  return SIMPLE_FIELDS.filter((f) => f.section === section);
}

function TextEditor({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return <Input autoFocus value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />;
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
  const [editingSection, setEditingSection] = useState<SectionKey | null>(null);
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

  // Drives the "Add more" badges inside the Media section itself.
  const needsSelfPhotos = profile.selfPhotoUrls.length < MIN_SELF_PHOTO_COUNT;
  const needsFlatPhotos = profile.flatPhotoUrls.length < MIN_FLAT_PHOTO_COUNT;

  // Drives both ProfileCompletionBanner above and which section gets the
  // highlight ring below, so the fix always happens right where the nudge
  // points — only the single top item at a time, matching the one banner
  // shown at a time.
  const hasPaymentMethod = Boolean(payment.paymentMethod && payment.paymentHandle);
  const topItem = computeChecklist(profile, hasPaymentMethod)[0] ?? null;

  function startEditing(section: SectionKey) {
    setDraft(profile);
    if (section === "payment") setPaymentDraft(payment);
    setEditingSection(section);
    setError(null);
  }

  // The banner opens the right section's editor in place and scrolls it
  // into view, rather than just linking to the top of the page and leaving
  // the student to hunt for where "add prompts" actually lives (it's
  // inside the Personal profile editor, not its own visible control).
  function handleBannerClick() {
    if (!topItem) return;
    startEditing(topItem.section);
    // The target section's Surface exists in the DOM either way (edit mode
    // only changes its contents, not its presence), so this doesn't need to
    // wait for the re-render triggered by startEditing above.
    document.getElementById(`section-${topItem.section}`)?.scrollIntoView({ behavior: "auto", block: "start" });
  }

  function cancelEditing() {
    setEditingSection(null);
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
      const requests =
        editingSection === "payment"
          ? [
              fetch("/api/profile", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
              }),
              fetch("/api/user/payment-handle", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(paymentDraft),
              }),
            ]
          : [
              fetch("/api/profile", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
              }),
            ];
      const responses = await Promise.all(requests);
      if (!responses[0].ok) {
        const body = await responses[0].json().catch(() => null);
        setError(body?.error ?? "Could not save changes. Please try again.");
        setSaving(false);
        return;
      }
      if (responses[1] && !responses[1].ok) {
        setError("Could not save your payment details. Please try again.");
        setSaving(false);
        return;
      }
      setProfile(payload);
      if (editingSection === "payment") setPayment(paymentDraft);
      setEditingSection(null);
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

      <ProfileCompletionBanner item={topItem} onClick={handleBannerClick} />

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
      {/* Personal profile: identity + free-text answers */}
      <SectionCard
        id="section-personal"
        title={SECTION_TITLES.personal}
        editing={editingSection === "personal"}
        onEdit={() => startEditing("personal")}
        needsAttention={topItem?.section === "personal"}
      >
        {editingSection === "personal" && draft ? (
          <div className="flex flex-col gap-4">
            {fieldsFor("personal").map((field) => (
              <div key={field.key}>
                <label className="mb-1 block text-xs font-medium text-carbon-text">{field.label}</label>
                {field.edit(draft, (value) => setDraft({ ...draft, [field.key]: value }))}
              </div>
            ))}
            <div>
              <label className="mb-1 block text-xs font-medium text-carbon-text">Profile answers</label>
              <PromptsEditor prompts={draft.prompts} onChange={(prompts) => setDraft({ ...draft, prompts })} />
            </div>
            <SaveCancelRow onSave={save} onCancel={cancelEditing} saving={saving} error={error} />
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {fieldsFor("personal").map((field) => (
              <FieldRow key={field.key} label={field.label} value={field.display(profile)} />
            ))}
            {profile.prompts.length > 0 && (
              <div className="flex flex-col gap-2 pt-1">
                {profile.prompts.map((p) => (
                  <div key={p.question} className="rounded-xl bg-gray-50 p-3">
                    <p className="text-sm font-medium text-gray-500">{p.question}</p>
                    <p className="mt-1 text-base">{p.answer}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </SectionCard>

      {/* Accommodation: the flat itself */}
      <SectionCard
        id="section-accommodation"
        title={SECTION_TITLES.accommodation}
        editing={editingSection === "accommodation"}
        onEdit={() => startEditing("accommodation")}
        needsAttention={topItem?.section === "accommodation"}
      >
        {editingSection === "accommodation" && draft ? (
          <div className="flex flex-col gap-4">
            {fieldsFor("accommodation").map((field) => (
              <div key={field.key}>
                <label className="mb-1 block text-xs font-medium text-carbon-text">{field.label}</label>
                {field.edit(draft, (value) => setDraft({ ...draft, [field.key]: value }))}
              </div>
            ))}
            <div>
              <label className="mb-1 block text-xs font-medium text-carbon-text">Amenities</label>
              <MultiChipSelect
                options={AMENITY_OPTIONS}
                value={draft.amenities}
                onChange={(amenities) => setDraft({ ...draft, amenities })}
              />
            </div>
            <SaveCancelRow onSave={save} onCancel={cancelEditing} saving={saving} error={error} />
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {fieldsFor("accommodation").map((field) => (
              <FieldRow key={field.key} label={field.label} value={field.display(profile)} />
            ))}
            <FieldRow label="Amenities" value={profile.amenities.length > 0 ? profile.amenities.join(", ") : "Not added yet"} />
          </div>
        )}
      </SectionCard>

      {/* Availability and pricing */}
      <SectionCard
        id="section-availability"
        title={SECTION_TITLES.availability}
        editing={editingSection === "availability"}
        onEdit={() => startEditing("availability")}
        needsAttention={topItem?.section === "availability"}
      >
        {editingSection === "availability" && draft ? (
          <div className="flex flex-col gap-4">
            {fieldsFor("availability").map((field) => (
              <div key={field.key}>
                <label className="mb-1 block text-xs font-medium text-carbon-text">{field.label}</label>
                {field.edit(draft, (value) => setDraft({ ...draft, [field.key]: value }))}
              </div>
            ))}
            <SaveCancelRow onSave={save} onCancel={cancelEditing} saving={saving} error={error} />
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {fieldsFor("availability").map((field) => (
              <FieldRow key={field.key} label={field.label} value={field.display(profile)} />
            ))}
          </div>
        )}
      </SectionCard>

      {/* Preferences */}
      <SectionCard
        id="section-preferences"
        title={SECTION_TITLES.preferences}
        editing={editingSection === "preferences"}
        onEdit={() => startEditing("preferences")}
        needsAttention={topItem?.section === "preferences"}
      >
        {editingSection === "preferences" && draft ? (
          <div className="flex flex-col gap-4">
            {fieldsFor("preferences").map((field) => (
              <div key={field.key}>
                <label className="mb-1 block text-xs font-medium text-carbon-text">{field.label}</label>
                {field.edit(draft, (value) => setDraft({ ...draft, [field.key]: value }))}
              </div>
            ))}
            <SaveCancelRow onSave={save} onCancel={cancelEditing} saving={saving} error={error} />
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {fieldsFor("preferences").map((field) => (
              <FieldRow key={field.key} label={field.label} value={field.display(profile)} />
            ))}
          </div>
        )}
      </SectionCard>

      {/* Payment and compliance: how you're paid, plus rental registration */}
      <SectionCard
        id="section-payment"
        title={SECTION_TITLES.payment}
        editing={editingSection === "payment"}
        onEdit={() => startEditing("payment")}
        needsAttention={topItem?.section === "payment"}
      >
        {editingSection === "payment" && draft ? (
          <div className="flex flex-col gap-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-carbon-text">How should people pay you?</label>
              <p className="mb-2 text-xs text-carbon-text">
                Shown to a matched counterpart only after you've both confirmed and paid, so they can pay you
                directly. StudSwap never touches this money.
              </p>
              <PaymentMethodEditor value={paymentDraft} onChange={setPaymentDraft} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-carbon-text">Short-term rental registration</label>
              <p className="mb-2 text-xs text-carbon-text">
                If the city your flat is in runs a short-term rental registration scheme, add the registration
                number here. Required under EU rules if it applies to you, tick exempt if it doesn't.
              </p>
              <Input
                value={draft.shortTermRentalRegistrationNumber}
                onChange={(e) =>
                  setDraft({ ...draft, shortTermRentalRegistrationNumber: e.target.value, shortTermRentalRegistrationExempt: false })
                }
                disabled={draft.shortTermRentalRegistrationExempt}
                placeholder="Registration number"
              />
              <label className="mt-2 flex items-center gap-2 text-sm text-gray-700">
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
            </div>
            <SaveCancelRow onSave={save} onCancel={cancelEditing} saving={saving} error={error} />
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <div>
              <p className="mb-1 text-sm font-semibold text-chalk">How should people pay you?</p>
              <PaymentMethodSummary
                method={payment.paymentMethod}
                handle={payment.paymentHandle}
                accountName={payment.paymentHandleAccountName}
              />
            </div>
            <FieldRow
              label="Short-term rental registration"
              value={
                profile.shortTermRentalRegistrationExempt
                  ? "Exempt"
                  : profile.shortTermRentalRegistrationNumber || "Not added yet"
              }
            />
          </div>
        )}
      </SectionCard>

      {/* Media: photos + video */}
      <SectionCard
        id="section-media"
        title={SECTION_TITLES.media}
        editing={editingSection === "media"}
        onEdit={() => startEditing("media")}
        needsAttention={topItem?.section === "media"}
      >
        {editingSection === "media" && draft ? (
          <div className="flex flex-col gap-4">
            <div>
              <label className="mb-1 flex items-center gap-2 text-xs font-medium text-carbon-text">
                Photos of you
                {needsSelfPhotos && <AddMoreBadge />}
              </label>
              <PhotoGridEditor
                photoUrls={draft.selfPhotoUrls}
                onChange={(urls) => setDraft({ ...draft, selfPhotoUrls: urls })}
                minCount={MIN_SELF_PHOTO_COUNT}
                maxCount={MAX_SELF_PHOTO_COUNT}
                markProfilePicture
                minIsRecommended
              />
            </div>
            <div>
              <label className="mb-1 flex items-center gap-2 text-xs font-medium text-carbon-text">
                Photos of the flat
                {needsFlatPhotos && <AddMoreBadge />}
              </label>
              <p className="mb-2 text-xs text-carbon-text">
                The first photo here is the very first thing people see on your card. Mark one as the cover
                photo below to control which.
              </p>
              <PhotoGridEditor
                photoUrls={draft.flatPhotoUrls}
                onChange={(urls) => setDraft({ ...draft, flatPhotoUrls: urls })}
                minCount={MIN_FLAT_PHOTO_COUNT}
                maxCount={MAX_FLAT_PHOTO_COUNT}
                markProfilePicture
                coverLabel="Cover photo"
                minIsRecommended
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-carbon-text">Video of the flat</label>
              <VideoUploader value={draft.flatVideoUrl} onChange={(url) => setDraft({ ...draft, flatVideoUrl: url })} />
            </div>
            <SaveCancelRow onSave={save} onCancel={cancelEditing} saving={saving} error={error} />
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <div>
              <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-chalk">
                Photos of you
                {needsSelfPhotos && <AddMoreBadge />}
              </p>
              <div className="grid grid-cols-3 gap-2 md:grid-cols-5">
                {profile.selfPhotoUrls.map((url) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={url} src={url} alt="" className="aspect-square rounded-lg object-cover" />
                ))}
              </div>
            </div>
            <div>
              <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-chalk">
                Photos of the flat
                {needsFlatPhotos && <AddMoreBadge />}
              </p>
              <div className="grid grid-cols-3 gap-2 md:grid-cols-5">
                {profile.flatPhotoUrls.map((url) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={url} src={url} alt="" className="aspect-square rounded-lg object-cover" />
                ))}
              </div>
            </div>
            <div>
              <p className="mb-2 text-sm font-semibold text-chalk">Video of the flat</p>
              {profile.flatVideoUrl ? (
                <video src={profile.flatVideoUrl} controls className="aspect-video w-full rounded-lg bg-black" />
              ) : (
                <p className="text-base text-carbon">Not added yet</p>
              )}
            </div>
          </div>
        )}
      </SectionCard>

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

function AddMoreBadge() {
  return (
    <span className="rounded-full bg-bloom/15 px-2 py-0.5 text-xs font-medium text-bloom-text">Add more</span>
  );
}

function FieldRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium text-carbon-text">{label}</p>
      <p className="mt-0.5 text-base">{value}</p>
    </div>
  );
}

function SectionCard({
  id,
  title,
  editing,
  onEdit,
  needsAttention = false,
  children,
}: {
  id?: string;
  title: string;
  editing: boolean;
  onEdit: () => void;
  needsAttention?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Surface id={id} className={`p-5 ${needsAttention ? "ring-2 ring-bloom/60" : ""}`}>
      <div className="mb-3 flex items-center justify-between">
        <span className="text-sm font-semibold text-chalk">{title}</span>
        {!editing && (
          <button type="button" onClick={onEdit} className="text-sm font-semibold text-riviera">
            Edit
          </button>
        )}
      </div>
      {children}
    </Surface>
  );
}

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
