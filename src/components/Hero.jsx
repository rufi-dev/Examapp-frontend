import { FiArrowRight, FiCheckCircle, FiStar } from "react-icons/fi";
import Button from "./ui/Button";

// Verified Unsplash education photos, served from their CDN with on-the-fly
// sizing/optimization (auto=format gives webp/avif where supported).
export const eduImg = (id, w = 1200) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${w}&q=80`;
const HERO_IMG = eduImg("photo-1523240795612-9a054b0db644", 1100); // students in a library

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

        {/* Photo visual with floating proof cards */}
        <div className="relative mx-auto w-full max-w-xl animate-scale-in lg:max-w-none">
          <div className="relative overflow-hidden rounded-[2rem] border border-line shadow-lift">
            <img
              src={HERO_IMG}
              alt="Tələbələr birlikdə imtahana hazırlaşır"
              loading="eager"
              className="aspect-[4/3] w-full object-cover"
            />
            {/* legibility veil for the overlaid cards */}
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-transparent" />
          </div>

          {/* top-right: instant result */}
          <div className="absolute -right-3 -top-5 z-10 flex items-center gap-2.5 rounded-2xl border border-line bg-surface px-4 py-3 shadow-lift">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-success/15 text-success">
              <FiCheckCircle className="text-lg" />
            </span>
            <div>
              <div className="text-xs font-semibold text-muted">Anlıq</div>
              <div className="font-display text-sm font-extrabold text-text">Nəticə hazırdır</div>
            </div>
          </div>

          {/* bottom-left: last score */}
          <div className="absolute -bottom-6 -left-3 z-10 w-44 rounded-2xl border border-line bg-surface p-4 shadow-lift">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wide text-muted">
                Son sınaq
              </span>
              <FiStar className="text-warning" />
            </div>
            <div className="mt-1 flex items-end gap-1">
              <span className="font-display text-3xl font-extrabold leading-none text-text">87</span>
              <span className="mb-0.5 text-xs font-semibold text-muted">/ 100 bal</span>
            </div>
            <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-surface2">
              <div className="h-full rounded-full bg-primary" style={{ width: "87%" }} />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
