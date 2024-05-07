import React from 'react';
import CookieConsent from 'react-cookie-consent';

const CookieBanner = () => {
  return (
    <CookieConsent
      location="bottom"
      buttonText="Qəbul et"
      cookieName="token"
      style={{ background: '#2B373B' }}
      buttonStyle={{ color: '#4e503b', fontSize: '13px' }}
      expires={150}
    >
      Bu saydakı cookilərə icazə veriləcək
    </CookieConsent>
  );
};

export default CookieBanner;
