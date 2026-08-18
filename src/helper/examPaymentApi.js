import axios from "axios";

const API = `${import.meta.env.VITE_BACKEND_URL}/api/payments`;

// The card students transfer to (card number / holder / bank / note).
export const fetchPaymentInfo = async () => {
  const { data } = await axios.get(`${API}/payment-info`);
  return data;
};

// Student pressed "Ödədim" — create/refresh the payment request.
export const requestExamPayment = async (examId, { paid = false } = {}) => {
  const { data } = await axios.post(`${API}/request`, { examId, paid });
  return data;
};

// Admin/teacher: list payment requests.
export const fetchPaymentRequests = async () => {
  const { data } = await axios.get(`${API}/requests`);
  return Array.isArray(data) ? data : [];
};

// Admin/teacher: approve ("done") / reject ("rejected") a request.
export const decidePaymentRequest = async (id, status) => {
  const { data } = await axios.patch(`${API}/requests/${id}`, { status });
  return data;
};
