import { createSlice, createAsyncThunk, createAction } from "@reduxjs/toolkit";
import { toast } from "react-toastify";
import quizService from "./quizService";

const initialState = {
  singleTag: null,
  isExamStarted: false,
  userAnswers: [],
  singleClass: null,
  singleExam: null,
  questions: null,
  tags: [],
  classes: [],
  exams: [],
  myExams: [],
  isLoading: false,
  isSuccess: false,
  isError: false,
  queue: [],
  answers: [],
  trace: 0,
};

// Get Tags
export const getTags = createAsyncThunk("quiz/getTags", async (_, thunkAPI) => {
  try {
    return await quizService.getTags();
  } catch (error) {
    const message =
      (error.response && error.response.data && error.response.data.message) ||
      error.message ||
      error.toString();

    return thunkAPI.rejectWithValue(message);
  }
});

export const getClassesByTag = createAsyncThunk(
  "quiz/getClassesByTag",
  async (tagId, thunkAPI) => {
    try {
      return await quizService.getClassesByTag(tagId);
    } catch (error) {
      const message =
        (error.response &&
          error.response.data &&
          error.response.data.message) ||
        error.message ||
        error.toString();

      return thunkAPI.rejectWithValue(message);
    }
  }
);

// Get Exams By Tag
export const getExamsByClass = createAsyncThunk(
  "quiz/getExamsByClass",
  async (id, thunkAPI) => {
    try {
      return await quizService.getExamsByClass(id);
    } catch (error) {
      const message =
        (error.response &&
          error.response.data &&
          error.response.data.message) ||
        error.message ||
        error.toString();

      return thunkAPI.rejectWithValue(message);
    }
  }
);
// Add Exam
export const addExam = createAsyncThunk(
  "quiz/addExam",
  async ({ examData, classId }, thunkAPI) => {
    try {
      return await quizService.addExam(examData, classId);
    } catch (error) {
      const message =
        (error.response &&
          error.response.data &&
          error.response.data.message) ||
        error.message ||
        error.toString();

      return thunkAPI.rejectWithValue(message);
    }
  }
);

// Add Class
export const addClass = createAsyncThunk(
  "quiz/addClass",
  async ({ tagId, classData }, thunkAPI) => {
    try {
      return await quizService.addClass(classData, tagId);
    } catch (error) {
      const message =
        (error.response &&
          error.response.data &&
          error.response.data.message) ||
        error.message ||
        error.toString();

      return thunkAPI.rejectWithValue(message);
    }
  }
);

// Get Tag
export const getTag = createAsyncThunk("quiz/getTag", async (id, thunkAPI) => {
  try {
    return await quizService.getTag(id);
  } catch (error) {
    const message =
      (error.response && error.response.data && error.response.data.message) ||
      error.message ||
      error.toString();

    return thunkAPI.rejectWithValue(message);
  }
});
export const getPdfByExam = createAsyncThunk(
  "quiz/getPdfByExam",
  async (examId, thunkAPI) => {
    try {
      return await quizService.getPdfByExam(examId);
    } catch (error) {
      const message =
        (error.response &&
          error.response.data &&
          error.response.data.message) ||
        error.message ||
        error.toString();

      return thunkAPI.rejectWithValue(message);
    }
  }
);
// Add Tag
export const addTag = createAsyncThunk(
  "quiz/addTag",
  async (tagData, thunkAPI) => {
    try {
      return await quizService.addTag(tagData);
    } catch (error) {
      const message =
        (error.response &&
          error.response.data &&
          error.response.data.message) ||
        error.message ||
        error.toString();

      return thunkAPI.rejectWithValue(message);
    }
  }
);

// Get Exam
export const getExam = createAsyncThunk(
  "quiz/getExam",
  async (id, thunkAPI) => {
    try {
      return await quizService.getExam(id);
    } catch (error) {
      const message =
        (error.response &&
          error.response.data &&
          error.response.data.message) ||
        error.message ||
        error.toString();

      return thunkAPI.rejectWithValue(message);
    }
  }
);

//Edit Exam
export const editExam = createAsyncThunk(
  "quiz/editExam",
  async ({ examData, examId }, thunkAPI) => {
    try {
      return await quizService.editExam(examData, examId);
    } catch (error) {
      const message =
        (error.response &&
          error.response.data &&
          error.response.data.message) ||
        error.message ||
        error.toString();

      return thunkAPI.rejectWithValue(message);
    }
  }
);

//Delete Exam
export const deleteExam = createAsyncThunk(
  "quiz/deleteExam",
  async (examId, thunkAPI) => {
    try {
      return await quizService.deleteExam(examId);
    } catch (error) {
      const message =
        (error.response &&
          error.response.data &&
          error.response.data.message) ||
        error.message ||
        error.toString();

      return thunkAPI.rejectWithValue(message);
    }
  }
);

//Add Question
export const addQuestion = createAsyncThunk(
  "quiz/addQuestion",
  async ({ examId, questionData }, thunkAPI) => {
    try {
      return await quizService.addQuestion(examId, questionData);
    } catch (error) {
      const message =
        (error.response &&
          error.response.data &&
          error.response.data.message) ||
        error.message ||
        error.toString();

      return thunkAPI.rejectWithValue(message);
    }
  }
);

//Edit Tag
export const editTag = createAsyncThunk(
  "quiz/editTag",
  async ({ tagId, tagData }, thunkAPI) => {
    try {
      return await quizService.editTag(tagId, tagData);
    } catch (error) {
      const message =
        (error.response &&
          error.response.data &&
          error.response.data.message) ||
        error.message ||
        error.toString();

      return thunkAPI.rejectWithValue(message);
    }
  }
);

//Get Question By Exam
export const getQuestionByExam = createAsyncThunk(
  "quiz/getQuestionByExam",
  async (examId, thunkAPI) => {
    try {
      return await quizService.getQuestionByExam(examId);
    } catch (error) {
      const message =
        (error.response &&
          error.response.data &&
          error.response.data.message) ||
        error.message ||
        error.toString();

      return thunkAPI.rejectWithValue(message);
    }
  }
);

//Add Exam To User
export const addExamToUser = createAsyncThunk(
  "quiz/addExamToUser",
  async ({ examId, token }, thunkAPI) => {
    try {
      return await quizService.addExamToUser(examId, token);
    } catch (error) {
      const message =
        (error.response &&
          error.response.data &&
          error.response.data.message) ||
        error.message ||
        error.toString();

      return thunkAPI.rejectWithValue(message);
    }
  }
);

//Get Exams By User
export const getExamsByUser = createAsyncThunk(
  "quiz/getExamsByUser",
  async (_, thunkAPI) => {
    try {
      return await quizService.getExamsByUser();
    } catch (error) {
      const message =
        (error.response &&
          error.response.data &&
          error.response.data.message) ||
        error.message ||
        error.toString();

      return thunkAPI.rejectWithValue(message);
    }
  }
);

//Delete My Exam
export const deleteMyExam = createAsyncThunk(
  "quiz/deleteMyExam",
  async (examId, thunkAPI) => {
    try {
      return await quizService.deleteMyExam(examId);
    } catch (error) {
      const message =
        (error.response &&
          error.response.data &&
          error.response.data.message) ||
        error.message ||
        error.toString();

      return thunkAPI.rejectWithValue(message);
    }
  }
);

//Delete Question
export const deleteQuestion = createAsyncThunk(
  "quiz/deleteQuestion",
  async (questionId, thunkAPI) => {
    try {
      return await quizService.deleteQuestion(questionId);
    } catch (error) {
      const message =
        (error.response &&
          error.response.data &&
          error.response.data.message) ||
        error.message ||
        error.toString();

      return thunkAPI.rejectWithValue(message);
    }
  }
);

//Edit Question
export const editQuestion = createAsyncThunk(
  "quiz/editQuestion",
  async ({ questionId, questionData }, thunkAPI) => {
    try {
      return await quizService.editQuestion(questionId, questionData);
    } catch (error) {
      const message =
        (error.response &&
          error.response.data &&
          error.response.data.message) ||
        error.message ||
        error.toString();

      return thunkAPI.rejectWithValue(message);
    }
  }
);

//Get Exams
export const getExams = createAsyncThunk(
  "quiz/getExams",
  async (_, thunkAPI) => {
    try {
      return await quizService.getExams();
    } catch (error) {
      const message =
        (error.response &&
          error.response.data &&
          error.response.data.message) ||
        error.message ||
        error.toString();

      return thunkAPI.rejectWithValue(message);
    }
  }
);

export const getExamTagandClass = createAsyncThunk(
  "quiz/getExamTagandClass",
  async (examId, thunkAPI) => {
    try {
      return await quizService.getExamTagandClass(examId);
    } catch (error) {
      const message =
        (error.response &&
          error.response.data &&
          error.response.data.message) ||
        error.message ||
        error.toString();

      return thunkAPI.rejectWithValue(message);
    }
  }
);

//Add Exam To User By Id
export const addExamToUserById = createAsyncThunk(
  "quiz/addExamToUserById",
  async ({ userId, examData }, thunkAPI) => {
    try {
      return await quizService.addExamToUserById(userId, examData);
    } catch (error) {
      const message =
        (error.response &&
          error.response.data &&
          error.response.data.message) ||
        error.message ||
        error.toString();

      return thunkAPI.rejectWithValue(message);
    }
  }
);

export const startExamAction = createAsyncThunk(
  "quiz/startExam",
  async ({ examId, setPdfData }, thunkAPI) => {
    try {
      await thunkAPI.dispatch(getExam(examId));
      await thunkAPI.dispatch(getExamTagandClass(examId));
      const getPdfAction = await thunkAPI.dispatch(getPdfByExam({ examId }));
      setPdfData(getPdfAction.payload.path);
      await thunkAPI.dispatch(getQuestionByExam(examId));
      await thunkAPI.dispatch(quizSlice.actions.startExam(true));
    } catch (error) {
      console.error("Error starting exam:", error);
      throw error;
    }
  }
);

const quizSlice = createSlice({
  name: "quiz",
  initialState,
  reducers: {
    RESET_QUIZ(state) {
      (state.queue = []), (state.answers = []), (state.trace = 0);
    },
    startExam: (state, action) => {
      state.isExamStarted = action.payload;
    },
    userSelectedAnswer(state, action) {
      state.userAnswers[action.payload.index] = {
        answer: action.payload.answer,
        type: action.payload.type,
      };
    },
  },

  extraReducers: (builder) => {
    builder
      .addCase(startExamAction.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(startExamAction.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
      })
      .addCase(startExamAction.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        toast.error(action.payload);
      })
      //Get Tags
      .addCase(getTags.pending, (state, action) => {
        state.isLoading = true;
      })
      .addCase(getTags.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        state.tags = action.payload;
      })
      .addCase(getTags.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload;
        state.tags = null;
        toast.error(action.payload);
      })
      .addCase(getClassesByTag.pending, (state, action) => {
        state.isLoading = true;
      })
      .addCase(getClassesByTag.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        state.classes = action.payload;
      })
      .addCase(getClassesByTag.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload;
        state.tags = null;
        toast.error(action.payload);
      })
      .addCase(clearClasses, (state) => {
        state.classes = null;
      })
      //Get Exams By Class
      .addCase(getExamsByClass.pending, (state, action) => {
        state.isLoading = true;
      })
      .addCase(getExamsByClass.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        state.exams = action.payload;
      })
      .addCase(getExamsByClass.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload;
        state.exams = null;
        toast.error(action.payload);
      })

      //Add Exam
      .addCase(addExam.pending, (state, action) => {
        state.isLoading = true;
      })
      .addCase(addExam.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        state.isError = false;
        toast.success("Exam added successfully");
      })
      .addCase(addExam.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.isSuccess = false;
        state.message = action.payload;
        toast.error(action.payload);
      })

      //Get Exam
      .addCase(getTag.pending, (state, action) => {
        state.isLoading = true;
      })
      .addCase(getTag.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        state.singleTag = action.payload;
      })
      .addCase(getTag.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload;
        state.singleTag = null;
        toast.error(action.payload);
      })

      //Add Tag
      .addCase(addTag.pending, (state, action) => {
        state.isLoading = true;
      })
      .addCase(addTag.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        toast.success("Tag added successfully");
      })
      .addCase(addTag.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload;
        toast.error(action.payload);
      })

      //Add Class
      .addCase(addClass.pending, (state, action) => {
        state.isLoading = true;
      })
      .addCase(addClass.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        toast.success("Sinif Uğurla yaradıldı");
      })
      .addCase(addClass.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload;
        toast.error(action.payload);
      })

      //Get Exam
      .addCase(getExam.pending, (state, action) => {
        state.isLoading = true;
      })
      .addCase(getExam.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        state.isError = false;
        state.singleExam = action.payload;
      })
      .addCase(getExam.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload;
        toast.error(action.payload);
      })

      //Edit Exam
      .addCase(editExam.pending, (state, action) => {
        state.isLoading = true;
      })
      .addCase(editExam.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        state.isError = false;
        state.message = action.payload;
        toast.success(action.payload);
      })
      .addCase(editExam.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload;
        toast.error(action.payload);
      })

      //Delete Exam
      .addCase(deleteExam.pending, (state, action) => {
        state.isLoading = true;
      })
      .addCase(deleteExam.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        state.isError = false;
        state.message = action.payload;
        toast.success(action.payload);
      })
      .addCase(deleteExam.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload;
        toast.error(action.payload);
      })

      //Add Question
      .addCase(addQuestion.pending, (state, action) => {
        state.isLoading = true;
      })
      .addCase(addQuestion.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        state.isError = false;
        toast.success("Suallar uğurla əlavə olundu!");
      })
      .addCase(addQuestion.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload;
        toast.error(action.payload);
      })

      //Edit Tag
      .addCase(editTag.pending, (state, action) => {
        state.isLoading = true;
      })
      .addCase(editTag.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        state.isError = false;
        toast.success(action.payload);
      })
      .addCase(editTag.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload;
        toast.error(action.payload);
      })

      //Get Question By Exam
      .addCase(getQuestionByExam.pending, (state, action) => {
        state.isLoading = true;
      })
      .addCase(getQuestionByExam.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        state.isError = false;
        state.queue = action.payload;
      })
      .addCase(getQuestionByExam.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.queue = [];
        state.message = action.payload;
        toast.error(action.payload);
      })

      //Get Pdf By Exam
      .addCase(getPdfByExam.pending, (state, action) => {
        state.isLoading = true;
      })
      .addCase(getPdfByExam.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        state.isError = false;
        state.queue = action.payload;
      })
      .addCase(getPdfByExam.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.queue = [];
        state.message = action.payload;
        toast.error(action.payload);
      })

      //Add Exam To User
      .addCase(addExamToUser.pending, (state, action) => {
        state.isLoading = true;
      })
      .addCase(addExamToUser.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        state.isError = false;
        state.myExams.push(action.payload);
        toast.success("Exam bought successfully");
      })
      .addCase(addExamToUser.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload;
        toast.error(action.payload);
      })

      //Get Exams By User
      .addCase(getExamsByUser.pending, (state, action) => {
        state.isLoading = true;
      })
      .addCase(getExamsByUser.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        state.isError = false;
        state.myExams = action.payload;
      })
      .addCase(getExamsByUser.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload;
        toast.error(action.payload);
      })

      //Delete My Exam
      .addCase(deleteMyExam.pending, (state, action) => {
        state.isLoading = true;
      })
      .addCase(deleteMyExam.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        state.isError = false;
        toast.success(action.payload);
      })
      .addCase(deleteMyExam.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload;
        toast.error(action.payload);
      })

      //get Exam Tag and Class
      .addCase(getExamTagandClass.pending, (state, action) => {
        state.isLoading = true;
      })
      .addCase(getExamTagandClass.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        state.singleTag = action.payload.tag;
        state.singleClass = action.payload._class;
      })
      .addCase(getExamTagandClass.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload;
        state.singleTag = null;
        state.singleClass = null;
        toast.error(action.payload);
      })
      //Delete Question
      .addCase(deleteQuestion.pending, (state, action) => {
        state.isLoading = true;
      })
      .addCase(deleteQuestion.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        state.isError = false;
        toast.success(action.payload);
      })
      .addCase(deleteQuestion.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload;
        toast.error(action.payload);
      })

      //Edit Question
      .addCase(editQuestion.pending, (state, action) => {
        state.isLoading = true;
      })
      .addCase(editQuestion.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        state.isError = false;
        toast.success(action.payload);
      })
      .addCase(editQuestion.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload;
        toast.error(action.payload);
      })

      //Get Exams
      .addCase(getExams.pending, (state, action) => {
        state.isLoading = true;
      })
      .addCase(getExams.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        state.isError = false;
        state.exams = action.payload;
      })
      .addCase(getExams.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload;
        toast.error(action.payload);
      })

      //Add Exam To User By Id
      .addCase(addExamToUserById.pending, (state, action) => {
        state.isLoading = true;
      })
      .addCase(addExamToUserById.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        state.isError = false;
        toast.success(action.payload);
      })
      .addCase(addExamToUserById.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload;
        toast.error(action.payload);
      });
  },
});

export const {
  RESET_QUIZ,
  moveNextQuestion,
  movePrevQuestion,
  startExam,
  userSelectedAnswer
} = quizSlice.actions;
export const clearClasses = createAction("quiz/clearClasses");
export default quizSlice.reducer;
