import { createSlice, createAsyncThunk } from "@reduxjs/toolkit"
import { toast } from "react-toastify"
import stripeService from "./stripeService";

const initialState = {
    url: null,
    isError: false,
    isSuccess: false,
    isLoading: false,
    message: "",
}

// Pay Exam
export const payExam = createAsyncThunk(
    "stripe/payExam",
    async ({ exam, userId }, thunkAPI) => {
        try {
            return await stripeService.payExam(exam, userId)
        } catch (error) {
            const message = (error.response && error.response.data && error.response.data.message)
                || error.message || error.toString()

            return thunkAPI.rejectWithValue(message)
        }
    }
)

const stripeSlice = createSlice({
    name: 'stripe',
    initialState,
    reducers: {

    },
    extraReducers: (builder) => {
        builder
            // Delete Achivement
            .addCase(payExam.pending, (state, action) => {
                state.isLoading = true;
            })
            .addCase(payExam.fulfilled, (state, action) => {
                state.isError = false;
                state.isLoading = false;
                state.isSuccess = true;
                state.url = action.payload
                window.location.href = action.payload
            })
            .addCase(payExam.rejected, (state, action) => {
                state.isError = true;
                state.isLoading = false;
                state.isSuccess = false;
                toast.error(action.payload)
            })
    }
})

export default stripeSlice.reducer