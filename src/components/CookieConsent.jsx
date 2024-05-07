import React from "react";
import { useCookie } from "react-cookie";
const CookieBanner = () => {
  const [cookies, setCookies] = useCookie(["g_state", "token"]);
  const handleCookie = () => {
    setCookies("token", true, { path: "/" });
    setCookies("g_state", token, { path: "/" });
  };
  return (
    <div>
      Cookilere raziliq ver
      <button onClick={handleCookie}>Raziyam</button>
    </div>
  );
};

export default CookieBanner;
