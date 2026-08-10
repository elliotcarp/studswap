// Shared between /api/matches and /api/likes: the one-line preview shown
// under a name in the Matches/Liked lists. Prefers the actual last chat
// message; falls back to a status line describing where the swap stands
// (proposed, waiting on a confirmation, validated, cancelled) instead of a
// static "Say hi!" that never changed once there was real activity to show.

interface MatchForPreview {
  matchType: "MUTUAL" | "PAID";
  status: "PENDING" | "VALIDATED" | "CANCELLED";
  stayFrom: Date | null;
  stayTo: Date | null;
  confirmedByMe: boolean;
  confirmedByOther: boolean;
}

export function deriveChatPreview(
  match: MatchForPreview,
  otherUserName: string,
  lastMessageBody: string | undefined
): string {
  if (lastMessageBody) return lastMessageBody;

  if (match.status === "CANCELLED") return "Swap cancelled.";
  if (match.status === "VALIDATED") return "Swap confirmed!";

  if (match.stayFrom && match.stayTo) {
    if (match.confirmedByMe && !match.confirmedByOther) {
      return `You proposed dates, waiting on ${otherUserName}.`;
    }
    if (!match.confirmedByMe && match.confirmedByOther) {
      return `${otherUserName} proposed dates, your turn to confirm.`;
    }
  }

  return match.matchType === "MUTUAL" ? "You matched! Say hi." : "Like accepted! Say hi.";
}
