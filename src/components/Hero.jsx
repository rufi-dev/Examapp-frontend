import { FiArrowRight, FiCheckCircle, FiPhone, FiMail, FiTrendingUp } from "react-icons/fi";
import { FaWhatsapp } from "react-icons/fa";
import { Link } from "react-router-dom";

const WHATSAPP = "994773999966";
const EMAIL = "nuriyevaliyar@gmail.com";

const proof = [
  "Real imtahan formatı",
  "Mərhələli həllər",
  "Ani nəticə analizi",
];

const contact = [
  {
    href: `https://wa.me/${WHATSAPP}`,
    icon: FaWhatsapp,
    label: "WhatsApp",
    external: true,
  },
  { href: `tel:+${WHATSAPP}`, icon: FiPhone, label: "Zəng" },
  { href: `mailto:${EMAIL}`, icon: FiMail, label: "E-poçt" },
];

const Hero = () => (
  // -mt-16 pulls the green up UNDER the sticky (transparent) header so the
  // navbar reads as part of the hero. On laptop the section fills the viewport
  // (min-h-screen + centred) so there's no white gap above or below the fold.
  <section className="relative -mt-16 overflow-hidden text-white lg:flex lg:min-h-screen lg:items-center">
    {/* Drenched forest-green stage — the brand colour carries the fold. */}
    <div
      aria-hidden
      className="absolute inset-0"
      style={{ background: "linear-gradient(148deg,#0b2a1a 0%,#1a5636 52%,#0d3223 100%)" }}
    />
    {/* warm gold glow, top-right, like chalk-dust light */}
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 opacity-70"
      style={{ background: "radial-gradient(60% 45% at 88% 12%, rgba(226,182,87,0.28), transparent 58%)" }}
    />
    {/* graph-paper grid */}
    <div aria-hidden className="pointer-events-none absolute inset-0 bg-graph-on-dark opacity-[0.06]" />
    {/* faint π watermark, bottom-left */}
    <span
      aria-hidden
      className="pointer-events-none absolute -bottom-10 -left-6 select-none font-display text-[180px] font-black leading-none text-white/[0.04] sm:-bottom-16 sm:-left-8 sm:text-[260px]"
    >
      π
    </span>

    <div className="container-app relative grid items-center gap-9 pb-14 pt-24 sm:gap-10 lg:w-full lg:grid-cols-[1.12fr_0.88fr] lg:gap-14 lg:py-24">
      {/* ── Left: the pitch ── */}
      <div className="animate-fade-rise">
        <span className="inline-flex items-center gap-2 rounded-full border border-amber-300/30 bg-amber-300/10 px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-amber-200">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-300" />
          Azərbaycanda riyaziyyat hazırlığı
        </span>

        <h1 className="mt-5 font-display text-[2.05rem] font-extrabold leading-[1.08] tracking-tight sm:text-5xl sm:leading-[1.05] lg:text-[3.9rem]">
          Riyaziyyatı sadəcə öyrənmə.{" "}
          <span className="text-amber-300">İmtahanda həll et.</span>
        </h1>

        <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-emerald-50/85 sm:mt-5 sm:text-lg">
          Buraxılış, qəbul və blok imtahanları — hamısı bir platformada. Real formatda
          sınaqlar, mərhələli həllər və nəticələrinə uyğun şəxsi hazırlıq.
        </p>

        <div className="mt-7 flex flex-col gap-3 sm:mt-8 sm:flex-row sm:flex-wrap sm:items-center">
          <Link
            to="/register"
            className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-amber-400 px-7 text-base font-bold text-emerald-950 shadow-lift transition-all duration-200 ease-out-quint hover:-translate-y-0.5 hover:bg-amber-300"
          >
            Pulsuz başla <FiArrowRight className="text-[18px]" />
          </Link>
          <a
            href="#sinaqlar"
            className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-white/25 px-7 text-base font-semibold text-white transition-colors hover:bg-white/10"
          >
            Sınaqlara bax
          </a>
          <Link
            to="/ourSuccess"
            className="inline-flex h-12 items-center justify-center gap-2 rounded-xl px-4 text-[15px] font-semibold text-emerald-100/90 transition-colors hover:bg-white/10 hover:text-white"
          >
            <FiTrendingUp className="text-[18px]" /> Uğurlarımız
          </Link>
        </div>

        <ul className="mt-7 flex flex-wrap gap-x-5 gap-y-2.5 sm:mt-8 sm:gap-x-6 sm:gap-y-3">
          {proof.map((p) => (
            <li key={p} className="flex items-center gap-2 text-[13px] font-medium text-emerald-50 sm:text-sm">
              <FiCheckCircle className="shrink-0 text-amber-300" /> {p}
            </li>
          ))}
        </ul>
      </div>

      {/* ── Right: the teacher ── */}
      <div className="animate-fade-rise mx-auto w-full max-w-sm lg:max-w-none [animation-delay:120ms]">
        <figure className="relative overflow-hidden rounded-3xl border-2 border-white/15 shadow-lift">
          <img
            src="/teacher.jpg"
            alt="Əliyar Nuriyev — riyaziyyat müəllimi"
            className="aspect-[4/5] w-full object-cover object-[center_22%]"
          />
          <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 via-black/25 to-transparent p-4 pt-14">
            <p className="font-display text-lg font-bold text-white">Əliyar Nuriyev</p>
            <span className="mt-1 inline-flex items-center gap-1.5 rounded-full bg-amber-300/20 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-amber-100">
              Riyaziyyat müəllimi
            </span>
          </figcaption>
        </figure>

        {/* contact strip */}
        <div className="mt-3 flex items-center justify-between gap-3 rounded-2xl border border-white/12 bg-white/8 p-3">
          <p className="pl-1 text-sm font-semibold text-emerald-50">Sualın var? Yaz.</p>
          <ul className="flex items-center gap-2">
            {contact.map(({ href, icon: Icon, label, external }) => (
              <li key={label}>
                <a
                  href={href}
                  {...(external ? { target: "_blank", rel: "noreferrer" } : {})}
                  aria-label={label}
                  title={label}
                  className="grid h-10 w-10 place-items-center rounded-xl bg-white/12 text-white transition-colors hover:bg-amber-300 hover:text-emerald-950"
                >
                  <Icon className="text-[17px]" />
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  </section>
);

export default Hero;
