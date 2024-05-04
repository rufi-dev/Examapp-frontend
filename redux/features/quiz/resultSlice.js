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

//Add Result
export const addResult = createAsyncThunk(
    "result/addResult",
    async ({ examId, resultData }, thunkAPI) => {
        try {
            return await quizService.addResult(examId, resultData)
        } catch (error) {
            const message = (error.response && error.response.data && error.response.data.message)
                || error.message || error.toString()

            return thunkAPI.rejectWithValue(message)
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

            return thunkAPI.rejectWithValue(message)
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
            })
            .addCase(addResult.fulfilled, (state, action) => {
                state.isLoading = false;
                state.isSuccess = true;
                toast.success(action.payload)
            })
            .addCase(addResult.rejected, (state, action) => {
                state.isLoading = false;
                state.isError = true;
                toast.error(action.payload)
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
                state.resultByExam = null;
                toast.error(action.payload)
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
                state.resultByExam = null;
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