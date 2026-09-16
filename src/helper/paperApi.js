import axios from "axios";

const QUIZ = `${import.meta.env.VITE_BACKEND_URL}/api/quiz`;
const API = `${QUIZ}/exam`;

// ---- the "Kağız imtahanları" page ----

// Teacher: own paper exams + grading progress. Student: theirs + upload status.
export const fetchPaperExams = async () => {
  const { data } = await axios.get(`${QUIZ}/paperExams`);
  return data;
};

// One-step creation → { exam: { _id, name } }.
export const createPaperExam = async (payload) => {
  const { data } = await axios.post(`${QUIZ}/paperExam`, payload);
  return data;
};

// ---- teacher ----

// Grading workspace: { exam, key, students, results }.
export const fetchPaperSheet = async (examId) => {
  const { data } = await axios.get(`${API}/${examId}/paper`);
  return data;
};

// Platform read of the sheet photos (no AI)
// → { answers, unresolved, student, nameResolved, platform, match, suggestions }.
export const readPaperSheet = async (examId, images) => {
  const { data } = await axios.post(`${API}/${examId}/paper/read`, { images });
  return data;
};

// AI fallback for only the questions the platform couldn't read (+ the name)
// → { answers: [{ index, answer, confidence, note, source }], student, match, suggestions }.
export const readPaperSheetAi = async (examId, images, questions, name) => {
  const { data } = await axios.post(`${API}/${examId}/paper/read/ai`, { images, questions, name });
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

// ---- student self-upload ----

// { exam, layout, window, submitted, draft, nameCheck, readsLeft, readLimit, me }
export const fetchMyPaper = async (examId) => {
  const { data } = await axios.get(`${API}/${examId}/paper/me`);
  return data;
};

export const saveMyPaperDraft = async (examId, payload) => {
  const { data } = await axios.put(`${API}/${examId}/paper/me/draft`, payload);
  return data;
};

// Platform read (no AI) → { answers, unresolved, platform, student, nameCheck, readsLeft, platformReadsLeft }
export const readMyPaper = async (examId, images) => {
  const { data } = await axios.post(`${API}/${examId}/paper/me/read`, { images });
  return data;
};

// AI check of the draft's unresolved answers → { answers, machine, aiQuestions, student, nameCheck, readsLeft }
export const readMyPaperAi = async (examId) => {
  const { data } = await axios.post(`${API}/${examId}/paper/me/read/ai`);
  return data;
};

export const submitMyPaper = async (examId, payload) => {
  const { data } = await axios.post(`${API}/${examId}/paper/me/submit`, payload);
  return data;
};

// Readable API error message (backend sends { message }).
export const apiError = (e, fallback = "Xəta baş verdi") =>
  e?.response?.data?.message || e?.message || fallback;
