import { FiArrowRight, FiUsers } from "react-icons/fi";
import Button from "./ui/Button";

// Verified Unsplash education photos, served from their CDN with on-the-fly
// sizing/optimization (auto=format gives webp/avif where supported).
export const eduImg = (id, w = 1200) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${w}&q=80`;

const stats = [
  { value: "10 000+", label: "Sual bazası" },
  { value: "Anlıq", label: "Nəticə və təhlil" },
  { value: "Pulsuz", label: "Başlanğıc" },
];

const Hero = () => {
  return (
    <section className="relative overflow-hidden">
      {/* warm ambience */}
      <div className="bg-grid pointer-events-none absolute inset-0 opacity-60" />
      <div className="pointer-events-none absolute -left-24 top-10 h-72 w-72 rounded-full bg-primary/20 blur-3xl" />
      <div className="pointer-events-none absolute right-0 top-40 h-72 w-72 rounded-full bg-accent2/15 blur-3xl" />

      <div className="container-app relative grid items-center gap-14 py-16 lg:grid-cols-[1.02fr_0.98fr] lg:py-24">
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

        {/* The teacher on a soft gradient stage, with trust signals that make
            HIM look great (rating + students), not a misleading exam score. */}
        <div className="relative mx-auto w-full max-w-sm animate-scale-in lg:max-w-md">
          {/* soft gradient stage */}
          <div className="absolute inset-x-1 bottom-3 top-14 rounded-[2.5rem] bg-gradient-to-br from-primary/10 via-surface/0 to-accent2/10" />
          {/* warm glow behind the figure */}
          <div className="pointer-events-none absolute left-1/2 top-10 h-56 w-56 -translate-x-1/2 rounded-full bg-primary/25 blur-3xl" />
          {/* grounding shadow */}
          <div className="pointer-events-none absolute bottom-5 left-1/2 h-4 w-1/2 -translate-x-1/2 rounded-[50%] bg-black/20 blur-lg" />

          {/* the teacher (transparent PNG → object-contain, head pops above) */}
          <img
            src="/hero.png"
            alt="İmtahan platforması — müəllim"
            fetchpriority="high"
            className="relative z-[1] mx-auto block max-h-[470px] w-auto object-contain drop-shadow-[0_24px_44px_rgba(0,0,0,0.2)]"
          />

          {/* top-right: student rating (makes the teacher look excellent) */}
          <div className="absolute right-0 top-10 z-10 rounded-2xl border border-line bg-surface/95 px-4 py-3 shadow-lift backdrop-blur">
            <div className="text-sm leading-none tracking-tight text-warning">★★★★★</div>
            <div className="mt-2 flex items-baseline gap-1">
              <span className="font-display text-2xl font-extrabold leading-none text-text">4.9</span>
              <span className="text-xs font-semibold text-muted">/ 5</span>
            </div>
            <div className="mt-0.5 text-[11px] text-muted">Şagird məmnuniyyəti</div>
          </div>

          {/* bottom-left: students prepared (social proof / credibility) */}
          <div className="absolute -left-3 bottom-12 z-10 flex items-center gap-3 rounded-2xl border border-line bg-surface/95 px-4 py-3 shadow-lift backdrop-blur">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/12 text-primary">
              <FiUsers className="text-[19px]" />
            </span>
            <div>
              <div className="font-display text-lg font-extrabold leading-none text-text">1200+</div>
              <div className="mt-0.5 text-[11px] text-muted">şagird hazırlaşıb</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
