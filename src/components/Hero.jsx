import { FiArrowRight } from "react-icons/fi";
import Button from "./ui/Button";

const stats = [
  { value: "10 000+", label: "Sual bazası" },
  { value: "Anlıq", label: "Nəticə və təhlil" },
  { value: "Pulsuz", label: "Başlanğıc" },
];

const breakdown = [
  { label: "Qapalı suallar", value: 92 },
  { label: "Açıq suallar", value: 81 },
  { label: "Uyğunluq", value: 88 },
];

const ScoreRing = ({ value = 87 }) => {
  const r = 52;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - value / 100);
  return (
    <div className="relative grid h-32 w-32 place-items-center">
      <svg viewBox="0 0 120 120" className="h-32 w-32 -rotate-90">
        <circle cx="60" cy="60" r={r} className="fill-none stroke-line" strokeWidth="11" />
        <circle
          cx="60"
          cy="60"
          r={r}
          className="fill-none stroke-primary"
          strokeWidth="11"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="absolute text-center">
        <div className="font-display text-3xl font-extrabold leading-none text-text">{value}</div>
        <div className="text-[11px] font-semibold uppercase tracking-wide text-muted">bal</div>
      </div>
    </div>
  );
};

const Hero = () => {
  return (
    <section className="relative overflow-hidden">
      {/* warm ambience */}
      <div className="bg-grid pointer-events-none absolute inset-0 opacity-60" />
      <div className="pointer-events-none absolute -left-24 top-10 h-72 w-72 rounded-full bg-primary/20 blur-3xl" />
      <div className="pointer-events-none absolute right-0 top-40 h-72 w-72 rounded-full bg-accent2/15 blur-3xl" />

      <div className="container-app relative grid items-center gap-14 py-16 lg:grid-cols-[1.05fr_0.95fr] lg:py-24">
        {/* Copy */}
        <div className="animate-fade-rise">
          <span className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-4 py-1.5 text-xs font-semibold text-muted shadow-soft">
            <span className="h-2 w-2 rounded-full bg-success" />
            Onlayn sınaq imtahanı platforması
          </span>

          <h1 className="mt-6 font-display text-[2.75rem] font-extrabold leading-[1.04] tracking-tight text-text sm:text-6xl">
            İmtahana hazırlaş.{" "}
            <span className="text-primary">Nəticəni gör.</span> İrəli get.
          </h1>

          <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted">
            Real sınaq imtahanlarını həll et, dərhal balını öyrən, hər sualı təhlil et və
            hər dəfə bir addım daha irəli get.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button to="/tags" size="lg">
              İmtahana başla
              <FiArrowRight className="text-[18px]" />
            </Button>
            <Button to="/ourSuccess" size="lg" variant="secondary">
              Uğurlarımıza bax
            </Button>
          </div>

          <dl className="mt-12 grid max-w-lg grid-cols-3 gap-6 border-t border-line pt-8">
            {stats.map((s) => (
              <div key={s.label}>
                <dt className="font-display text-2xl font-extrabold text-text">{s.value}</dt>
                <dd className="mt-1 text-sm text-muted">{s.label}</dd>
              </div>
            ))}
          </dl>
        </div>

        {/* Product visual */}
        <div className="relative mx-auto w-full max-w-md animate-scale-in lg:max-w-none">
          <div className="absolute -right-4 -top-6 z-10 rounded-2xl border border-line bg-surface px-4 py-3 shadow-lift">
            <div className="text-xs font-semibold text-muted">Bu həftə</div>
            <div className="flex items-center gap-1.5 font-display text-lg font-extrabold text-success">
              +12 bal
            </div>
          </div>
          <div className="absolute -bottom-6 -left-4 z-10 rounded-2xl border border-line bg-surface px-4 py-3 shadow-lift">
            <div className="text-xs font-semibold text-muted">Ardıcıllıq</div>
            <div className="font-display text-lg font-extrabold text-primary">5 gün 🔥</div>
          </div>

          <div className="rounded-3xl border border-line bg-surface p-7 shadow-lift">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-muted">
                  Buraxılış · Riyaziyyat
                </div>
                <div className="mt-1 font-display text-lg font-bold text-text">
                  Sınaq imtahanı #14
                </div>
              </div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-success/15 px-3 py-1 text-xs font-semibold text-success">
                Tamamlandı
              </span>
            </div>

            <div className="my-7 flex items-center justify-center">
              <ScoreRing value={87} />
            </div>

            <div className="flex flex-col gap-4">
              {breakdown.map((b) => (
                <div key={b.label}>
                  <div className="mb-1.5 flex items-center justify-between text-sm">
                    <span className="text-muted">{b.label}</span>
                    <span className="font-semibold text-text">{b.value}%</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-surface2">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${b.value}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
