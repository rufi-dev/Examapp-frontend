import { FiArrowRight, FiCheckCircle, FiTrendingUp, FiTarget } from "react-icons/fi";
import Button from "./ui/Button";
import { MathGridBackground } from "./blueprint/MathVisuals";

const proof = ["Real imtahan formatı", "Mərhələli həllər", "Şəxsi nəticə analizi"];

const Hero = () => (
  <section className="relative overflow-hidden">
    <MathGridBackground variant="graph" fade />

    <div className="container-app relative grid items-center gap-12 py-14 lg:grid-cols-[1.05fr_0.95fr] lg:py-24">
      {/* Left — copy */}
      <div className="animate-fade-rise">
        <span className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/8 px-3.5 py-1.5 text-xs font-semibold text-primary">
          <span className="h-1.5 w-1.5 rounded-full bg-primary" />
          Riyaziyyat imtahanına daha ağıllı hazırlaş
        </span>

        <h1 className="mt-5 font-display text-4xl font-extrabold leading-[1.08] tracking-tight text-text sm:text-5xl lg:text-[3.75rem]">
          Riyaziyyatı sadəcə öyrənmə.{" "}
          <span className="text-primary">İmtahanda həll et.</span>
        </h1>

        <p className="mt-5 max-w-xl text-lg leading-relaxed text-muted">
          BunkerMath ilə real imtahan formatında sınaqlar et, zəif mövzularını tap və
          nəticələrinə uyğun hazırlan.
        </p>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Button to="/register" size="lg">
            Sınağa başla <FiArrowRight className="text-[18px]" />
          </Button>
          <Button href="#topics" size="lg" variant="secondary">
            Mövzulara bax
          </Button>
        </div>

        <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-3">
          {proof.map((p) => (
            <li key={p} className="flex items-center gap-2 text-sm font-medium text-text">
              <FiCheckCircle className="shrink-0 text-primary" /> {p}
            </li>
          ))}
        </ul>
      </div>

      {/* Right — illustration (no frame), just a soft glow + floating cards */}
      <div className="relative mx-auto w-full max-w-[240px] sm:max-w-[300px] lg:max-w-[380px]">
        {/* soft glow behind the transparent illustration */}
        <div
          aria-hidden
          className="absolute inset-x-6 bottom-8 top-10 rounded-[42%] bg-gradient-to-br from-primary/20 to-cyan/15 blur-3xl"
        />

        <img
          src="/hero.png"
          alt="BunkerMath ilə riyaziyyata hazırlıq"
          className="relative z-10 w-full animate-scale-in"
        />

        {/* floating stat cards */}
        <div className="animate-float absolute -left-4 top-[42%] z-20 hidden items-center gap-2.5 rounded-2xl border border-line bg-surface px-3.5 py-2.5 shadow-lift sm:flex">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-success/12 text-success">
            <FiTrendingUp />
          </span>
          <span className="text-xs">
            <span className="block font-semibold text-text">Güclü mövzu</span>
            <span className="text-muted">Həndəsə · 92%</span>
          </span>
        </div>

        <div className="animate-float-slow absolute -bottom-4 right-0 z-20 hidden items-center gap-2.5 rounded-2xl border border-line bg-surface px-3.5 py-2.5 shadow-lift sm:flex">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary/12 text-primary">
            <FiTarget />
          </span>
          <span className="text-xs">
            <span className="block font-semibold text-text">Məqsəd balı</span>
            <span className="text-muted">85+ · bu ay</span>
          </span>
        </div>
      </div>
    </div>
  </section>
);

export default Hero;
