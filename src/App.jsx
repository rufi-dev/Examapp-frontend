import { BrowserRouter, Routes, Route, Navigate, Outlet } from "react-router-dom";
import Layout from "./components/Layout";
// Home (the landing) is loaded EAGERLY, not lazily, so the first paint is the
// actual page — no Suspense spinner / blank screen when someone opens the site.
import Home from "./pages/Home";
import ScrollToTop from "./components/ScrollToTop";
import PendingJoinHandler from "./components/PendingJoinHandler";
import ProfileCompletionGate from "./components/ProfileCompletionGate";
import axios from "axios";
import { ToastContainer, Slide } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { lazy, Suspense, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  getLoginStatus,
  getUser,
  selectIsLoggedIn,
  selectUser,
} from "../redux/features/auth/authSlice";
import { GoogleOAuthProvider } from "@react-oauth/google";
import Spinner from "./components/Spinner";
import Modal from "react-modal";
import AccountLayout from "./components/AccountLayout";
import { disableReactDevTools } from "@fvilers/disable-react-devtools";
import { useCookies } from "react-cookie";
import CookieConsent from "./components/CookieConsent";
import InstallPrompt from "./components/InstallPrompt";

axios.defaults.withCredentials = true;

// The frontend (Vercel) and API (Hetzner) are on different domains, so the auth
// cookie is a third-party cookie that Safari/iOS and privacy browsers drop —
// which is why most phones couldn't stay logged in. We send the JWT (saved at
// login) in an Authorization header instead, which works on every device. The
// cookie stays as a fallback where it still works.
axios.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

const Login = lazy(() => import("./pages/auth/Login"));
const Register = lazy(() => import("./pages/auth/Register"));
const Forgot = lazy(() => import("./pages/auth/Forgot"));
const Reset = lazy(() => import("./pages/auth/Reset"));
const LoginWithCode = lazy(() => import("./pages/auth/LoginWithCode"));
const Verify = lazy(() => import("./pages/auth/Verify"));
const Profile = lazy(() => import("./pages/profile/Profile"));
const UserList = lazy(() => import("./pages/profile/UserList"));
const Classes = lazy(() => import("./pages/Classes"));
const Exams = lazy(() => import("./pages/Exams"));
const Overview = lazy(() => import("./pages/Overview"));
const Connections = lazy(() => import("./pages/Connections"));
const VideoLessons = lazy(() => import("./pages/VideoLessons"));
const ArchivedExams = lazy(() => import("./pages/admin/ArchivedExams"));
const OurSuccess = lazy(() => import("./pages/OurSuccess"));
const About = lazy(() => import("./pages/About"));
const Contact = lazy(() => import("./pages/Contact"));
const ExamAdd = lazy(() => import("./pages/admin/ExamAdd"));
const ClassAdd = lazy(() => import("./pages/admin/ClassAdd"));
const ClassEdit = lazy(() => import("./pages/admin/ClassEdit"));
const ExamEdit = lazy(() => import("./pages/admin/ExamEdit"));
const QuestionAdd = lazy(() => import("./pages/admin/QuestionAdd"));
const StructuredBuilder = lazy(() => import("./pages/admin/StructuredBuilder"));
const UserDetails = lazy(() => import("./pages/admin/UserDetails"));
const AiUsage = lazy(() => import("./pages/admin/AiUsage"));
const ExamResults = lazy(() => import("./pages/admin/ExamResults"));
const ExamInstructions = lazy(() => import("./pages/exam/ExamInstructions"));
const JoinByLink = lazy(() => import("./pages/JoinByLink"));
const Quiz = lazy(() => import("./pages/exam/Quiz"));
const Result = lazy(() => import("./pages/exam/Result"));
const MyResults = lazy(() => import("./pages/exam/MyResults"));
const MyExams = lazy(() => import("./pages/exam/MyExams"));
const Review = lazy(() => import("./pages/exam/Review"));
const ResultsByExam = lazy(() => import("./pages/exam/ResultsByExam"));
const LiveExam = lazy(() => import("./pages/exam/LiveExam"));

const Wrapper = ({ children }) => {
  const [cookies] = useCookies(["cookie_consent"]);

  // Scroll reset on route change is handled once by <ScrollToTop /> (instant);
  // no second smooth scroll here, which would otherwise glide on every nav.
  return (
    <div className="relative">
      {children}
      {!cookies.cookie_consent && <CookieConsent />}
      <InstallPrompt />
    </div>
  );
};

// Dashboard routes: only for logged-in users; otherwise back to login.
const RequireAuth = () => {
  const isLoggedIn = useSelector(selectIsLoggedIn);
  return isLoggedIn ? <Outlet /> : <Navigate to="/login" replace />;
};

// Public/auth routes: logged-in users are sent straight to the dashboard.
const RedirectIfAuth = () => {
  const isLoggedIn = useSelector(selectIsLoggedIn);
  return isLoggedIn ? <Navigate to="/dashboard" replace /> : <Outlet />;
};

function App() {
  const dispatch = useDispatch();
  const isLoggedIn = useSelector(selectIsLoggedIn);
  const user = useSelector(selectUser);

  // Revalidate the session in the BACKGROUND. We don't block the UI on it:
  // isLoggedIn is hydrated synchronously from the stored token, so the page
  // (hero + its own section loaders) renders immediately on every refresh
  // instead of sitting behind a full-screen spinner.
  useEffect(() => {
    dispatch(getLoginStatus());
  }, [dispatch]);

  useEffect(() => {
    if (isLoggedIn && user === null) {
      dispatch(getUser());
    }
  }, [dispatch, isLoggedIn, user]);

  Modal.setAppElement("#root");

  if (import.meta.env.VITE_DEVELOPMENT_STATUS === "production") {
    disableReactDevTools();
  }

  return (
    <BrowserRouter>
      <ScrollToTop />
      <PendingJoinHandler />
      <ProfileCompletionGate />
      <Wrapper>
        <ToastContainer
          position="top-right"
          autoClose={3000}
          limit={3}
          newestOnTop
          closeOnClick
          pauseOnHover
          draggable
          transition={Slide}
        />
        <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID}>
          <Suspense
            fallback={
              <div className="flex min-h-[50vh] items-center justify-center">
                <Spinner size={44} className="text-primary" />
              </div>
            }
          >
          <Routes>
            {/* Home is open to EVERYONE — logged-in users can return here too. */}
            <Route
              index
              element={
                <Layout>
                  <Home />
                </Layout>
              }
            />

            {/* Auth pages: a logged-in user is sent straight to the dashboard. */}
            <Route element={<RedirectIfAuth />}>
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
            </Route>

            {/* Shareable class-join link (works logged in or out). */}
            <Route path="/join/:code" element={<JoinByLink />} />

            {/* Auth utility routes */}
            <Route path="/forgot" element={<Forgot />} />
            <Route path="/resetPassword/:resetToken" element={<Reset />} />
            <Route path="/loginWithCode/:email" element={<LoginWithCode />} />
            <Route path="/verify/:verificationToken" element={<Verify />} />

            {/* Public marketing pages (open to everyone) */}
            <Route
              path="/ourSuccess"
              element={
                <Layout>
                  <OurSuccess />
                </Layout>
              }
            />
            <Route
              path="/about"
              element={
                <Layout>
                  <About />
                </Layout>
              }
            />
            <Route
              path="/contact"
              element={
                <Layout>
                  <Contact />
                </Layout>
              }
            />

            {/* Dashboard area (logged-in only) */}
            <Route element={<RequireAuth />}>
              <Route path="/dashboard" element={<Overview />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/connections" element={<Connections />} />
              <Route path="/videos" element={<VideoLessons />} />
              <Route path="/trash" element={<ArchivedExams />} />
              <Route path="/users" element={<UserList />} />
              <Route path="/aiUsage" element={<AiUsage />} />
              <Route path="/examResults" element={<ExamResults />} />
              {/* Achievements manager inside the dashboard shell (the public
                  /ourSuccess page above stays for visitors). */}
              <Route
                path="/achievements"
                element={
                  <AccountLayout title="Nailiyyətlərimiz" subtitle="Tələbələrimizin qazandığı uğurlar.">
                    <OurSuccess embedded />
                  </AccountLayout>
                }
              />
              <Route path="/myResults" element={<MyResults />} />
              <Route path="/myExams" element={<MyExams />} />
              <Route path="/user/:id/details" element={<UserDetails />} />
              <Route path="/classAdd" element={<ClassAdd />} />
              <Route path="/class/edit/:classId" element={<ClassEdit />} />
              <Route path="/examAdd/:classId" element={<ExamAdd />} />
              <Route path="/exam/edit/:examId" element={<ExamEdit />} />

              <Route path="/classes" element={<Classes />} />
              <Route path="/exam/:classId" element={<Exams />} />
              <Route path="/exams/:id" element={<Exams />} />
              <Route path="/exam/details/:examId" element={<ExamInstructions />} />
              <Route path="/exam/:examId/result" element={<Result />} />
              <Route path="/exam/:examId/resultsByExam" element={<ResultsByExam />} />
              <Route path="/exam/:examId/live" element={<LiveExam />} />

              {/* Full-width focus pages (PDF builder / review / exam runner) */}
              <Route path="/exam/:examId/addQuestion" element={<QuestionAdd />} />
              <Route path="/exam/:examId/build" element={<StructuredBuilder />} />
              <Route path="/result/:resultId/review" element={<Review />} />
              <Route path="/exam/:examId/start" element={<Quiz />} />
            </Route>

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          </Suspense>
        </GoogleOAuthProvider>
      </Wrapper>
    </BrowserRouter>
  );
}

export default App;
