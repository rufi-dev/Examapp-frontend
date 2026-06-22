import { Link } from "react-router-dom";
import { FiArrowRight, FiTarget, FiActivity, FiClipboard, FiCheckCircle } from "react-icons/fi";
import Button from "../components/ui/Button";
import SectionTitle from "../components/ui/SectionTitle";
import {
  MathGridBackground,
  CoordinatePlane,
  ParabolaCurve,
  SkillBar,
} from "../components/blueprint/MathVisuals";

const blocks = [
  {
    icon: FiClipboard,
    title: "Real imtahana bənzəyən məşq",
    text: "Sual formatı, zaman limiti və cavab paneli əsl imtahanı təkrarlayır — beləcə imtahan günü heç nə yeni olmur, yalnız hazırlıq işə düşür.",
  },
  {
    icon: FiActivity,
    title: "Ölçülə bilən nəticə",
    text: "Hər sınaq mövzulara bölünür. Hansı mövzunu bildiyini və harada məşq lazım olduğunu rəqəmlərlə görürsən, təxminlə yox.",
  },
  {
    icon: FiTarget,
    title: "Şəxsi məşq planı",
    text: "Nəticələrinə əsasən növbəti həll etməli olduğun suallar və mövzular göstərilir — vaxtını ən çox fərq yaradan yerə yönəlt.",
  },
];

const About = () => (
  <>
    {/* header */}
    <section className="relative overflow-hidden">
      <MathGridBackground variant="graph" fade />
      <div className="container-app relative grid items-center gap-10 py-16 lg:grid-cols-[1.1fr_0.9fr] lg:py-24">
        <div className="animate-fade-rise">
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/8 px-3.5 py-1.5 text-xs font-semibold text-primary">
            Haqqımızda
          </span>
          <h1 className="mt-5 font-display text-4xl font-extrabold leading-[1.1] tracking-tight text-text sm:text-5xl">
            BunkerMath riyaziyyat hazırlığını daha{" "}
            <span className="text-primary">aydın və ölçülə bilən</span> edir.
          </h1>
          <p className="mt-5 max-w-xl text-lg leading-relaxed text-muted">
            Çoxları riyaziyyatı öyrənir, amma imtahanda nəticə ala bilmir. Fərq həll etmə
            təcrübəsindədir. BunkerMath məhz bunun üçün qurulub — öyrənməyi real imtahan həllinə
            çevirmək üçün.
          </p>
        </div>
        <div className="relative mx-auto w-full max-w-sm">
          <CoordinatePlane className="absolute inset-0 h-full w-full text-primary/40" />
          <div className="relative rounded-3xl border border-line bg-surface p-6 shadow-lift">
            <ParabolaCurve className="mx-auto h-28 w-44 text-primary" draw />
            <p className="mt-4 text-center font-display text-sm font-semibold text-text">
              Öyrən → Həll et → Nəticəni ölç
            </p>
          </div>
        </div>
      </div>
    </section>

    {/* value blocks */}
    <section className="container-app py-16 sm:py-20">
      <SectionTitle
        eyebrow="Niyə BunkerMath"
        title="Hazırlığı təsadüfdən çıxarıb sistemə salırıq."
        subtitle="Üç prinsip platformanın hər hissəsində özünü göstərir."
      />
      <div className="mt-12 grid gap-5 md:grid-cols-3">
        {blocks.map(({ icon: Icon, title, text }) => (
          <div key={title} className="rounded-3xl border border-line bg-surface p-7 shadow-soft">
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-primary/12 text-primary">
              <Icon className="text-[22px]" />
            </span>
            <h3 className="mt-4 font-display text-lg font-bold text-text">{title}</h3>
            <p className="mt-2 leading-relaxed text-muted">{text}</p>
          </div>
        ))}
      </div>
    </section>

    {/* analytics strip */}
    <section className="relative overflow-hidden bg-surface2/50 py-16 sm:py-20">
      <MathGridBackground variant="dots" fade />
      <div className="container-app relative grid items-center gap-10 lg:grid-cols-2">
        <div>
          <h2 className="font-display text-3xl font-extrabold tracking-tight text-text sm:text-4xl">
            Nəticən sadəcə bal deyil — yol xəritəsidir.
          </h2>
          <p className="mt-4 max-w-xl leading-relaxed text-muted">
            Mövzu üzrə nəticələrini görəndə nəyin üzərində işləməli olduğun aydınlaşır. Bu, hər
            şagird üçün fərqli və konkret bir plan deməkdir.
          </p>
          <ul className="mt-6 space-y-3">
            {["Mövzu üzrə güclü və zəif tərəflər", "Səhv nümunələrinin təhlili", "Növbəti addımın tövsiyəsi"].map((p) => (
              <li key={p} className="flex items-center gap-2.5 text-text">
                <FiCheckCircle className="shrink-0 text-primary" /> {p}
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-3xl border border-line bg-surface p-7 shadow-soft sm:p-8">
          <p className="mb-5 font-display text-base font-bold text-text">Mövzu üzrə nəticə</p>
          <div className="space-y-4">
            <SkillBar label="Cəbr" value={92} tone="good" />
            <SkillBar label="Funksiyalar" value={68} tone="mid" />
            <SkillBar label="Triqonometriya" value={54} tone="weak" />
          </div>
        </div>
      </div>
    </section>

    {/* mission */}
    <section className="relative overflow-hidden section-navy text-white">
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-graph-on-dark [mask-image:radial-gradient(ellipse_at_center,black,transparent_80%)]" />
      <div className="container-app relative pb-10 pt-20 text-center sm:pb-12 sm:pt-24">
        <p className="text-xs font-bold uppercase tracking-wider text-cyan">Missiyamız</p>
        <h2 className="mx-auto mt-4 max-w-3xl font-display text-2xl font-extrabold leading-snug tracking-tight sm:text-4xl">
          Hər şagirdə riyaziyyat nəticəsini anlamaq və yüksəltmək üçün daha aydın yol vermək.
        </h2>
        <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            to="/register"
            className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-primary px-7 text-base font-semibold text-primary-fg shadow-glow transition-transform hover:-translate-y-0.5"
          >
            Sınağa başla <FiArrowRight />
          </Link>
          <Button to="/contact" variant="secondary" size="lg" className="border-white/20 bg-transparent text-white hover:bg-white/10">
            Bizimlə əlaqə
          </Button>
        </div>
      </div>
    </section>
  </>
);

export default About;
