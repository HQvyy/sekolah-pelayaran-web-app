import { Navigate, Route, Routes, useParams } from "react-router-dom";
import { AppErrorBoundary } from "../app/ErrorBoundary.tsx";
import { AppLayout, PublicLayout } from "../layouts/AppLayout.tsx";
import { CohortDetailPage, CohortFormPage, CohortListPage, MyEnrollmentPage } from "../features/accounts/CohortPages.tsx";
import { UserDetailPage, UserListPage } from "../features/accounts/UserPages.tsx";
import { UserImportPage } from "../features/accounts/UserImportPage.tsx";
import { ForgotPasswordPage } from "../features/auth/ForgotPasswordPage.tsx";
import { LoginPage } from "../features/auth/LoginPage.tsx";
import { OtpPage } from "../features/auth/OtpPage.tsx";
import { RegisterPage } from "../features/auth/RegisterPage.tsx";
import { ResetPasswordPage } from "../features/auth/ResetPasswordPage.tsx";
import { SessionExpiredPage } from "../features/auth/SessionExpiredPage.tsx";
import { ComponentPreviewPage } from "../features/home/ComponentPreviewPage.tsx";
import { DashboardPage } from "../features/home/DashboardPage.tsx";
import { HomePage } from "../features/home/HomePage.tsx";
import { ForbiddenPage, NotFoundPage } from "../features/home/StatusPages.tsx";
import { CategoryDetailPage } from "../features/learning/CategoryDetailPage.tsx";
import { CategoryFormPage } from "../features/learning/CategoryFormPage.tsx";
import { CategoryListPage } from "../features/learning/CategoryPages.tsx";
import { CourseDetailPage } from "../features/learning/CourseDetailPage.tsx";
import { CourseFormPage } from "../features/learning/CourseFormPage.tsx";
import { ChapterDetailPage, MaterialDetailPage, MaterialEditPage } from "../features/learning/MaterialPages.tsx";
import { CertificateDetailPage, CertificateListPage } from "../features/services/CertificatePages.tsx";
import { MyProgressPage } from "../features/services/ProgressPage.tsx";
import { RatingPage } from "../features/services/RatingPage.tsx";
import { TicketDetailPage, TicketFormPage, TicketListPage } from "../features/services/TicketPages.tsx";
import { AssessmentDetailPage } from "../features/cbt/AssessmentDetailPage.tsx";
import { AssessmentListPage } from "../features/cbt/AssessmentListPage.tsx";
import { AttemptPage } from "../features/cbt/AttemptPage.tsx";
import { AttemptResultPage } from "../features/cbt/AttemptResultPage.tsx";
import { EssayGradingPage, OverdueGradingPage } from "../features/cbt/EssayGradingPage.tsx";
import { AttendancePage } from "../features/live/AttendancePage.tsx";
import { LiveLessonDetailPage } from "../features/live/LiveLessonDetailPage.tsx";
import { LiveLessonFormPage } from "../features/live/LiveLessonFormPage.tsx";
import { LiveLessonListPage } from "../features/live/LiveLessonListPage.tsx";
import { ContentDashboardPage } from "../features/learning/ContentDashboardPage.tsx";
import { RequireAuth, RequireRole } from "./RequireRole.tsx";

function UserDetailRoute() {
  const { userId = "" } = useParams();
  return <UserDetailPage userId={userId} />;
}

function CohortDetailRoute() {
  const { cohortId = "" } = useParams();
  return <CohortDetailPage cohortId={cohortId} />;
}

function CohortEditRoute() {
  const { cohortId = "" } = useParams();
  return <CohortFormPage cohortId={cohortId} />;
}

function CategoryDetailRoute() {
  const { categoryId = "" } = useParams();
  return <CategoryDetailPage categoryId={categoryId} />;
}

function CategoryEditRoute() {
  const { categoryId = "" } = useParams();
  return <CategoryFormPage categoryId={categoryId} />;
}

function CourseDetailRoute() {
  const { courseId = "" } = useParams();
  return <CourseDetailPage courseId={courseId} />;
}

function CourseEditRoute() {
  const { courseId = "" } = useParams();
  return <CourseFormPage courseId={courseId} />;
}

function CourseCreateRoute() {
  const { categoryId = "" } = useParams();
  return <CourseFormPage categoryId={categoryId} />;
}

function ChapterDetailRoute() {
  const { chapterId = "" } = useParams();
  return <ChapterDetailPage chapterId={chapterId} />;
}

function MaterialDetailRoute() {
  const { materialId = "" } = useParams();
  return <MaterialDetailPage materialId={materialId} />;
}

function MaterialEditRoute() {
  const { materialId = "" } = useParams();
  return <MaterialEditPage materialId={materialId} />;
}

function LiveLessonDetailRoute() {
  const { liveLessonId = "" } = useParams();
  return <LiveLessonDetailPage liveLessonId={liveLessonId} />;
}

function LiveLessonEditRoute() {
  const { liveLessonId = "" } = useParams();
  return <LiveLessonFormPage liveLessonId={liveLessonId} />;
}

function AttendanceRoute() {
  const { liveLessonId = "" } = useParams();
  return <AttendancePage liveLessonId={liveLessonId} />;
}

function AssessmentDetailRoute() {
  const { assessmentId = "" } = useParams();
  return <AssessmentDetailPage assessmentId={assessmentId} />;
}

function AttemptRoute() {
  const { attemptId = "" } = useParams();
  return <AttemptPage attemptId={attemptId} />;
}

function AttemptResultRoute() {
  const { attemptId = "" } = useParams();
  return <AttemptResultPage attemptId={attemptId} />;
}

function CertificateDetailRoute() {
  const { certificateId = "" } = useParams();
  return <CertificateDetailPage certificateId={certificateId} />;
}

function TicketDetailRoute() {
  const { ticketId = "" } = useParams();
  return <TicketDetailPage ticketId={ticketId} />;
}

export function AppRoutes() {
  return (
    <AppErrorBoundary>
      <Routes>
        <Route path="/" element={<PublicLayout><HomePage /></PublicLayout>} />
        <Route path="/login" element={<PublicLayout><LoginPage /></PublicLayout>} />
        <Route path="/register" element={<PublicLayout><RegisterPage /></PublicLayout>} />
        <Route path="/auth/verify-otp" element={<PublicLayout><OtpPage /></PublicLayout>} />
        <Route path="/forgot-password" element={<PublicLayout><ForgotPasswordPage /></PublicLayout>} />
        <Route path="/reset-password" element={<PublicLayout><ResetPasswordPage /></PublicLayout>} />
        <Route path="/sesi-berakhir" element={<PublicLayout><SessionExpiredPage /></PublicLayout>} />
        <Route path="/403" element={<PublicLayout><ForbiddenPage /></PublicLayout>} />
        <Route path="/dashboard" element={<RequireAuth><AppLayout><DashboardPage /></AppLayout></RequireAuth>} />
        <Route path="/komponen" element={<RequireAuth><AppLayout><ComponentPreviewPage /></AppLayout></RequireAuth>} />
        <Route path="/belajar" element={<RequireAuth><AppLayout><CategoryListPage /></AppLayout></RequireAuth>} />
        <Route path="/belajar/kategori/:categoryId" element={<RequireAuth><AppLayout><CategoryDetailRoute /></AppLayout></RequireAuth>} />
        <Route path="/belajar/kursus/:courseId" element={<RequireAuth><AppLayout><CourseDetailRoute /></AppLayout></RequireAuth>} />
        <Route path="/belajar/bab/:chapterId" element={<RequireAuth><AppLayout><ChapterDetailRoute /></AppLayout></RequireAuth>} />
        <Route path="/belajar/materi/:materialId" element={<RequireAuth><AppLayout><MaterialDetailRoute /></AppLayout></RequireAuth>} />
        <Route path="/konten" element={<RequireRole roles={["ADMIN", "SUPERADMIN", "MENTOR"]}><AppLayout><ContentDashboardPage /></AppLayout></RequireRole>} />
        <Route path="/konten/kategori/baru" element={<RequireRole roles={["ADMIN", "SUPERADMIN"]}><AppLayout><CategoryFormPage /></AppLayout></RequireRole>} />
        <Route path="/konten/kategori/:categoryId/ubah" element={<RequireRole roles={["ADMIN", "SUPERADMIN"]}><AppLayout><CategoryEditRoute /></AppLayout></RequireRole>} />
        <Route path="/konten/kategori/:categoryId/kursus/baru" element={<RequireRole roles={["ADMIN", "SUPERADMIN", "MENTOR"]}><AppLayout><CourseCreateRoute /></AppLayout></RequireRole>} />
        <Route path="/konten/kursus/:courseId/ubah" element={<RequireRole roles={["ADMIN", "SUPERADMIN", "MENTOR"]}><AppLayout><CourseEditRoute /></AppLayout></RequireRole>} />
        <Route path="/konten/materi/:materialId/ubah" element={<RequireRole roles={["ADMIN", "SUPERADMIN", "MENTOR"]}><AppLayout><MaterialEditRoute /></AppLayout></RequireRole>} />
        <Route path="/kelas-live" element={<RequireAuth><AppLayout><LiveLessonListPage /></AppLayout></RequireAuth>} />
        <Route path="/kelas-live/baru" element={<RequireRole roles={["ADMIN", "SUPERADMIN", "MENTOR"]}><AppLayout><LiveLessonFormPage /></AppLayout></RequireRole>} />
        <Route path="/kelas-live/:liveLessonId" element={<RequireAuth><AppLayout><LiveLessonDetailRoute /></AppLayout></RequireAuth>} />
        <Route path="/kelas-live/:liveLessonId/ubah" element={<RequireRole roles={["ADMIN", "SUPERADMIN", "MENTOR"]}><AppLayout><LiveLessonEditRoute /></AppLayout></RequireRole>} />
        <Route path="/kelas-live/:liveLessonId/absensi" element={<RequireRole roles={["ADMIN", "SUPERADMIN", "MENTOR"]}><AppLayout><AttendanceRoute /></AppLayout></RequireRole>} />
        <Route path="/asesmen" element={<RequireAuth><AppLayout><AssessmentListPage /></AppLayout></RequireAuth>} />
        <Route path="/asesmen/:assessmentId" element={<RequireAuth><AppLayout><AssessmentDetailRoute /></AppLayout></RequireAuth>} />
        <Route path="/asesmen/attempt/:attemptId" element={<RequireAuth><AppLayout><AttemptRoute /></AppLayout></RequireAuth>} />
        <Route path="/asesmen/attempt/:attemptId/hasil" element={<RequireAuth><AppLayout><AttemptResultRoute /></AppLayout></RequireAuth>} />
        <Route path="/tiket" element={<RequireAuth><AppLayout><TicketListPage /></AppLayout></RequireAuth>} />
        <Route path="/tiket/baru" element={<RequireAuth><AppLayout><TicketFormPage /></AppLayout></RequireAuth>} />
        <Route path="/tiket/:ticketId" element={<RequireAuth><AppLayout><TicketDetailRoute /></AppLayout></RequireAuth>} />
        <Route path="/progres" element={<RequireRole roles={["TARUNA"]}><AppLayout><MyProgressPage /></AppLayout></RequireRole>} />
        <Route path="/rating" element={<RequireRole roles={["TARUNA"]}><AppLayout><RatingPage /></AppLayout></RequireRole>} />
        <Route path="/sertifikat" element={<RequireRole roles={["TARUNA"]}><AppLayout><CertificateListPage /></AppLayout></RequireRole>} />
        <Route path="/sertifikat/:certificateId" element={<RequireRole roles={["TARUNA"]}><AppLayout><CertificateDetailRoute /></AppLayout></RequireRole>} />
        <Route path="/enrollment-saya" element={<RequireAuth><AppLayout><MyEnrollmentPage /></AppLayout></RequireAuth>} />
        <Route path="/admin/pengguna" element={<RequireRole roles={["ADMIN", "SUPERADMIN"]}><AppLayout><UserListPage /></AppLayout></RequireRole>} />
        <Route path="/admin/pengguna/:userId" element={<RequireRole roles={["ADMIN", "SUPERADMIN"]}><AppLayout><UserDetailRoute /></AppLayout></RequireRole>} />
        <Route path="/admin/impor" element={<RequireRole roles={["ADMIN", "SUPERADMIN"]}><AppLayout><UserImportPage /></AppLayout></RequireRole>} />
        <Route path="/admin/angkatan" element={<RequireRole roles={["ADMIN", "SUPERADMIN"]}><AppLayout><CohortListPage /></AppLayout></RequireRole>} />
        <Route path="/admin/angkatan/baru" element={<RequireRole roles={["ADMIN", "SUPERADMIN"]}><AppLayout><CohortFormPage /></AppLayout></RequireRole>} />
        <Route path="/admin/angkatan/:cohortId" element={<RequireRole roles={["ADMIN", "SUPERADMIN"]}><AppLayout><CohortDetailRoute /></AppLayout></RequireRole>} />
        <Route path="/admin/angkatan/:cohortId/ubah" element={<RequireRole roles={["ADMIN", "SUPERADMIN"]}><AppLayout><CohortEditRoute /></AppLayout></RequireRole>} />
        <Route path="/mentor/koreksi-esai" element={<RequireRole roles={["MENTOR", "ADMIN", "SUPERADMIN"]}><AppLayout><EssayGradingPage /></AppLayout></RequireRole>} />
        <Route path="/admin/penilaian-terlambat" element={<RequireRole roles={["ADMIN", "SUPERADMIN"]}><AppLayout><OverdueGradingPage /></AppLayout></RequireRole>} />
        <Route path="/404" element={<PublicLayout><NotFoundPage /></PublicLayout>} />
        <Route path="*" element={<Navigate to="/404" replace />} />
      </Routes>
    </AppErrorBoundary>
  );
}
