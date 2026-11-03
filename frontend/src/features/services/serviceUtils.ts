import type { TicketStatus } from "./serviceTypes.ts";

export function ticketStatusLabel(status: TicketStatus): string {
  if (status === "OPEN") return "Open";
  if (status === "IN_PROGRESS") return "In Progress";
  if (status === "RESOLVED") return "Resolved";
  return "Closed";
}

export function ticketTone(status: TicketStatus): "open" | "progress" | "done" | "neutral" {
  if (status === "OPEN") return "open";
  if (status === "IN_PROGRESS") return "progress";
  if (status === "RESOLVED") return "done";
  return "neutral";
}

export function isEditableRating(editCount: number, editableUntil?: string, now = Date.now()): boolean {
  if (editCount >= 1) return false;
  if (!editableUntil) return true;
  return new Date(editableUntil).getTime() >= now;
}

export function ratingWindowMessage(editableUntil?: string): string {
  if (!editableUntil) return "Batas edit mengikuti status server.";
  return `Dapat diedit satu kali sampai ${editableUntil}.`;
}
