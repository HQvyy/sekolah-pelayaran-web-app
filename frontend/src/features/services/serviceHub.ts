import { apiRequest } from "../../services/apiClient.ts";
import type {
  CertificateDetailResult,
  MyCertificateListResult,
  MyProgressResult,
  MyRatingListResult,
  RatingPayload,
  RatingResult,
  TicketDetailResult,
  TicketHistoryResult,
  TicketListResult,
  TicketPayload,
  TicketQuery,
  TicketStatus,
  UserProgressResult,
} from "./serviceTypes.ts";

// TODO: endpoint di bawah mengikuti usulan docs/api-specification.md dan kontraknya
// belum final. Ini hanya typed service dan belum boleh dianggap kontrak final sebelum
// review bersama backend.

function toQuery(params: Record<string, string | number | undefined>): string {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === "") continue;
    query.set(key, String(value));
  }
  const text = query.toString();
  return text ? `?${text}` : "";
}

export function getMyProgress(accessToken: string): Promise<MyProgressResult> {
  return apiRequest<MyProgressResult>("/me/progress", { accessToken });
}

export function getUserProgress(userId: string, accessToken: string): Promise<UserProgressResult> {
  return apiRequest<UserProgressResult>(`/users/${userId}/progress`, { accessToken });
}

export function listMyRatings(accessToken: string): Promise<MyRatingListResult> {
  return apiRequest<MyRatingListResult>("/me/ratings", { accessToken });
}

export function createRating(payload: RatingPayload, accessToken: string): Promise<RatingResult> {
  assertRatingScore(payload.score);
  return apiRequest<RatingResult>("/ratings", {
    method: "POST",
    body: JSON.stringify(payload),
    accessToken,
  });
}

export function updateRating(ratingId: string, payload: RatingPayload, accessToken: string): Promise<RatingResult> {
  assertRatingScore(payload.score);
  return apiRequest<RatingResult>(`/ratings/${ratingId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
    accessToken,
  });
}

export function listMyCertificates(accessToken: string): Promise<MyCertificateListResult> {
  return apiRequest<MyCertificateListResult>("/me/certificates", { accessToken });
}

export function getCertificate(certificateId: string, accessToken: string): Promise<CertificateDetailResult> {
  return apiRequest<CertificateDetailResult>(`/certificates/${certificateId}`, { accessToken });
}

export function certificatePdfUrl(certificateId: string): string {
  // TODO: URL unduhan final menunggu kontrak backend. Jangan memakai URL publik permanen.
  return `/api/v1/certificates/${certificateId}/pdf`;
}

export function listTickets(query: TicketQuery, accessToken: string): Promise<TicketListResult> {
  return apiRequest<TicketListResult>(`/tickets${toQuery(query as Record<string, string | number | undefined>)}`, {
    accessToken,
  });
}

export function createTicket(payload: TicketPayload, accessToken: string): Promise<TicketDetailResult> {
  return apiRequest<TicketDetailResult>("/tickets", {
    method: "POST",
    body: JSON.stringify(payload),
    accessToken,
  });
}

export function getTicket(ticketId: string, accessToken: string): Promise<TicketDetailResult> {
  return apiRequest<TicketDetailResult>(`/tickets/${ticketId}`, { accessToken });
}

export function updateTicketStatus(
  ticketId: string,
  status: TicketStatus,
  accessToken: string,
): Promise<TicketDetailResult> {
  return apiRequest<TicketDetailResult>(`/tickets/${ticketId}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
    accessToken,
  });
}

export function getTicketHistory(ticketId: string, accessToken: string): Promise<TicketHistoryResult> {
  return apiRequest<TicketHistoryResult>(`/tickets/${ticketId}/history`, { accessToken });
}

export function assertRatingScore(score: number): void {
  if (!Number.isInteger(score) || score < 1 || score > 5) {
    throw new Error("Rating harus bilangan bulat 1 sampai 5.");
  }
}
