import React, { useEffect, useState } from "react";

const Cookie = () => {
  const [cookieBlocked, setCookieBlocked] = useState(false);

  useEffect(() => {
    // Check if cookies are blocked
    const cookiesEnabled = navigator.cookieEnabled;
    setCookieBlocked(!cookiesEnabled);
  }, []);
  console.log(navigator)

  if (cookieBlocked) {
    return (
      <div className="cookie-notification">
        <p>
          Cookies are currently blocked in your browser. For this website to
          function properly, please enable cookies in your browser settings.
        </p>
        <p>
          Instructions for enabling cookies can be found{" "}
          <a href="https://www.enablecookies.com" target="_blank" rel="noopener noreferrer">
            here
          </a>
          .
        </p>
      </div>
    );
  }

  return null;
};

export default Cookie;
