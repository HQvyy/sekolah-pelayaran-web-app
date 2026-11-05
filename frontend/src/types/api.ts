export type UserRole = "SUPERADMIN" | "ADMIN" | "MENTOR" | "TARUNA";

export interface SessionUser {
  id: string;
  // Backend belum menyimpan nama tampilan; UI memakai email bila kosong.
  name?: string;
  email: string;
  role: UserRole;
}

export type ApiErrorDetail = {
  field?: string;
  code?: string;
  message: string;
};

export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
    details?: ApiErrorDetail[];
    requestId?: string;
  };
}

export interface PaginatedMeta {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

export interface ApiSuccess<T> {
  data: T;
  meta?: PaginatedMeta | null;
}
