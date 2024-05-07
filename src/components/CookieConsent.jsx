import React from "react";
import { useCookies } from "react-cookie";
const CookieConsent = () => {
  const [cookies, setCookies] = useCookies(["g_state", "token"]);
  const handleCookie = () => {
    setCookies("token", true, { path: "/" });
    setCookies("g_state", true, { path: "/" });
  };
  return (
    <div className="fixed bottom-0 left-0 bg-[#1084da] w-full h-[100px] flex justify-around items-center">
      <p className="text-lg text-white">
        Bu veb səhifədə işlədilən "cookie" fayllarından istifadəyə razısınız?
      </p>
      <button
        onClick={handleCookie}
        className="bg-[#153955] text-white p-4 text-lg"
      >
        Razıyam
      </button>
    </div>
  );
};

export default CookieConsent;
