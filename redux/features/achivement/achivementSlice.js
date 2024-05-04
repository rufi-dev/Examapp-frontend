import { createSlice, createAsyncThunk } from "@reduxjs/toolkit"
import { toast } from "react-toastify"
import achivementService from "./achivementService";

const initialState = {
    achivements: null,
    isError: false,
    isSuccess: false,
    isLoading: false,
    message: "",
}

// Get Achivements
export const getAchivements = createAsyncThunk(
    "achivement/getAchivements",
    async (_, thunkAPI) => {
        try {
            return await achivementService.getAchivements()
        } catch (error) {
            const message = (error.response && error.response.data && error.response.data.message)
                || error.message || error.toString()

            return thunkAPI.rejectWithValue(message)
        }
    }
)
// Add Achivement
export const addAchivement = createAsyncThunk(
    "achivement/addAchivement",
    async (achivementData, thunkAPI) => {
        try {
            return await achivementService.addAchivement(achivementData)
        } catch (error) {
            const message = (error.response && error.response.data && error.response.data.message)
                || error.message || error.toString()

            return thunkAPI.rejectWithValue(message)
        }
    }
)

// Delete Achivement
export const deleteAchivement = createAsyncThunk(
    "achivement/deleteAchivement",
    async (achivementId, thunkAPI) => {
        try {
            return await achivementService.deleteAchivement(achivementId)
        } catch (error) {
            const message = (error.response && error.response.data && error.response.data.message)
                || error.message || error.toString()

            return thunkAPI.rejectWithValue(message)
        }
    }
)
const authSlice = createSlice({
    name: 'achivement',
    initialState,
    reducers: {
        RESET(state) {
            state.achivements = null;
        },
    },
    extraReducers: (builder) => {
        builder
            // Get Achivements
            .addCase(getAchivements.pending, (state, action) => {
                state.isLoading = true;
            })
            .addCase(getAchivements.fulfilled, (state, action) => {
                state.isError = false;
                state.isLoading = false;
                state.isSuccess = true;
                state.achivements = action.payload;
            })
            .addCase(getAchivements.rejected, (state, action) => {
                state.isError = true;
                state.isLoading = false;
                state.isSuccess = false;
                state.achivements = null;
                toast.error(action.payload)
            })

            // Add Achivement
            .addCase(addAchivement.pending, (state, action) => {
                state.isLoading = true;
            })
            .addCase(addAchivement.fulfilled, (state, action) => {
                state.isError = false;
                state.isLoading = false;
                state.isSuccess = true;
                toast.success(action.payload)
            })
            .addCase(addAchivement.rejected, (state, action) => {
                state.isError = true;
                state.isLoading = false;
                state.isSuccess = false;
                toast.error(action.payload)
            })

            // Delete Achivement
            .addCase(deleteAchivement.pending, (state, action) => {
                state.isLoading = true;
            })
            .addCase(deleteAchivement.fulfilled, (state, action) => {
                state.isError = false;
                state.isLoading = false;
                state.isSuccess = true;
                toast.success(action.payload)
            })
            .addCase(deleteAchivement.rejected, (state, action) => {
                state.isError = true;
                state.isLoading = false;
                state.isSuccess = false;
                toast.error(action.payload)
            })
    }
})

export const { RESET } = authSlice.actions
export default authSlice.reducer