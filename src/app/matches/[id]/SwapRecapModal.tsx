"use client";

// Read-only replay of what ConfirmReviewModal showed before confirming
// (dates, settlement amount, fee breakdown, obligations) plus the legal
// next-step guidance, reachable any time afterward via TripDetails' "View
// swap details" button, since that information otherwise only ever
// appeared once.

import { motion } from "framer-motion";
import {
  SettlementCard,
  FeeCard,
  LegalNextStepCard,
  ObligationsCard,
  StayDatesCard,
  type ConfirmationCharge,
  type SettlementPreview,
} from "./swapReview";
import { SPRING_DEFAULT, usePrefersReducedMotion } from "@/lib/motion";
import Button from "@/components/ui/Button";

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
  const reducedMotion = usePrefersReducedMotion();
  return (
    <motion.div
      className="glass-scrim fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={reducedMotion ? { duration: 0.15 } : SPRING_DEFAULT}
    >
      <motion.div
        className="scrollbar-hide max-h-[88vh] w-full max-w-md overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        initial={reducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.92 }}
        animate={reducedMotion ? { opacity: 1 } : { opacity: 1, scale: 1 }}
        exit={reducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.92 }}
        transition={reducedMotion ? { duration: 0.15 } : SPRING_DEFAULT}
      >
        <h2 className="font-display text-xl font-bold text-gray-900">Swap details</h2>
        <p className="mt-1 text-sm text-gray-500">
          What you agreed to with {otherUserName}, for reference.
        </p>

        <StayDatesCard stayFrom={stayFrom} stayTo={stayTo} />
        <SettlementCard
          preview={settlement}
          isMePaying={isMePaying}
          otherUserName={otherUserName}
          tense="final"
          stayFrom={stayFrom}
          stayTo={stayTo}
        />
        <FeeCard charge={confirmationCharge} otherUserName={otherUserName} />
        <ObligationsCard otherUserName={otherUserName} />
        <LegalNextStepCard stayFrom={stayFrom} stayTo={stayTo} otherUserName={otherUserName} />

        <Button onClick={onClose} className="mt-5 w-full !py-3 text-sm">
          Close
        </Button>
      </motion.div>
    </motion.div>
  );
}
