// Aturan Tahap 7 (PRD §4.5–§4.6 + pengesahan: Opsi A untuk sertifikat,
// verifikasi publik/QR tidak dibangun).
export const SERVICE_RULES = {
  RATING_MIN: 1,
  RATING_MAX: 5,
  // Edit maksimal 1× dalam 7 hari sejak rating pertama.
  RATING_EDIT_DAYS: 7,
  TICKET_TITLE_MAX: 200,
  TICKET_DESC_MAX: 5000,
  CERT_NUMBER_PREFIX: 'SPLI',
} as const;

export const SERVICE_AUDIT_ACTIONS = {
  RATING_CREATED: 'rating.created',
  RATING_EDITED: 'rating.edited',
  CERTIFICATE_ISSUED: 'certificate.issued',
  TICKET_CREATED: 'ticket.created',
  TICKET_UPDATED: 'ticket.updated',
  TICKET_STATUS_CHANGED: 'ticket.status_changed',
} as const;

// Transisi tiket yang diizinkan. Buka ulang hanya oleh Admin
// (RESOLVED/CLOSED → IN_PROGRESS); selain itu maju satu langkah.
export const TICKET_TRANSITIONS: Record<string, string[]> = {
  OPEN: ['IN_PROGRESS'],
  IN_PROGRESS: ['RESOLVED'],
  RESOLVED: ['CLOSED', 'IN_PROGRESS'],
  CLOSED: ['IN_PROGRESS'],
};
