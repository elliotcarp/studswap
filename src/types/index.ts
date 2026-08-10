export interface PromptAnswer {
  question: string;
  answer: string;
}

// Shared shape for the onboarding wizard and the profile edit page.
export interface ProfileFormData {
  name: string;
  age: string; // numeric string, form input value
  university: string;
  program: string;
  yearOfStudy: string;
  homeCity: string;
  address: string; // exact street address; only shown within a confirmed match, see ProfileCard's showAddress prop
  availableFrom: string; // yyyy-mm-dd
  availableTo: string; // yyyy-mm-dd
  accommodates: string; // "1" | "2" | "3" | "4" | "5+"
  pricePerDayCents: string; // numeric string, form input value, in cents (EUR)
  smoker: string;
  pets: string;
  selfPhotoUrls: string[]; // photos of the person; [0] is the profile picture
  flatPhotoUrls: string[]; // photos of the flat
  selfDescription: string;
  flatDescription: string;
  prompts: PromptAnswer[];
}

// Denormalized rating aggregate for a profile (see Rating model /
// swapLifecycle.ts). Always present, never optional — mirrors SwapSummary's
// settlement precedent of a required object with null/zero sentinels for
// "nothing yet," so cold start (completedSwapCount === 0) is a display
// concern, not an extra optional-chain at every call site. Null averages/
// percentages must never be rendered as a bare 0 — see ProfileCard's
// "New to StudSwap" treatment.
export interface RatingSummary {
  completedSwapCount: number;
  ratingCount: number;
  overallAvg: number | null;
  communicationAvg: number | null;
  flatMatchedPct: number | null;
  wouldAgainPct: number | null;
}

export interface ProfileCardData extends ProfileFormData {
  userId: string;
  ratingSummary: RatingSummary;
}

export type SwipeDirection = "LEFT" | "RIGHT";

// Candidate-search filters on the swipe screen. All string-based since they
// map directly to form inputs and URL query params.
export interface CandidateFilters {
  city: string;
  tripFrom: string; // yyyy-mm-dd
  tripTo: string; // yyyy-mm-dd
  minOverlapDays: string;
  minAccommodates: string; // "1" | "2" | "3" | "4" | "5+"
}

export interface MatchSummary {
  matchId: string;
  matchType: "MUTUAL" | "PAID";
  status: "PENDING" | "VALIDATED" | "CANCELLED";
  // Only meaningful when matchType is "PAID": who's paying to stay at whose
  // flat, see the status pill this drives (shared with ChatView's header).
  isPayer: boolean | null;
  otherUser: {
    id: string;
    name: string;
    photoUrl: string | null;
  };
  lastMessage?: string;
  unread: boolean;
  // Most recent message time, or createdAt if no messages yet: what the list
  // is sorted by, newest activity first.
  lastActivityAt: string;
  createdAt: string;
}

export interface NotificationCounts {
  likedCount: number;
  unreadMatchCount: number;
}

// A pending like on the "Liked" page: someone who swiped right on the viewer
// that the viewer hasn't responded to yet.
export interface LikerSummary {
  userId: string;
  name: string;
  homeCity: string;
  photoUrl: string | null;
  pricePerDayCents: number;
  totalPriceCents: number; // pricePerDayCents * their listed stay length
}

// A validated (confirmed) match, for the "Your swaps" page: the settlement
// info and exact address are only ever safe to show once a match reaches
// this state, see /api/matches/[id]/route.ts and ProfileCard's showAddress prop.
export interface SwapSummary {
  matchId: string;
  matchType: "MUTUAL" | "PAID";
  otherUser: {
    id: string;
    name: string;
    university: string;
    photoUrl: string | null;
  };
  city: string;
  address: string;
  stayFrom: string; // ISO date
  stayTo: string; // ISO date
  // StudSwap never moves this money — the two users settle it directly
  // between themselves, see otherPaymentHandle. markedPaidByPayer/
  // confirmedReceivedByPayee are self-reported, never verified by StudSwap.
  settlement: {
    amountCents: number; // 0 when nothing's owed
    direction: "paid" | "received" | "none"; // from the viewer's side
    markedPaidByPayer: boolean;
    confirmedReceivedByPayee: boolean;
  };
  // Only set once VALIDATED (which this always is, on the Swaps page) — how
  // to actually pay/reach the other side directly.
  otherPaymentHandle: string | null;
  // Outcome of the viewer's own €20 refundable portion of the confirmation
  // charge (see cancellationPolicy.ts): refunded a day into the stay, or
  // forfeited to the other side if the viewer cancelled late.
  myRefundableStatus: "PENDING" | "REFUNDED" | "FORFEITED";
  isComplete: boolean;
  lastMessage?: string;
  unread: boolean;
  createdAt: string;
  // Whether the current user can still submit a rating for this swap (stay
  // has ended, they haven't already rated, and the rating window hasn't
  // closed) — drives the "Rate this swap" pill on the Swaps page.
  canRate: boolean;
}

export interface MessageData {
  id: string;
  senderId: string;
  body: string;
  createdAt: string; // ISO date
}
