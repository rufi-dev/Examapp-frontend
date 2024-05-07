import React from "react";
import { useCookies } from "react-cookie";
const CookieConsent = () => {
  const [cookies, setCookies] = useCookies(["g_state", "token"]);
  const handleCookie = () => {
    setCookies("token", true, { path: "/" });
    setCookies("g_state", true, { path: "/" });
  };
  return (
    <div className="absolute bg-[#1084da] w-full flex justify-around">
      <p>Cookilere raziliq ver</p>
      <button onClick={handleCookie} className="bg-[#153955] text-white p-4 text-lg">Raziyam</button>
    </div>
  );
};

export default CookieConsent;
