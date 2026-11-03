import { useEffect, useMemo, useRef, useState } from "react";
import { ApiError } from "../../services/apiClient.ts";
import { useAccessToken } from "../accounts/useAccountList.ts";
import {
  newIdempotencyKey,
  resumeAttempt,
  saveAnswer,
  submitAttempt,
} from "./cbtService.ts";
import type { Attempt, AttemptQuestion, AutosaveState } from "./cbtTypes.ts";
import {
  AUTOSAVE_INTERVAL_MS,
  attemptStatusLabel,
  autosaveLabel,
  formatDuration,
  isAttemptActive,
  remainingSeconds,
  shouldBlockEditing,
} from "./cbtUtils.ts";
import {
  Badge,
  Button,
  ButtonLink,
  Card,
  ConfirmDialog,
  ErrorAlert,
  InfoAlert,
  LoadingState,
} from "../../components/ui.tsx";

interface PendingAnswer {
  value: string | string[];
  idempotencyKey: string;
}

export function AttemptPage({ attemptId }: { attemptId: string }) {
  const accessToken = useAccessToken();
  const [attempt, setAttempt] = useState<Attempt | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
  const [activeQuestion, setActiveQuestion] = useState(0);
  const [autosave, setAutosave] = useState<AutosaveState>("SAVED");
  const [saveError, setSaveError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [remaining, setRemaining] = useState(0);
  const pendingRef = useRef<Record<string, PendingAnswer>>({});
  const timerRef = useRef<number | null>(null);
  const autosaveRef = useRef<number | null>(null);

  const current = attempt?.questions[activeQuestion];
  const expired = remaining <= 0 && Boolean(attempt);
  const blocked = attempt ? shouldBlockEditing(attempt.status, expired) : false;

  async function load() {
    if (!accessToken) {
      setLoading(false);
      setError("Sesi berakhir. Silakan masuk kembali.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const result = await resumeAttempt(attemptId, accessToken);
      applyAttempt(result.data);
    } catch (requestError) {
      if (requestError instanceof ApiError) {
        setError(requestError.message);
      } else {
        setError("Tidak dapat memuat attempt.");
      }
    } finally {
      setLoading(false);
    }
  }

  function applyAttempt(data: Attempt) {
    setAttempt(data);
    const initial: Record<string, string | string[]> = {};
    for (const question of data.questions) {
      const saved = question.savedAnswer ?? question.selectedOptionId ?? question.essayText ?? undefined;
      if (saved !== undefined && saved !== null) initial[question.questionId] = saved;
    }
    setAnswers(initial);
    setRemaining(remainingSeconds(data.serverNow, data.expiresAt));
  }

  async function persistAnswers(reason: "auto" | "manual") {
    if (!accessToken || !attempt || !isAttemptActive(attempt.status)) return;
    const entries = Object.entries(pendingRef.current);
    if (entries.length === 0) return;
    setAutosave("SAVING");
    setSaveError("");
    for (const [questionId, pending] of entries) {
      try {
        const question = attempt.questions.find((item) => item.questionId === questionId);
        const payload =
          question?.type === "ESSAY"
            ? { essayText: String(pending.value) }
            : { optionId: String(pending.value) };
        await saveAnswer(attemptId, questionId, payload, accessToken, pending.idempotencyKey);
        delete pendingRef.current[questionId];
      } catch (requestError) {
        setAutosave("ERROR");
        setSaveError(
          requestError instanceof ApiError
            ? `Autosave ${reason === "auto" ? "otomatis" : "manual"} gagal: ${requestError.message}`
            : "Autosave gagal. Periksa koneksi, jawaban tersimpan lokal dan akan dicoba lagi.",
        );
        return;
      }
    }
    setAutosave("SAVED");
  }

  function queueAnswer(questionId: string, value: string | string[]) {
    setAnswers((currentAnswers) => ({ ...currentAnswers, [questionId]: value }));
    const existing = pendingRef.current[questionId];
    pendingRef.current[questionId] = { value, idempotencyKey: existing?.idempotencyKey ?? newIdempotencyKey() };
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attemptId, accessToken]);

  useEffect(() => {
    if (!attempt) return;
    timerRef.current = window.setInterval(() => {
      setRemaining((value) => Math.max(0, value - 1));
    }, 1000);
    autosaveRef.current = window.setInterval(() => {
      void persistAnswers("auto");
    }, AUTOSAVE_INTERVAL_MS);
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
      if (autosaveRef.current) window.clearInterval(autosaveRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attempt?.attemptId, accessToken]);

  useEffect(() => {
    if (expired && attempt && isAttemptActive(attempt.status)) {
      setSaveError("Waktu habis menurut timer server. Ikuti status backend dan jangan mengulang submit lokal.");
    }
  }, [expired, attempt]);

  const progress = useMemo(() => {
    if (!attempt) return { answered: 0, total: 0 };
    const answered = attempt.questions.filter((question) => {
      const value = answers[question.questionId];
      if (Array.isArray(value)) return value.length > 0;
      return Boolean(value && String(value).trim());
    }).length;
    return { answered, total: attempt.questions.length };
  }, [attempt, answers]);

  async function handleSubmit() {
    if (!accessToken) {
      setSubmitError("Sesi berakhir. Silakan masuk kembali.");
      return;
    }
    setSubmitting(true);
    setSubmitError("");
    try {
      await persistAnswers("manual");
      await submitAttempt(attemptId, accessToken);
      setConfirmOpen(false);
      const refreshed = await resumeAttempt(attemptId, accessToken);
      applyAttempt(refreshed.data);
    } catch (requestError) {
      setSubmitError(
        requestError instanceof ApiError
          ? requestError.message
          : "Submit gagal. Jangan mengasumsikan berhasil sebelum server mengonfirmasi.",
      );
      setConfirmOpen(false);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <LoadingState label="Memuat attempt dari server..." />;
  if (error || !attempt || !current) {
    return (
      <div className="page">
        <Card>
          <h1>Layar Attempt</h1>
          <ErrorAlert>{error || "Attempt tidak ditemukan."}</ErrorAlert>
          <div className="button-row">
            <ButtonLink to="/asesmen">Kembali</ButtonLink>
            <Button variant="secondary" onClick={() => void load()}>
              Muat ulang dari server
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="page">
      <Card>
        <h1>Attempt CBT</h1>
        <p className="muted" role="timer" aria-live="polite">
          Sisa waktu server: {formatDuration(remaining)}. Status: {attemptStatusLabel(attempt.status)}.
          Sudah dijawab {progress.answered} dari {progress.total} soal.
        </p>
        <p>
          <Badge tone={autosave === "ERROR" ? "progress" : "done"}>{autosaveLabel(autosave)}</Badge>
        </p>
        {saveError ? <ErrorAlert>{saveError}</ErrorAlert> : null}
        {submitError ? <ErrorAlert>{submitError}</ErrorAlert> : null}
        {expired ? (
          <ErrorAlert>
            Waktu habis menurut server. Refresh untuk resume dari server dan ikuti instruksi backend.
          </ErrorAlert>
        ) : null}
        <div className="button-row">
          <Button variant="secondary" disabled={blocked} onClick={() => void persistAnswers("manual")}>
            Simpan sekarang
          </Button>
          <Button variant="primary" disabled={submitting || blocked} onClick={() => setConfirmOpen(true)}>
            {submitting ? "Mengirim..." : "Submit final"}
          </Button>
          <ButtonLink to={`/asesmen/attempt/${attemptId}/hasil`}>Lihat hasil</ButtonLink>
        </div>
      </Card>

      <Card>
        <h2>Navigasi Soal</h2>
        <div className="button-row">
          {attempt.questions.map((question, index) => {
            const value = answers[question.questionId];
            const answered = Array.isArray(value) ? value.length > 0 : Boolean(value && String(value).trim());
            return (
              <Button
                key={question.questionId}
                variant={index === activeQuestion ? "primary" : "secondary"}
                onClick={() => setActiveQuestion(index)}
                aria-label={`Soal ${index + 1}${answered ? " sudah dijawab" : ""}`}
              >
                {index + 1}
              </Button>
            );
          })}
        </div>
      </Card>

      <Card>
        <QuestionView
          question={current}
          index={activeQuestion}
          value={answers[current.questionId]}
          disabled={blocked}
          onChange={(value) => queueAnswer(current.questionId, value)}
        />
        <div className="button-row">
          <Button
            variant="secondary"
            disabled={activeQuestion === 0}
            onClick={() => setActiveQuestion((value) => Math.max(0, value - 1))}
          >
            Sebelumnya
          </Button>
          <Button
            variant="secondary"
            disabled={activeQuestion >= attempt.questions.length - 1}
            onClick={() => setActiveQuestion((value) => Math.min(attempt.questions.length - 1, value + 1))}
          >
            Berikutnya
          </Button>
        </div>
        <InfoAlert>
          Autosave tiap 30 detik memakai Idempotency-Key agar retry aman bila didukung backend. Tidak
          ada kunci jawaban yang dikirim atau disimpan di browser.
        </InfoAlert>
      </Card>

      {confirmOpen ? (
        <ConfirmDialog
          title="Submit attempt?"
          description="Pastikan semua jawaban tersimpan. Submit bersifat final dan idempotent di server."
          confirmLabel={submitting ? "Mengirim..." : "Ya, submit"}
          onClose={() => {
            if (!submitting) setConfirmOpen(false);
          }}
          onConfirm={() => {
            void handleSubmit();
          }}
        />
      ) : null}
    </div>
  );
}

function QuestionView({
  question,
  index,
  value,
  disabled,
  onChange,
}: {
  question: AttemptQuestion;
  index: number;
  value?: string | string[];
  disabled: boolean;
  onChange: (value: string | string[]) => void;
}) {
  if (question.type === "ESSAY") {
    return (
      <div className="form-field">
        <label htmlFor={`essay-${question.questionId}`}>Soal {index + 1} esai</label>
        <p className="muted">{question.prompt}</p>
        <textarea
          id={`essay-${question.questionId}`}
          value={typeof value === "string" ? value : ""}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value)}
          rows={6}
          placeholder="Tulis jawaban esai"
        />
      </div>
    );
  }

  return (
    <fieldset>
      <legend>Soal {index + 1} pilihan ganda</legend>
      <p className="muted">{question.prompt}</p>
      {(question.options ?? []).map((option) => (
        <label key={option.id} className="field-help">
          <input
            type="radio"
            name={`question-${question.questionId}`}
            value={option.id}
            checked={value === option.id}
            disabled={disabled}
            onChange={() => onChange(option.id)}
          />{" "}
          {option.label}
        </label>
      ))}
    </fieldset>
  );
}
