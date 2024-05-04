import axios from "axios"

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL
export const API_URL = `${BACKEND_URL}/api/stripe/`

// Pay Exam
export const payExam = async (exam, userId) => {
    const response = await axios.post(API_URL + "create-checkout-session", { exam, userId })
    return response.data.url
};

const stripeService = {
    payExam
}

export default stripeService