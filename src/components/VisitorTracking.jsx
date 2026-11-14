import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useSelector } from "react-redux";
import { selectUser } from "../../redux/features/auth/authSlice";
import { initVisitorTracking, trackPageView, setTrackedUser } from "../lib/visitorTracking";

// Mounts once inside the Router. Initialises visitor tracking on first render
// and records a page_view on every route change, so the Google Sheet sees the
// full page journey (not just the landing page). Renders nothing.
//
// A complete no-op unless VITE_TRACK_URL is configured — see lib/visitorTracking.js.
export default function VisitorTracking() {
  const { pathname } = useLocation();
  const user = useSelector(selectUser);

  useEffect(() => {
    initVisitorTracking();
  }, []);

  // Keep the tracker in sync with who's logged in, so each visit links to the
  // real account (reliably, without IP guessing). Cleared on logout.
  useEffect(() => {
    setTrackedUser(user);
  }, [user]);

  useEffect(() => {
    trackPageView(pathname);
  }, [pathname]);

  return null;
}
