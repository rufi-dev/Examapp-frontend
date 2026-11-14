import axios from "axios";

// Admin: session recordings of new teachers. Auth comes from the global axios interceptor.
const API = `${import.meta.env.VITE_BACKEND_URL}/api/rec`;

export const listRecordings = (params = {}) => axios.get(API, { params }).then((r) => r.data?.recordings || []);
export const getRecording = (rid) => axios.get(`${API}/${rid}`).then((r) => r.data);
// What arrived since chunk `after`, and whether the visit is still going.
export const liveEvents = (rid, after) => axios.get(`${API}/${rid}/live`, { params: { after } }).then((r) => r.data);
export const deleteRecording = (rid) => axios.delete(`${API}/${rid}`);
