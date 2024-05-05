import {
  HashRouter,
  BrowserRouter,
  Routes,
  Route,
  useLocation,
} from "react-router-dom";
import Home from "./pages/Home";
import Layout from "./components/Layout";
import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";
import Forgot from "./pages/auth/Forgot";
import Reset from "./pages/auth/Reset";
import LoginWithCode from "./pages/auth/LoginWithCode";
import Verify from "./pages/auth/Verify";
import Profile from "./pages/profile/Profile";
import ChangePassword from "./pages/auth/ChangePassword";
import UserList from "./pages/profile/UserList";
import Loader from "./components/Loader";
import axios from "axios";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useEffect, useLayoutEffect, useState } from "react";
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
import Questions from "./components/Questions";
import Quiz from "./pages/exam/Quiz";
import Result from "./pages/exam/Result";
import MyResults from "./pages/exam/MyResults";
import MyExams from "./pages/exam/MyExams";
import Review from "./pages/exam/Review";
import UserDetails from "./pages/admin/UserDetails";
import OurSuccess from "./pages/OurSuccess";
import Modal from "react-modal";
import { pdfjs } from "react-pdf";
import ClassAdd from "./pages/admin/ClassAdd";
import Classes from "./pages/Classes";
import { disableReactDevTools } from "@fvilers/disable-react-devtools";
import ResultsByExam from "./pages/exam/ResultsByExam";
import Cookie from "./components/Cookie";

axios.defaults.withCredentials = true;

const Wrapper = ({ children }) => {
  const location = useLocation();

  useLayoutEffect(() => {
    document.documentElement.scrollTo(0, 0);
  }, [location.pathname]);

  return children;
};

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.js",
  import.meta.url
).toString();

function App() {
  const dispatch = useDispatch();

  const isLoggedIn = useSelector(selectIsLoggedIn);
  const user = useSelector(selectUser);

  useEffect(() => {
    dispatch(getLoginStatus());

    if (isLoggedIn && user === null) {
      dispatch(getUser());
    }
  }, [dispatch, isLoggedIn, user]);
  Modal.setAppElement("#root");

  if (import.meta.env.VITE_DEVELOPMENT_STATUS === "production") {
    disableReactDevTools();
  }

  return (
    <>
      <BrowserRouter>
        <Wrapper>
          <ToastContainer />
          <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID}>
            <Routes>
              
              <Route
                index
                exact
                element={
                  <Layout>
                    <Home />
                    <Cookie/>
                  </Layout>
                }
              />

              <Route path="/login" exact element={<Login />} />

              <Route path="/register" exact element={<Register />} />

              <Route path="/forgot" exact element={<Forgot />} />

              <Route
                path="/resetPassword/:resetToken"
                exact
                element={<Reset />}
              />

              <Route
                path="/loginWithCode/:email"
                exact
                element={<LoginWithCode />}
              />

              <Route
                path="/verify/:verificationToken"
                exact
                element={<Verify />}
              />

              <Route
                path="/profile"
                exact
                element={
                  <Layout>
                    <Profile />
                  </Layout>
                }
              />

              <Route
                path="/changePassword"
                exact
                element={
                  <Layout>
                    <ChangePassword />
                  </Layout>
                }
              />

              <Route
                path="/users"
                exact
                element={
                  <Layout>
                    <UserList />
                  </Layout>
                }
              />

              <Route
                path="/tags"
                exact
                element={
                  <Layout>
                    <Tags />
                  </Layout>
                }
              />

              <Route
                path="/exams/:id"
                exact
                element={
                  <Layout>
                    <Exams />
                  </Layout>
                }
              />

              <Route
                path="/exam/:classId"
                exact
                element={
                  <Layout>
                    <Exams />
                  </Layout>
                }
              />

              <Route
                path="/class/:tagId"
                exact
                element={
                  <Layout>
                    <Classes />
                  </Layout>
                }
              />

              <Route
                path="/classAdd/:tagId"
                exact
                element={
                  <Layout>
                    <ClassAdd />
                  </Layout>
                }
              />

              <Route
                path="/examAdd/:classId"
                exact
                element={
                  <Layout>
                    <ExamAdd />
                  </Layout>
                }
              />

              <Route
                path="/tagAdd"
                exact
                element={
                  <Layout>
                    <TagAdd />
                  </Layout>
                }
              />

              <Route
                path="/exam/edit/:examId"
                exact
                element={
                  <Layout>
                    <ExamEdit />
                  </Layout>
                }
              />

              <Route
                path="/exam/:examId/addQuestion"
                exact
                element={
                  <Layout>
                    <QuestionAdd />
                  </Layout>
                }
              />

              <Route
                path="/exam/details/:examId"
                exact
                element={
                  <Layout>
                    <ExamInstructions />
                  </Layout>
                }
              />

              <Route path="/exam/:examId/start" exact element={<Quiz />} />
              <Route path="/exam/:examId/result" exact element={<Result />} />
              <Route
                path="/exam/:examId/resultsByExam"
                exact
                element={
                  <Layout>
                    <ResultsByExam />
                  </Layout>
                }
              />

              <Route
                path="/tag/edit/:tagId"
                exact
                element={
                  <Layout>
                    <TagEdit />
                  </Layout>
                }
              />

              <Route
                path="/myResults"
                exact
                element={
                  <Layout>
                    <MyResults />
                  </Layout>
                }
              />
              <Route
                path="/myExams"
                exact
                element={
                  <Layout>
                    <MyExams />
                  </Layout>
                }
              />
              <Route
                path="/result/:resultId/review"
                exact
                element={
                  <Layout>
                    <Review />
                  </Layout>
                }
              />
              <Route
                path="/user/:id/details"
                exact
                element={
                  <Layout>
                    <UserDetails />
                  </Layout>
                }
              />
              <Route
                path="/ourSuccess"
                exact
                element={
                  <Layout>
                    <OurSuccess />
                  </Layout>
                }
              />
            </Routes>
          </GoogleOAuthProvider>
        </Wrapper>
      </BrowserRouter>
    </>
  );
}

export default App;
