import type { ApiSuccess } from "../../types/api.ts";

export type TicketStatus = "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED";

export interface LearningProgress {
  completedMaterials: number;
  totalMaterials: number;
  completedAssessments: number;
  totalAssessments: number;
  percent: number;
  unlockedLevel?: number;
}

export interface TarunaProgressResult {
  userId: string;
  fullName?: string;
  progress: LearningProgress;
}

export interface Rating {
  id: string;
  classId?: string;
  mentorId?: string;
  classTitle?: string;
  mentorName?: string;
  score: number;
  feedback?: string;
  createdAt: string;
  updatedAt: string;
  editableUntil?: string;
  editCount: number;
}

export interface RatingPayload {
  classId?: string;
  mentorId?: string;
  score: number;
  feedback?: string;
}

export interface Certificate {
  id: string;
  certificateNumber: string;
  title: string;
  issuedAt: string;
  ownerName?: string;
}

export interface Ticket {
  id: string;
  title: string;
  description: string;
  category?: string;
  status: TicketStatus;
  ownerId: string;
  ownerName?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TicketQuery {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: TicketStatus | "";
}

export interface TicketPayload {
  title: string;
  description: string;
  category?: string;
}

export interface TicketHistoryItem {
  id: string;
  status?: TicketStatus;
  message?: string;
  actorName?: string;
  createdAt: string;
}

export type MyProgressResult = ApiSuccess<LearningProgress>;
export type UserProgressResult = ApiSuccess<TarunaProgressResult>;
export type MyRatingListResult = ApiSuccess<Rating[]>;
export type RatingResult = ApiSuccess<Rating>;
export type ClassRatingListResult = ApiSuccess<Rating[]>;
export type MyCertificateListResult = ApiSuccess<Certificate[]>;
export type CertificateDetailResult = ApiSuccess<Certificate>;
export type TicketListResult = ApiSuccess<Ticket[]>;
export type TicketDetailResult = ApiSuccess<Ticket>;
export type TicketHistoryResult = ApiSuccess<TicketHistoryItem[]>;

// TODO: tipe di atas mengikuti usulan docs/api-specification.md dan belum final.
// Jangan menambah endpoint, payload, respons, role, status, atau error code baru
// sebelum review dan persetujuan bersama backend. Progres, kelayakan rating,
// jendela edit, penerbitan sertifikat, dan status tiket selalu dari backend.
