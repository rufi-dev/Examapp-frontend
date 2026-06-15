import { useEffect } from "react";
import { useLocation } from "react-router-dom";

// Reset scroll on every route change so navigation doesn't keep the old
// scroll position (which caused a visible jump/shake between pages).
export default function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" in window ? "instant" : "auto" });
  }, [pathname]);
  return null;
}
