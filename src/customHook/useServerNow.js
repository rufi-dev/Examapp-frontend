import { useEffect, useRef, useState } from "react";
import axios from "axios";

// A ticking "now" corrected by the server clock. It fetches the server time
// once, derives the offset from the local clock, then re-renders every
// `intervalMs`. Because it returns an ABSOLUTE timestamp, any countdown built
// from it (exam opening, deadline) resumes correctly after a reload, sleep, or
// the device dying and coming back — there is no in-memory counter to lose.
// Falls back to the plain local clock if the sync request fails.
export default function useServerNow(intervalMs = 1000) {
  const offsetRef = useRef(0);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    let mounted = true;
    axios
      .get(`${import.meta.env.VITE_BACKEND_URL}/api/quiz/server-time`)
      .then((res) => {
        if (mounted && res?.data?.now) {
          offsetRef.current = res.data.now - Date.now();
          setNow(Date.now() + offsetRef.current);
        }
      })
      .catch(() => {
        /* keep local time */
      });

    const id = setInterval(() => setNow(Date.now() + offsetRef.current), intervalMs);
    return () => {
      mounted = false;
      clearInterval(id);
    };
  }, [intervalMs]);

  return now;
}
