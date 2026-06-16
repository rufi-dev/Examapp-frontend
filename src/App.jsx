import { BrowserRouter, Routes, Route, Navigate, Outlet } from "react-router-dom";
import Home from "./pages/Home";
import Layout from "./components/Layout";
import ScrollToTop from "./components/ScrollToTop";
import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";
import Forgot from "./pages/auth/Forgot";
import Reset from "./pages/auth/Reset";
import LoginWithCode from "./pages/auth/LoginWithCode";
import Verify from "./pages/auth/Verify";
import Profile from "./pages/profile/Profile";
import ChangePassword from "./pages/auth/ChangePassword";
import UserList from "./pages/profile/UserList";
import axios from "axios";
import { ToastContainer, Slide } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  getLoginStatus,
  getUser,
  selectIsLoggedIn,
  selectUser,
} from "../redux/features/auth/authSlice";
import { GoogleOAuthProvider } from "@react-oauth/google";
import Tags from "./pages/Tags";
import ExamAdd from "./pages/admin/ExamAdd";
import TagAdd from "./pages/admin/TagAdd";
import Exams from "./pages/Exams";
import ExamEdit from "./pages/admin/ExamEdit";
import QuestionAdd from "./pages/admin/QuestionAdd";
import TagEdit from "./pages/admin/TagEdit";
import ExamInstructions from "./pages/exam/ExamInstructions";
import Quiz from "./pages/exam/Quiz";
import Result from "./pages/exam/Result";
import MyResults from "./pages/exam/MyResults";
import MyExams from "./pages/exam/MyExams";
import Review from "./pages/exam/Review";
import UserDetails from "./pages/admin/UserDetails";
import OurSuccess from "./pages/OurSuccess";
import Overview from "./pages/Overview";
import Spinner from "./components/Spinner";
import Modal from "react-modal";
import { pdfjs } from "react-pdf";
import ClassAdd from "./pages/admin/ClassAdd";
import ClassEdit from "./pages/admin/ClassEdit";
import ExamResults from "./pages/admin/ExamResults";
import AccountLayout from "./components/AccountLayout";
import Classes from "./pages/Classes";
import { disableReactDevTools } from "@fvilers/disable-react-devtools";
import ResultsByExam from "./pages/exam/ResultsByExam";
import { useCookies } from "react-cookie";
import CookieConsent from "./components/CookieConsent";

axios.defaults.withCredentials = true;

const Wrapper = ({ children }) => {
  const [cookies] = useCookies(["cookie_consent"]);

  // Scroll reset on route change is handled once by <ScrollToTop /> (instant);
  // no second smooth scroll here, which would otherwise glide on every nav.
  return (
    <div className="relative">
      {children}
      {!cookies.cookie_consent && <CookieConsent />}
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

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.js",
  import.meta.url
).toString();

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
        </GoogleOAuthProvider>
      </Wrapper>
    </BrowserRouter>
  );
}

export default App;
