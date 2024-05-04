import { configureStore } from "@reduxjs/toolkit";
import authReducer from "../redux/features/auth/authSlice"
import emailReducer from "../redux/features/mail/emailSlice"
import filterReducer from "../redux/features/auth/filterSlice"
import quizReducer from "../redux/features/quiz/quizSlice"
import resultReducer from "./features/quiz/resultSlice";
import achivementReducer from "./features/achivement/achivementSlice";
import stripeReducer from "./features/stripe/stripeSlice";

export const store = configureStore({
    reducer: {
        auth: authReducer,
        email: emailReducer,
        filter: filterReducer,
        quiz: quizReducer,
        result: resultReducer,
        achivement: achivementReducer,
        stripe: stripeReducer
    },
})
