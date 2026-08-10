"use client";

// Read-only replay of what ConfirmReviewModal showed before confirming
// (dates, settlement amount, fee breakdown, obligations) plus the legal
// next-step guidance, reachable any time afterward via TripDetails' "View
// swap details" button, since that information otherwise only ever
// appeared once.

import {
  SettlementCard,
  FeeCard,
  LegalNextStepCard,
  ObligationsCard,
  StayDatesCard,
  type ConfirmationCharge,
  type SettlementPreview,
} from "./swapReview";

export default function SwapRecapModal({
  otherUserName,
  isMePaying,
  stayFrom,
  stayTo,
  isComplete,
  settlement,
  confirmationCharge,
  onClose,
}: {
  otherUserName: string;
  isMePaying: boolean;
  stayFrom: string;
  stayTo: string;
  // Unused for wording now (settlement is always framed the same way,
  // "settle directly between yourselves") but kept so callers don't need to
  // change — may drive a "stay complete" badge later.
  isComplete: boolean;
  settlement: SettlementPreview;
  confirmationCharge: ConfirmationCharge;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div
        className="scrollbar-hide max-h-[88vh] w-full max-w-md overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="font-display text-xl font-bold text-gray-900">Swap details</h2>
        <p className="mt-1 text-sm text-gray-500">
          What you agreed to with {otherUserName}, for reference.
        </p>

        <StayDatesCard stayFrom={stayFrom} stayTo={stayTo} />
        <SettlementCard preview={settlement} isMePaying={isMePaying} otherUserName={otherUserName} tense="final" />
        <FeeCard charge={confirmationCharge} otherUserName={otherUserName} />
        <ObligationsCard otherUserName={otherUserName} />
        <LegalNextStepCard stayFrom={stayFrom} stayTo={stayTo} otherUserName={otherUserName} />

        <button
          type="button"
          onClick={onClose}
          className="mt-5 w-full rounded-full bg-gradient-to-r from-bloom to-riviera px-4 py-3 text-sm font-medium text-white shadow-lg shadow-bloom/30"
        >
          Close
        </button>
      </div>
    </div>
  );
}
