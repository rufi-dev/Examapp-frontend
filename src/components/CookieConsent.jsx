import { useCookies } from "react-cookie";
import { LuCookie } from "react-icons/lu";
import Button from "./ui/Button";

// Shown once, until the visitor accepts. App.jsx gates this on `cookie_consent`.
const CookieConsent = () => {
  const [, setCookie] = useCookies(["cookie_consent"]);

  const accept = () =>
    setCookie("cookie_consent", "true", {
      path: "/",
      maxAge: 60 * 60 * 24 * 365, // 1 year
      sameSite: "lax",
    });

  return (
    <div className="fixed inset-x-0 bottom-0 z-[1200] animate-fade-rise p-4 sm:p-6">
      <div className="mx-auto flex max-w-3xl flex-col gap-4 rounded-2xl border border-line bg-surface p-4 shadow-lift sm:flex-row sm:items-center sm:gap-5 sm:p-5">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary/15 text-primary">
          <LuCookie className="text-[22px]" />
        </span>
        <p className="flex-1 text-sm leading-relaxed text-muted">
          Təcrübəni yaxşılaşdırmaq üçün bu saytda{" "}
          <span className="font-semibold text-text">"cookie"</span> fayllarından istifadə edirik.
        </p>
        <Button onClick={accept} size="sm" className="w-full shrink-0 sm:w-auto">
          Qəbul edirəm
        </Button>
      </div>
    </div>
  );
};

export default CookieConsent;
