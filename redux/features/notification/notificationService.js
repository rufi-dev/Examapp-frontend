import axios from "axios";

const API = `${import.meta.env.VITE_BACKEND_URL}/api/notifications`;

const getNotifications = async () => (await axios.get(API)).data;
const createNotification = async (data) => (await axios.post(API, data)).data;
const markSeen = async () => (await axios.patch(`${API}/seen`)).data;
const deleteNotification = async (id) => (await axios.delete(`${API}/${id}`)).data;

export default { getNotifications, createNotification, markSeen, deleteNotification };
