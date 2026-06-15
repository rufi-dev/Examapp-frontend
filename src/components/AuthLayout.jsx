import { Link } from "react-router-dom";

const subjects = [
  "Riyaziyyat",
  "Fizika",
  "Kimya",
  "Biologiya",
  "İngilis dili",
  "Tarix",
  "Ədəbiyyat",
  "Coğrafiya",
];

const symbols = [
  { ch: "π", cls: "left-[12%] top-[18%] text-6xl animate-float" },
  { ch: "√", cls: "right-[14%] top-[26%] text-5xl animate-float-slow" },
  { ch: "∑", cls: "left-[18%] bottom-[26%] text-5xl animate-float-slow" },
  { ch: "%", cls: "right-[20%] bottom-[32%] text-4xl animate-float" },
  { ch: "×", cls: "left-[44%] top-[12%] text-4xl animate-float-slow" },
];

const ScoreRing = ({ value = 87 }) => {
  const r = 30;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - value / 100);
  return (
    <div className="relative grid h-20 w-20 place-items-center">
      <svg viewBox="0 0 72 72" className="h-20 w-20 -rotate-90">
        <circle cx="36" cy="36" r={r} className="fill-none stroke-white/25" strokeWidth="7" />
        <circle
          cx="36"
          cy="36"
          r={r}
          className="fill-none stroke-white"
          strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
        />
      </svg>
      <span className="absolute font-display text-xl font-extrabold text-white">{value}</span>
    </div>
  );
};

export default function AuthLayout({ title, subtitle, children, footer }) {
  return (
    <div className="flex min-h-screen bg-bg">
      {/* Brand panel */}
      <div className="relative hidden w-[45%] flex-col justify-between overflow-hidden bg-primary lg:flex">
        <div className="bg-grid pointer-events-none absolute inset-0 opacity-[0.18]" />
        <div className="pointer-events-none absolute -left-24 -top-24 h-96 w-96 rounded-full bg-white/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-28 right-0 h-96 w-96 rounded-full bg-accent2/40 blur-3xl" />

        {symbols.map((s, i) => (
          <span
            key={i}
            className={`pointer-events-none absolute font-display font-bold text-white/15 ${s.cls}`}
          >
            {s.ch}
          </span>
        ))}

        <div className="relative z-10 p-12">
          <Link to="/" className="inline-flex items-center gap-2.5 text-white">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-white/15 font-display text-lg font-extrabold backdrop-blur">
              İ
            </span>
            <span className="font-display text-2xl font-bold">İmtahan</span>
          </Link>
        </div>

        <div className="relative z-10 px-12">
          <h2 className="font-display text-[2.6rem] font-extrabold leading-[1.08] text-white">
            Biliyini sına,
            <br />
            nəticəni gör,
            <br />
            irəli get.
          </h2>
          <p className="mt-5 max-w-sm leading-relaxed text-white/80">
            Minlərlə sual, real sınaq imtahanları və anlıq nəticə. Hazırlaşmağın ən rahat
            yolu.
          </p>

          <div className="mt-10 flex max-w-xs animate-float items-center gap-4 rounded-2xl border border-white/15 bg-white/10 p-5 backdrop-blur-md">
            <ScoreRing value={87} />
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-white/70">
                Sınaq nəticəsi
              </p>
              <p className="font-display text-lg font-bold text-white">Buraxılış</p>
              <p className="text-sm text-white/75">Riyaziyyat · 87 bal</p>
            </div>
          </div>
        </div>

        <div className="relative z-10 overflow-hidden py-10">
          <div className="flex w-max animate-marquee gap-3 pl-12">
            {[...subjects, ...subjects].map((s, i) => (
              <span
                key={i}
                className="whitespace-nowrap rounded-full border border-white/15 bg-white/10 px-4 py-1.5 text-sm font-medium text-white/90"
              >
                {s}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Form panel */}
      <div className="flex flex-1 items-center justify-center px-5 py-12 sm:px-10">
        <div className="w-full max-w-md">
          <Link to="/" className="mb-8 inline-flex items-center gap-2.5 lg:hidden">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary font-display text-lg font-extrabold text-primary-fg">
              İ
            </span>
            <span className="font-display text-xl font-bold text-text">İmtahan</span>
          </Link>

          <h1 className="font-display text-3xl font-bold tracking-tight text-text">{title}</h1>
          {subtitle && <p className="mt-2 text-muted">{subtitle}</p>}

          <div className="mt-8">{children}</div>

          {footer && <div className="mt-6 text-sm text-muted">{footer}</div>}
        </div>
      </div>
    </div>
  );
}
