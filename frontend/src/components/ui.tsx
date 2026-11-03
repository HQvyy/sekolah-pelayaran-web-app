import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Link, type LinkProps } from "react-router-dom";

type ButtonVariant = "primary" | "secondary" | "danger";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

export function Button({ variant = "primary", type = "button", ...props }: ButtonProps) {
  return <button type={type} className={`btn btn-${variant}`} {...props} />;
}

interface ButtonLinkProps extends LinkProps {
  variant?: ButtonVariant;
}

export function ButtonLink({ variant = "secondary", ...props }: ButtonLinkProps) {
  return <Link className={`btn btn-${variant}`} {...props} />;
}

export function Card({ children }: { children: ReactNode }) {
  return <section className="card">{children}</section>;
}

export function FieldError({ id, message }: { id?: string; message?: string }) {
  if (!message) return null;
  return (
    <p className="field-error" id={id} role="alert">
      {message}
    </p>
  );
}

type BadgeTone = "open" | "progress" | "done" | "neutral";

export function Badge({ tone = "neutral", children }: { tone?: BadgeTone; children: ReactNode }) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}

export function LoadingState({ label = "Memuat data..." }: { label?: string }) {
  return (
    <div className="state-box" role="status" aria-live="polite">
      <span className="spinner" aria-hidden="true" />
      <p className="muted">{label}</p>
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="state-box">
      <h2>{title}</h2>
      <p className="muted">{description}</p>
      {action}
    </div>
  );
}

export function ErrorState({
  title = "Terjadi kesalahan",
  description = "Coba muat ulang halaman atau kembali lagi nanti.",
  onRetry,
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="state-box" role="alert">
      <h2>{title}</h2>
      <p className="muted">{description}</p>
      {onRetry ? (
        <Button variant="secondary" onClick={onRetry}>
          Muat ulang
        </Button>
      ) : null}
    </div>
  );
}

export function SuccessAlert({ children }: { children: ReactNode }) {
  return (
    <div className="alert alert-success" role="status">
      {children}
    </div>
  );
}

export function ErrorAlert({ children }: { children: ReactNode }) {
  return (
    <div className="alert alert-error" role="alert">
      {children}
    </div>
  );
}

export function InfoAlert({ children }: { children: ReactNode }) {
  return (
    <div className="alert alert-info" role="status">
      {children}
    </div>
  );
}

export function ConfirmDialog({
  title,
  description,
  confirmLabel = "Ya, lanjutkan",
  cancelLabel = "Batal",
  onConfirm,
  onClose,
}: {
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <div className="dialog-backdrop" role="presentation" onClick={onClose}>
      <div
        className="dialog"
        role="alertdialog"
        aria-modal="true"
        aria-label={title}
        onClick={(event) => event.stopPropagation()}
      >
        <h2>{title}</h2>
        <p className="muted">{description}</p>
        <div className="button-row">
          <Button variant="secondary" onClick={onClose}>
            {cancelLabel}
          </Button>
          <Button variant="primary" onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}

export function SkeletonBlock({ label }: { label: string }) {
  return <div className="skeleton" role="status" aria-label={label} />;
}
