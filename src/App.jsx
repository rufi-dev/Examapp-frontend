import {
  HashRouter,
  BrowserRouter,
  Routes,
  Route,
  useLocation,
  useNavigate,
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
import { startExam } from "../redux/features/quiz/quizSlice";
import { addResult } from "../redux/features/quiz/resultSlice";
import { attempts_Number, earnPoints_Number } from "./helper/helper";

axios.defaults.withCredentials = true;

const Wrapper = ({ children }) => {
  const location = useLocation();

  useLayoutEffect(() => {
    document.documentElement.scrollTo(0, 0);
  }, [location]);
  return <>{children}</>;
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

  // const {
  //   singleExam,
  //   isExamStarted,
  //   singleClass,
  //   singleTag,
  //   queue,
  //   userAnswers,
  //   isLoading,
  // } = useSelector((state) => state.quiz);

  // const [timer, setTimer] = useState(() => {
  //   const storedTimer = !isNaN(parseInt(localStorage.getItem("quizCountdown")))
  //     ? parseInt(localStorage.getItem("quizCountdown"))
  //     : singleExam?.duration;

  //   return storedTimer ? parseInt(storedTimer, 10) : singleExam?.duration;
  // });

  // useEffect(() => {
  //   if (!isLoading && singleExam && isExamStarted) {
  //     localStorage.setItem("quizCountdown", timer.toString());
  //   }
  // }, [timer, isLoading, singleExam]);

  // const calculateResultData = () => {
  //   const attempts = attempts_Number(userAnswers);
  //   const earnPoints = earnPoints_Number(
  //     userAnswers,
  //     queue[0].correctAnswers,
  //     queue[0],
  //     singleClass,
  //     singleTag
  //   );
  //   console.log(queue[0].correctAnswers);
  //   return {
  //     attempts,
  //     earnPoints: earnPoints.earnedPoints > 0 ? earnPoints.earnedPoints : 0,
  //     selectedAnswers: userAnswers.map((answer) => ({
  //       type: answer?.type,
  //       answer: answer?.answer,
  //     })),
  //     correctAnswers: queue[0].correctAnswers.map((answer) => ({
  //       type: answer.type,
  //       answer: answer.answer,
  //     })),
  //     correctAnswersByType: earnPoints.correctAnswersByType.map((item) => ({
  //       type: item.type,
  //       count: item.count,
  //     })),
  //   };
  // };

  // useEffect(() => {
  //   if (isExamStarted && timer > 0) {
  //     const timerInterval = setInterval(() => {
  //       setTimer((prevTimer) => prevTimer - 1);
  //     }, 1000);
  
  //     return () => clearInterval(timerInterval);
  //   } else if (timer === 0) {
  //     try {
  //       const resultData = calculateResultData();
  //       console.log(resultData)
  //       dispatch(addResult({ examId: singleExam._id, resultData }));
  //       dispatch(startExam(false));
  //       localStorage.removeItem("quizCountdown");
  //       // Redirect the user to the result page or take any other appropriate action
  //       // Example:
  //       window.location.assign(`/exam/${singleExam._id}/result`);
  //     } catch (error) {
  //       console.error("Error submitting answer sheet:", error);
  //       // Handle error appropriately
  //     }
  //   }
  // }, [isExamStarted, timer]);
  
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

              <Route
                path="/exam/:examId/start"
                exact
                element={<Quiz/>}
              />
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
