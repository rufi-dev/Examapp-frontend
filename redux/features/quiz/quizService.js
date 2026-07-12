import axios from "axios"

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL
export const API_URL = `${BACKEND_URL}/api/quiz/`

//Get Tags
const getTags = async () => {
    const response = await axios.get(API_URL + "getTags")
    return response.data
}
const getClassesByTag = async (tagId) => {
    const response = await axios.get(API_URL + "getClassesByTag/"+tagId)
    return response.data
}
// All classes the user can access (categories removed — classes are top-level).
const getAllClasses = async () => {
    const response = await axios.get(API_URL + "getClasses")
    return response.data
}
//Get Exams
const getExamsByClass = async (id) => {
    const response = await axios.get(API_URL + "getExamsByClass/" + id)
    return response.data
}

// Report one anti-cheat violation against a specific attempt; the server
// increments + enforces the limit and returns { violations, terminated, limit }.
// Uses fetch with keepalive so the penalty is delivered the INSTANT the student
// leaves — even if the tab is backgrounded or closed (a normal axios request can
// be dropped on unload). keepalive still allows the Authorization header (unlike
// sendBeacon), so cross-domain auth keeps working.
export const reportViolation = async (examId, reason, attemptId) => {
    const token = localStorage.getItem("token")
    const res = await fetch(`${API_URL}exam/${examId}/violation`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: "include",
        keepalive: true,
        body: JSON.stringify({ reason, attemptId }),
    })
    return res.json()
}

//getResultsByExam
const getResultsByExam = async (id) => {
    const response = await axios.get(API_URL + "getResultsByExam/" + id)
    return response.data
}
//Add Photo To Result
const addPhotoToResult = async (id, photo) => {
    console.log(photo)
    const response = await axios.post(API_URL + "addPhotoToResult/" + id, photo)
    return response.data
}

//Add Exam
const addExam = async (examData, classId) => {
    console.log(examData)
    const response = await axios.post(API_URL + "addExam/"+classId, examData)
    return response.data
}

//Get Exam
const getExam = async (id) => {
    const response = await axios.get(API_URL + "getExam/" + id)
    return response.data
}

//Get Class and Tag from Exam
const getExamTagandClass = async (id) => {
    const response = await axios.get(API_URL + "getExamTagandClass/" + id)
    return response.data
}
//Get Tag
const getTag = async (id) => {
    const response = await axios.get(API_URL + "getTag/" + id)
    return response.data
}
//Add Tag
const addTag = async (tagData) => {
    const response = await axios.post(API_URL + "addTag", tagData)
    return response.data
}

//Edit Exam
const editExam = async (examData, examId) => {
    const response = await axios.patch(API_URL + "editExam/" + examId, examData)
    return response.data.message
}

//Hide / show an exam (publish toggle)
const setExamHidden = async (examId, hidden) => {
    const response = await axios.patch(API_URL + "setExamHidden/" + examId, { hidden })
    return response.data.message
}

//Add Class (top-level — no category/tag)
const addClass = async (classData) => {
    const response = await axios.post(API_URL + "addClass", classData)
    return response.data.message
}

//Delete Exam
const deleteExam = async (examId) => {
    const response = await axios.delete(API_URL + "deleteExam/" + examId)
    return response.data.message
}

//Delete Class (cascades to its exams)
const deleteClass = async (classId) => {
    const response = await axios.delete(API_URL + "deleteClass/" + classId)
    return response.data.message
}

//Get a single class
const getClass = async (classId) => {
    const response = await axios.get(API_URL + "getClass/" + classId)
    return response.data
}

//Edit Class (level)
const editClass = async (classId, classData) => {
    const response = await axios.patch(API_URL + "editClass/" + classId, classData)
    return response.data.message
}

//Delete Tag (cascades to its classes + exams)
const deleteTag = async (tagId) => {
    const response = await axios.delete(API_URL + "deleteTag/" + tagId)
    return response.data.message
}

//Add Question
const addQuestion = async (examId, questionData) => {
    const response = await axios.post(API_URL + "addQuestion/" + examId, questionData)
    return response.data
}

//Edit Tag
const editTag = async (tagId, tagData) => {
    const response = await axios.patch(API_URL + "editTag/" + tagId, tagData)
    return response.data.message
}

//Get Question
const getQuestionByExam = async (examId) => {
    const response = await axios.get(API_URL + "getQuestionsByExam/" + examId)
    return response.data
}

//Get Pdf By Exam
const getPdfByExam = async ({examId}) => {
    const response = await axios.get(API_URL + "getPdfByExam/" + examId)
    return response.data
}
//Add Result. Returns the whole payload ({ message, earnPoints, late }) so the
//caller can read earnPoints; the fulfilled reducer toasts .message.
const addResult = async (examId, resultData) => {
    const response = await axios.post(API_URL + "addResult/" + examId, resultData)
    return response.data
}

//Start (or resume) a server-tracked attempt (password required for protected exams)
const startAttempt = async (examId, password) => {
    const response = await axios.post(API_URL + "exam/" + examId + "/start", { password })
    return response.data
}

//Is there an exam in progress for this user (resume available)? Also used to
//poll the shared attempt's live state (violations/terminated) across devices, and
//by the Result page to poll a SPECIFIC attempt's terminal state.
//opts: { counts } adds used/maxTry (details page); { attemptId } strictly pins the
//status to one attempt (multi-try / result-page polling).
export const getAttemptStatus = async (examId, opts = {}) => {
    // Back-compat: an old truthy 2nd arg meant "counts".
    const o = typeof opts === "object" && opts !== null ? opts : { counts: !!opts }
    const params = new URLSearchParams()
    if (o.counts) params.set("counts", "1")
    if (o.attemptId) params.set("attemptId", String(o.attemptId))
    const qs = params.toString()
    const response = await axios.get(
        API_URL + "exam/" + examId + "/attemptStatus" + (qs ? "?" + qs : "")
    )
    return response.data
}

// Autosave the in-progress selections onto the active attempt, so the server
// can auto-submit them if the student never finishes (timer safety net).
export const autosaveAnswers = async (examId, selectedAnswers, attemptId, live = {}) => {
    const response = await axios.post(API_URL + "exam/" + examId + "/autosave", {
        selectedAnswers,
        attemptId,
        currentQuestion: live.currentQuestion,
        answeredCount: live.answeredCount,
    })
    return response.data
}

// Live exam watch (owner/admin): active attempts + which question each is on.
export const getLiveAttempts = async (examId) => {
    const response = await axios.get(API_URL + "exam/" + examId + "/live")
    return response.data
}

//Student's rank / percentile on an exam
const getExamRank = async (examId) => {
    const response = await axios.get(API_URL + "exam/" + examId + "/rank")
    return response.data
}

//Get Results By User
const getResultsByUser = async () => {
    const response = await axios.get(API_URL + "getResultsByUser")
    return response.data
}

//Get Results By User
const getResultsByUserByExam = async (examId) => {
    const response = await axios.get(API_URL + "getResultsByUserByExam/" + examId)
    return response.data
}

//Add Exam to User
const addExamToUser = async (examId, token, sessionId) => {
    const params = []
    if (token) params.push("token=" + encodeURIComponent(token))
    if (sessionId) params.push("session_id=" + encodeURIComponent(sessionId))
    const url = API_URL + "addExamToUser/" + examId + (params.length ? "?" + params.join("&") : "")
    const response = await axios.post(url)
    return response.data
}

//Get Exams By User
const getExamsByUser = async () => {
    const response = await axios.get(API_URL + "getExamsByUser")
    return response.data
}

//Get Exams
const getExams = async () => {
    const response = await axios.get(API_URL + "getExams")
    return response.data
}

//Add Exams To User By Id
const addExamToUserById = async (userId, examData) => {
    const response = await axios.post(API_URL + "addExamToUserById/" + userId, examData)
    return response.data.message
}

//Review Result
const reviewResult = async (resultId) => {
    const response = await axios.get(API_URL + "reviewByResult/" + resultId)
    return response.data
}

//Delete My Exam
const deleteMyExam = async (examId) => {
    const response = await axios.delete(API_URL + "deleteMyExam/" + examId)
    return response.data.message
}

//Delete Question
const deleteQuestion = async (questionId) => {
    const response = await axios.delete(API_URL + "deleteQuestion/" + questionId)
    return response.data.message
}

//Edit Question
const editQuestion = async (questionId, questionData) => {
    const response = await axios.patch(API_URL + "editQuestion/" + questionId, questionData)
    return response.data.message
}



const quizService = {
    getTags,
    getExamsByClass,
    addExam,
    getTag,
    addTag,
    getExam,
    editExam,
    setExamHidden,
    deleteExam,
    deleteClass,
    deleteTag,
    getClass,
    editClass,
    addQuestion,
    editTag,
    getQuestionByExam,
    addResult,
    startAttempt,
    getAttemptStatus,
    getExamRank,
    getResultsByUser,
    getResultsByUserByExam,
    addExamToUser,
    getExamsByUser,
    reviewResult,
    deleteMyExam,
    deleteQuestion,
    editQuestion,
    getExams,
    addExamToUserById,
    getPdfByExam,
    addClass,
    getExamTagandClass,
    getClassesByTag,
    getAllClasses,
    addPhotoToResult,
    getResultsByExam
}

export default quizService