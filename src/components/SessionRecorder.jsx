import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { useSelector } from "react-redux";
import { selectAuthReady, selectIsLoggedIn, selectUser } from "../../redux/features/auth/authSlice";
import { decide, justRegistered, looksLikeBot } from "../lib/recorderPolicy";

/*
 * Runs the session recorder (lib/recorderCore, loaded only when needed) in the
 * mode the policy picks for who is here and which page they are on. Waits for
 * sign-in to settle first, so an account that is never recorded (a student, a
 * parent, an admin) never loads it at all.
 */
const ENABLED = import.meta.env.VITE_SESSION_RECORDING !== "off" && typeof window !== "undefined";
const BOT = ENABLED && looksLikeBot(window.navigator);

export default function SessionRecorder() {
  const { pathname } = useLocation();
  const authReady = useSelector(selectAuthReady);
  const isLoggedIn = useSelector(selectIsLoggedIn);
  const user = useSelector(selectUser);
  const core = useRef(null);
  const loading = useRef(null);

  useEffect(() => {
    if (!ENABLED || !authReady) return;
    const mode = decide({ authReady, isLoggedIn, user, path: pathname, bot: BOT });
    const ctx = { justRegistered: justRegistered(user) };
    if (mode === "off" && !core.current) return; // never loaded, nothing to stop
    if (core.current) {
      core.current.setMode(mode, ctx);
      return;
    }
    if (!loading.current) {
      loading.current = import("../lib/recorderCore").then((m) => {
        core.current = m;
        return m;
      });
    }
    let alive = true;
    loading.current
      .then((m) => {
        if (!alive) return;
        // Re-read the latest state: sign-in may have moved on while it loaded.
        m.setMode(mode, ctx);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [authReady, isLoggedIn, user, pathname]);

  return null;
}
