import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { toast } from "react-toastify";
import service from "./notificationService";

const msg = (e) =>
  (e.response && e.response.data && e.response.data.message) || e.message || e.toString();

const initialState = { items: [], unread: 0, isLoading: false };

export const getNotifications = createAsyncThunk(
  "notification/get",
  async (_, thunkAPI) => {
    try {
      return await service.getNotifications();
    } catch (e) {
      return thunkAPI.rejectWithValue(msg(e));
    }
  }
);

export const createNotification = createAsyncThunk(
  "notification/create",
  async (data, thunkAPI) => {
    try {
      return await service.createNotification(data);
    } catch (e) {
      return thunkAPI.rejectWithValue(msg(e));
    }
  }
);

export const markNotificationsSeen = createAsyncThunk(
  "notification/seen",
  async (_, thunkAPI) => {
    try {
      return await service.markSeen();
    } catch (e) {
      return thunkAPI.rejectWithValue(msg(e));
    }
  }
);

export const deleteNotification = createAsyncThunk(
  "notification/delete",
  async (id, thunkAPI) => {
    try {
      await service.deleteNotification(id);
      return id;
    } catch (e) {
      return thunkAPI.rejectWithValue(msg(e));
    }
  }
);

const slice = createSlice({
  name: "notification",
  initialState,
  reducers: {},
  extraReducers: (b) => {
    b.addCase(getNotifications.fulfilled, (s, a) => {
      s.items = a.payload.items || [];
      s.unread = a.payload.unread || 0;
    })
      .addCase(createNotification.pending, (s) => {
        s.isLoading = true;
      })
      .addCase(createNotification.fulfilled, (s) => {
        s.isLoading = false;
        toast.success("Bildiriş göndərildi");
      })
      .addCase(createNotification.rejected, (s, a) => {
        s.isLoading = false;
        toast.error(a.payload);
      })
      .addCase(markNotificationsSeen.fulfilled, (s) => {
        s.unread = 0;
      })
      .addCase(deleteNotification.fulfilled, (s, a) => {
        s.items = s.items.filter((n) => n._id !== a.payload);
        toast.success("Bildiriş silindi");
      })
      .addCase(deleteNotification.rejected, (s, a) => {
        toast.error(a.payload);
      });
  },
});

export default slice.reducer;
