import { BrowserRouter, Routes, Route, Navigate, Outlet } from "react-router-dom";
import Layout from "./components/Layout";
import ScrollToTop from "./components/ScrollToTop";
import axios from "axios";
import { ToastContainer, Slide } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { lazy, Suspense, useEffect, useState } from "react";
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

const Home = lazy(() => import("./pages/Home"));
const Login = lazy(() => import("./pages/auth/Login"));
const Register = lazy(() => import("./pages/auth/Register"));
const Forgot = lazy(() => import("./pages/auth/Forgot"));
const Reset = lazy(() => import("./pages/auth/Reset"));
const LoginWithCode = lazy(() => import("./pages/auth/LoginWithCode"));
const Verify = lazy(() => import("./pages/auth/Verify"));
const Profile = lazy(() => import("./pages/profile/Profile"));
const ChangePassword = lazy(() => import("./pages/auth/ChangePassword"));
const UserList = lazy(() => import("./pages/profile/UserList"));
const Tags = lazy(() => import("./pages/Tags"));
const Classes = lazy(() => import("./pages/Classes"));
const Exams = lazy(() => import("./pages/Exams"));
const Overview = lazy(() => import("./pages/Overview"));
const OurSuccess = lazy(() => import("./pages/OurSuccess"));
const ExamAdd = lazy(() => import("./pages/admin/ExamAdd"));
const TagAdd = lazy(() => import("./pages/admin/TagAdd"));
const ClassAdd = lazy(() => import("./pages/admin/ClassAdd"));
const ClassEdit = lazy(() => import("./pages/admin/ClassEdit"));
const ExamEdit = lazy(() => import("./pages/admin/ExamEdit"));
const QuestionAdd = lazy(() => import("./pages/admin/QuestionAdd"));
const TagEdit = lazy(() => import("./pages/admin/TagEdit"));
const UserDetails = lazy(() => import("./pages/admin/UserDetails"));
const ExamResults = lazy(() => import("./pages/admin/ExamResults"));
const Notifications = lazy(() => import("./pages/admin/Notifications"));
const ExamInstructions = lazy(() => import("./pages/exam/ExamInstructions"));
const Quiz = lazy(() => import("./pages/exam/Quiz"));
const Result = lazy(() => import("./pages/exam/Result"));
const MyResults = lazy(() => import("./pages/exam/MyResults"));
const MyExams = lazy(() => import("./pages/exam/MyExams"));
const Review = lazy(() => import("./pages/exam/Review"));
const ResultsByExam = lazy(() => import("./pages/exam/ResultsByExam"));

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
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    Promise.resolve(dispatch(getLoginStatus())).finally(() => setChecked(true));
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

  if (!checked) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg">
        <Spinner size={48} className="text-primary" />
      </div>
    );
  }

  return (
    <BrowserRouter>
      <ScrollToTop />
      <Wrapper>
        <ToastContainer
          position="top-right"
          autoClose={3000}
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
            {/* Public marketing + auth (logged-in users redirected to /dashboard) */}
            <Route element={<RedirectIfAuth />}>
              <Route
                index
                element={
                  <Layout>
                    <Home />
                  </Layout>
                }
              />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
            </Route>

            {/* Auth utility routes */}
            <Route path="/forgot" element={<Forgot />} />
            <Route path="/resetPassword/:resetToken" element={<Reset />} />
            <Route path="/loginWithCode/:email" element={<LoginWithCode />} />
            <Route path="/verify/:verificationToken" element={<Verify />} />

            {/* Public marketing page (open to everyone) */}
            <Route
              path="/ourSuccess"
              element={
                <Layout>
                  <OurSuccess />
                </Layout>
              }
            />

            {/* Dashboard area (logged-in only) */}
            <Route element={<RequireAuth />}>
              <Route path="/dashboard" element={<Overview />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/changePassword" element={<ChangePassword />} />
              <Route path="/users" element={<UserList />} />
              <Route path="/examResults" element={<ExamResults />} />
              <Route path="/notifications" element={<Notifications />} />
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
              <Route path="/tagAdd" element={<TagAdd />} />
              <Route path="/classAdd/:tagId" element={<ClassAdd />} />
              <Route path="/class/edit/:classId" element={<ClassEdit />} />
              <Route path="/examAdd/:classId" element={<ExamAdd />} />
              <Route path="/exam/edit/:examId" element={<ExamEdit />} />
              <Route path="/tag/edit/:tagId" element={<TagEdit />} />

              <Route path="/tags" element={<Tags />} />
              <Route path="/class/:tagId" element={<Classes />} />
              <Route path="/exam/:classId" element={<Exams />} />
              <Route path="/exams/:id" element={<Exams />} />
              <Route path="/exam/details/:examId" element={<ExamInstructions />} />
              <Route path="/exam/:examId/result" element={<Result />} />
              <Route path="/exam/:examId/resultsByExam" element={<ResultsByExam />} />

              {/* Full-width focus pages (PDF builder / review / exam runner) */}
              <Route path="/exam/:examId/addQuestion" element={<QuestionAdd />} />
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
