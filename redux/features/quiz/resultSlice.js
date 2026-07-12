import { createSlice, createAsyncThunk } from "@reduxjs/toolkit"
import { toast } from "react-toastify"
import quizService from "./quizService"
import { useSelector } from "react-redux"

const initialState = {
    isLoading: false,
    isSuccess: false,
    isError: false,
    userId: null,
    result: [],
    resultsByExam: [],
    resultByExam: [],
    review: []
}

//Add Result. On failure rejects with a STRUCTURED value so the Quiz runner can
//tell a retryable network/5xx drop (-> buffer + auto-retry, no scary toast) from
//a real server rejection, and can branch on the server's reason code.
export const addResult = createAsyncThunk(
    "result/addResult",
    async ({ examId, resultData }, thunkAPI) => {
        try {
            return await quizService.addResult(examId, resultData)
        } catch (error) {
            const data = error.response && error.response.data
            const message = (data && data.message) || error.message || error.toString()
            return thunkAPI.rejectWithValue({
                message,
                isNetwork: !error.response,
                status: error.response ? error.response.status : 0,
                reason: data ? data.reason : undefined,
                unscorableReason: data ? data.unscorableReason : undefined,
                attemptId: data ? data.attemptId : undefined,
            })
        }
    }
)

//Get Results By User
export const getResultsByUser = createAsyncThunk(
    "result/getResultsByUser",
    async (_, thunkAPI) => {
        try {
            return await quizService.getResultsByUser()
        } catch (error) {
            const message = (error.response && error.response.data && error.response.data.message)
                || error.message || error.toString()

            return thunkAPI.rejectWithValue(message)
        }
    }
)

//Get Results By User By Exam
export const getResultsByUserByExam = createAsyncThunk(
    "result/getResultsByUserByExam",
    async (examId, thunkAPI) => {
        try {
            return await quizService.getResultsByUserByExam(examId)
        } catch (error) {
            const message = (error.response && error.response.data && error.response.data.message)
                || error.message || error.toString()

            return thunkAPI.rejectWithValue({
                message,
                status: error.response ? error.response.status : 0,
            })
        }
    }
)

//getResultsByExam
export const getResultsByExam = createAsyncThunk(
    "result/getResultsByExam",
    async (examId, thunkAPI) => {
        try {
            return await quizService.getResultsByExam(examId)
        } catch (error) {
            const message = (error.response && error.response.data && error.response.data.message)
                || error.message || error.toString()

            return thunkAPI.rejectWithValue(message)
        }
    }
)


//Review Result
export const reviewResult = createAsyncThunk(
    "result/reviewResult",
    async (resultId, thunkAPI) => {
        try {
            return await quizService.reviewResult(resultId)
        } catch (error) {
            const message = (error.response && error.response.data && error.response.data.message)
                || error.message || error.toString()

            return thunkAPI.rejectWithValue(message)
        }
    }
)

export const addPhotoToResult = createAsyncThunk(
    "result/addPhotoToResult",
    async ({ resultId, formData }, thunkAPI) => {
        try {
            return await quizService.addPhotoToResult(resultId, formData)
        } catch (error) {
            const message = (error.response && error.response.data && error.response.data.message)
                || error.message || error.toString()

            return thunkAPI.rejectWithValue(message)
        }
    }
)

const resultSlice = createSlice({
    name: 'result',
    initialState,
    reducers: {
        RESET_RESULT: (state) => {
            state.result = []
        },
        setUserId: (state, action) => {
            state.userId = action.payload
        },
        updateResultAction: (state, action) => {
            const { trace, checked } = action.payload
            state.result.fill(checked, trace, trace + 1)
        },
        pushResultAction: (state, action) => {
            state.result.push(action.payload)
        }
    },
    extraReducers: (builder) => {
        builder
            //Add Result
            .addCase(addResult.pending, (state, action) => {
                state.isLoading = true;
                state.isError = false;
            })
            .addCase(addResult.fulfilled, (state, action) => {
                state.isLoading = false;
                state.isSuccess = true;
                // payload is now the whole object { message, earnPoints, late }
                if (action.payload && action.payload.message) toast.success(action.payload.message)
            })
            .addCase(addResult.rejected, (state, action) => {
                state.isLoading = false;
                state.isError = true;
                const p = action.payload || {}
                state.message = p.message
                // Network drops and retryable server errors are handled by the Quiz
                // runner's banner + auto-retry — don't show a scary toast for those.
                const retryable = p.isNetwork || [408, 429, 502, 503, 504].includes(p.status)
                if (!retryable && p.message && typeof p.message === "string") toast.error(p.message)
            })

            //Get Results By User
            .addCase(getResultsByUser.pending, (state, action) => {
                state.isLoading = true;
            })
            .addCase(getResultsByUser.fulfilled, (state, action) => {
                state.isLoading = false;
                state.isSuccess = true;
                state.result = action.payload
            })
            .addCase(getResultsByUser.rejected, (state, action) => {
                state.isLoading = false;
                state.isError = true;
                state.result = null;
                toast.error(action.payload)
            })

            //Get Results By User By Exam
            .addCase(getResultsByUserByExam.pending, (state, action) => {
                state.isLoading = true;
            })
            .addCase(getResultsByUserByExam.fulfilled, (state, action) => {
                state.isLoading = false;
                state.isSuccess = true;
                state.resultByExam = action.payload
            })
            .addCase(getResultsByUserByExam.rejected, (state, action) => {
                state.isLoading = false;
                state.isError = true;
                // Keep an ARRAY (never null) so the Result page can index it safely,
                // and don't toast: 404/ownership noise is expected while polling for a
                // just-finalized result. A 401 is handled by the Result page's
                // return-path re-login (it reads action.payload.status).
                state.resultByExam = [];
                state.message = action.payload && action.payload.message;
            })

            //Get All Results By Exam
            .addCase(getResultsByExam.pending, (state, action) => {
                state.isLoading = true;
            })
            .addCase(getResultsByExam.fulfilled, (state, action) => {
                state.isLoading = false;
                state.isSuccess = true;
                state.resultsByExam = action.payload
            })
            .addCase(getResultsByExam.rejected, (state, action) => {
                state.isLoading = false;
                state.isError = true;
                state.resultsByExam = [];
                toast.error(action.payload)
            })

            //Review Result
            .addCase(reviewResult.pending, (state, action) => {
                state.isLoading = true;
            })
            .addCase(reviewResult.fulfilled, (state, action) => {
                state.isLoading = false;
                state.isSuccess = true;
                state.isError = false;
                state.review = action.payload
            })
            .addCase(reviewResult.rejected, (state, action) => {
                state.isLoading = false;
                state.isError = true;
                state.review = []
                state.message = action.payload;
                toast.error(action.payload)
            })

            //Add Photo To Result
            .addCase(addPhotoToResult.pending, (state, action) => {
                state.isLoading = true;
            })
            .addCase(addPhotoToResult.fulfilled, (state, action) => {
                state.isLoading = false;
                state.isSuccess = true;
                state.isError = false;
                console.log("Yeash", action.payload)
                state.review = action.payload
            })
            .addCase(addPhotoToResult.rejected, (state, action) => {
                state.isLoading = false;
                state.isError = true;
                state.review = []
                state.message = action.payload;
                toast.error(action.payload)
            })
    }
})

export const { setUserId, pushResultAction, updateResultAction, RESET_RESULT } = resultSlice.actions
export default resultSlice.reducer