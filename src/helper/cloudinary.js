// Upload a single image to Cloudinary (unsigned preset) and return its hosted
// HTTPS URL. Extracted from ExamEdit so the structured-question builder and any
// other surface can reuse one implementation. Reads the same env vars the rest
// of the app uses (note the historical `VITE_UPLAD_PRESET` spelling).
const CLOUD_NAME = import.meta.env.VITE_CLOUD_NAME;
const UPLOAD_PRESET = import.meta.env.VITE_UPLAD_PRESET;

// True when Cloudinary is configured; callers can gate the upload UI / warn.
export const cloudinaryConfigured = () => !!(CLOUD_NAME && UPLOAD_PRESET);

export async function uploadImage(file) {
  if (!cloudinaryConfigured()) {
    throw new Error("Şəkil yükləmə konfiqurasiya olunmayıb (Cloudinary)");
  }
  const fd = new FormData();
  fd.append("file", file);
  fd.append("cloud_name", CLOUD_NAME);
  fd.append("upload_preset", UPLOAD_PRESET);
  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
    { method: "post", body: fd }
  );
  const data = await res.json();
  const url = (data.secure_url || data.url)?.toString();
  if (!url) throw new Error("Şəkil yüklənmədi");
  return url;
}
