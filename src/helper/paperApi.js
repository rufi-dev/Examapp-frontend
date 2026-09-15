import axios from "axios";

const API = `${import.meta.env.VITE_BACKEND_URL}/api/quiz/exam`;

// Grading workspace: { exam, key, students, results }.
export const fetchPaperSheet = async (examId) => {
  const { data } = await axios.get(`${API}/${examId}/paper`);
  return data;
};

// AI read of the uploaded sheet photos → { answers, studentName, cost }.
export const readPaperSheet = async (examId, images) => {
  const { data } = await axios.post(`${API}/${examId}/paper/read`, { images });
  return data;
};

// Live score for the sheet being corrected (nothing is saved).
export const previewPaperScore = async (examId, answers) => {
  const { data } = await axios.post(`${API}/${examId}/paper/result`, { answers, preview: true });
  return data;
};

// Save (or update) a student's graded paper sheet → { result, correctCount }.
export const savePaperResult = async (examId, payload) => {
  const { data } = await axios.post(`${API}/${examId}/paper/result`, payload);
  return data;
};

export const deletePaperResult = async (examId, resultId) => {
  const { data } = await axios.delete(`${API}/${examId}/paper/result/${resultId}`);
  return data;
};

// Readable API error message (backend sends { message }).
export const apiError = (e, fallback = "Xəta baş verdi") =>
  e?.response?.data?.message || e?.message || fallback;
