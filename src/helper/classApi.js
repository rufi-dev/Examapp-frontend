import axios from "axios";

// Class-level operations shared by the exam cards and the paper-exams page.
const QUIZ = `${import.meta.env.VITE_BACKEND_URL}/api/quiz`;

// Classes the teacher owns (admin: all) → [{ _id, name, students, pending }].
export const fetchMyClasses = async () => {
  const { data } = await axios.get(`${QUIZ}/teacher/classes`);
  return data;
};

// Move one exam to another class → { class: { _id, name } }.
export const moveExamToClass = async (examId, classId) => {
  const { data } = await axios.patch(`${QUIZ}/exam/${examId}/class`, { classId });
  return data;
};
