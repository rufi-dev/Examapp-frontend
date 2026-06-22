import { useState, useEffect } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import {
  FiClock,
  FiActivity,
  FiList,
  FiBarChart2,
  FiTarget,
  FiArrowRight,
  FiCheckCircle,
  FiSearch,
  FiTrendingUp,
  FiFileText,
} from "react-icons/fi";
import Hero from "../components/Hero";
import Button from "../components/ui/Button";
import SectionTitle from "../components/ui/SectionTitle";
import { MathText } from "../components/Math";
import TopicCard from "../components/blueprint/TopicCard";
import {
  MathGridBackground,
  CoordinatePlane,
  ParabolaCurve,
  SineWave,
  UnitCircle,
  TriangleDiagram,
  NumberLine,
  ProbabilityTree,
  RadialScore,
  SkillBar,
} from "../components/blueprint/MathVisuals";

const valueItems = [
  { icon: FiClock, label: "Real imtahan formatı" },
  { icon: FiActivity, label: "Mövzu üzrə sınaqlar" },
  { icon: FiList, label: "Addım-addım həll" },
  { icon: FiBarChart2, label: "Nəticə analizi" },
  { icon: FiTarget, label: "Şəxsi məşq planı" },
];

const topics = [
  { title: "Cəbr", example: "Məsələn: $2x + 5 = 17$", count: 24, accent: "text-primary",
    diagram: <NumberLine className="h-full w-full" point={6} /> },
  { title: "Həndəsə", example: "Məsələn: $\\angle A = 60^\\circ$", count: 18, accent: "text-cyan",
    diagram: <TriangleDiagram className="h-full w-full" /> },
  { title: "Triqonometriya", example: "Məsələn: $\\sin\\theta = \\dfrac{a}{c}$", count: 12, accent: "text-advanced",
    diagram: <SineWave className="h-full w-full" draw /> },
  { title: "Funksiyalar", example: "Məsələn: $f(x) = x^2 - 4$", count: 16, accent: "text-primary",
    diagram: <ParabolaCurve className="h-full w-full" draw /> },
  { title: "Ehtimal və statistika", example: "Məsələn: $P(A) = \\dfrac{3}{8}$", count: 10, accent: "text-cyan",
    diagram: <ProbabilityTree className="h-full w-full" /> },
  { title: "Məntiqi məsələlər", example: "Məsələn: $2,\\ 6,\\ 12,\\ 20,\\ ?$", count: 14, accent: "text-advanced",
    diagram: <UnitCircle className="h-full w-full" /> },
];

const skills = [
  { label: "Cəbr", value: 92, tone: "good" },
  { label: "Həndəsə", value: 81, tone: "good" },
  { label: "Funksiyalar", value: 68, tone: "mid" },
  { label: "Triqonometriya", value: 54, tone: "weak" },
  { label: "Ehtimal", value: 74, tone: "mid" },
];

const navSeq = [12, 7, 25, 3, 18, 31, 9, 22, 14, 5];

const Home = () => {
  // Newest exams from OPEN (public) classes — real content, no auth needed.
  const [publicExams, setPublicExams] = useState([]);
  useEffect(() => {
    let on = true;
    axios
      .get(`${import.meta.env.VITE_BACKEND_URL}/api/quiz/publicExams`)
      .then((r) => {
        if (on) setPublicExams(Array.isArray(r.data) ? r.data : []);
      })
      .catch(() => {});
    return () => {
      on = false;
    };
  }, []);

  return (
    <>
      {/* 1 — HERO */}
      <Hero />

      {/* 2 — VALUE STRIP */}
      <section className="container-app">
        <div className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-3 lg:grid-cols-5">
          {valueItems.map(({ icon: Icon, label }) => (
            <div key={label} className="flex items-center gap-2.5 bg-surface px-4 py-4">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                <Icon className="text-[18px]" />
              </span>
              <span className="text-sm font-semibold text-text">{label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* 3 — TOPIC EXPLORER */}
      <section id="topics" className="container-app scroll-mt-24 py-20 sm:py-24">
        <SectionTitle
          eyebrow="Mövzular"
          title="İmtahanda çıxan hər mövzunu ayrıca gücləndir."
          subtitle="Sadə hesablamalardan mürəkkəb məsələlərə qədər hər mövzu üzrə məqsədli məşq et."
        />
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {topics.map((t) => (
            <TopicCard key={t.title} {...t} />
          ))}
        </div>
      </section>

      {/* 3.5 — LATEST OPEN EXAMS (real content from public classes) */}
      {publicExams.length > 0 && (
        <section className="container-app pb-16 sm:pb-24">
          <SectionTitle
            eyebrow="Açıq sınaqlar"
            title="Son əlavə olunan sınaqlar"
            subtitle="Müəllimlərin açıq paylaşdığı ən yeni imtahanlar — seç və həll etməyə başla."
          />
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {publicExams.slice(0, 6).map((e) => {
              const isNew =
                e.createdAt &&
                Date.now() - new Date(e.createdAt).getTime() < 3 * 24 * 60 * 60 * 1000;
              return (
                <Link
                  key={e._id}
                  to={`/exam/details/${e._id}`}
                  className="group flex flex-col rounded-2xl border border-line bg-surface p-6 shadow-soft transition-all duration-300 ease-out-quint hover:-translate-y-1 hover:border-primary/50 hover:shadow-lift"
                >
                  <div className="flex items-start justify-between gap-3">
                    <span className="grid h-11 w-11 place-items-center rounded-xl bg-primary/12 text-primary">
                      <FiFileText className="text-[20px]" />
                    </span>
                    {isNew && (
                      <span className="rounded-md bg-success/15 px-2 py-0.5 text-xs font-bold text-success">
                        Yeni
                      </span>
                    )}
                  </div>
                  <h3 className="mt-4 line-clamp-2 font-display text-lg font-bold text-text">
                    {e.name}
                  </h3>
                  {e.class?.name && <p className="mt-1 text-sm text-muted">{e.class.name}</p>}
                  <div className="mt-4 grid grid-cols-3 gap-2 border-t border-line pt-4 text-center">
                    <div>
                      <p className="font-display text-lg font-bold text-text">{e.questionCount}</p>
                      <p className="text-xs text-muted">Sual</p>
                    </div>
                    <div>
                      <p className="font-display text-lg font-bold text-text">
                        {Math.round((e.duration || 0) / 60)}
                      </p>
                      <p className="text-xs text-muted">Dəq</p>
                    </div>
                    <div>
                      <p className="font-display text-lg font-bold text-text">{e.totalMarks}</p>
                      <p className="text-xs text-muted">Bal</p>
                    </div>
                  </div>
                  <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-primary">
                    Başla <FiArrowRight className="transition-transform group-hover:translate-x-0.5" />
                  </span>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* 4 — HOW IT WORKS */}
      <section className="relative overflow-hidden bg-surface2/50 py-20 sm:py-24">
        <MathGridBackground variant="dots" fade />
        <div className="container-app relative">
          <SectionTitle
            eyebrow="Necə işləyir"
            title="Hazırlığını təxmin etmə. Ölç və inkişaf et."
            subtitle="Üç sadə addımla harada olduğunu gör və hara getməli olduğunu bil."
          />
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {/* step 1 */}
            <div className="rounded-3xl border border-line bg-surface p-7 shadow-soft">
              <div className="flex items-center justify-between">
                <span className="font-display text-sm font-bold text-primary">01</span>
                <RadialScore value={48} label="başlanğıc" size={84} />
              </div>
              <h3 className="mt-4 font-display text-xl font-bold text-text">Öz səviyyəni yoxla</h3>
              <p className="mt-2 leading-relaxed text-muted">
                Real imtahan formatında ilkin sınaqla hazırkı nəticəni gör.
              </p>
            </div>
            {/* step 2 */}
            <div className="rounded-3xl border border-line bg-surface p-7 shadow-soft">
              <div className="flex items-center justify-between">
                <span className="font-display text-sm font-bold text-primary">02</span>
                <FiSearch className="text-2xl text-cyan" />
              </div>
              <div className="mt-4 space-y-2.5">
                {skills.slice(0, 3).map((s) => (
                  <SkillBar key={s.label} {...s} />
                ))}
              </div>
              <h3 className="mt-5 font-display text-xl font-bold text-text">Zəif mövzularını tap</h3>
              <p className="mt-2 leading-relaxed text-muted">
                Nəticələrin mövzulara bölünür və harada daha çox məşq lazım olduğunu görürsən.
              </p>
            </div>
            {/* step 3 */}
            <div className="rounded-3xl border border-line bg-surface p-7 shadow-soft">
              <div className="flex items-center justify-between">
                <span className="font-display text-sm font-bold text-primary">03</span>
                <FiTrendingUp className="text-2xl text-success" />
              </div>
              <NumberLine className="mt-4 h-12 w-full text-primary" point={7} />
              <h3 className="mt-4 font-display text-xl font-bold text-text">Planlı şəkildə yüksəl</h3>
              <p className="mt-2 leading-relaxed text-muted">
                BunkerMath sənə növbəti həll etməli olduğun sualları və mövzuları göstərir.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 5 — REAL EXAM PREVIEW (dark workspace) */}
      <section id="exam-preview" className="relative scroll-mt-24 overflow-hidden section-navy py-20 text-white sm:py-24">
        <div aria-hidden className="pointer-events-none absolute inset-0 bg-graph-on-dark [mask-image:radial-gradient(ellipse_at_top,black,transparent_75%)]" />
        <div className="container-app relative">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-xs font-bold uppercase tracking-wider text-cyan">Real imtahan mühiti</p>
            <h2 className="mt-3 font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
              İmtahanda nə görəcəksənsə, məşqdə də onu gör.
            </h2>
            <p className="mx-auto mt-4 max-w-xl leading-relaxed text-white/70">
              Zaman limiti, sual nömrələri, cavab paneli və nəticə analizi ilə real imtahan hissini yaşa.
            </p>
          </div>

          {/* mock exam interface */}
          <div className="mx-auto mt-12 max-w-4xl overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04] shadow-lift">
            {/* top bar */}
            <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3 sm:px-5">
              <span className="truncate text-sm font-semibold">Buraxılış sınağı — Riyaziyyat</span>
              <div className="flex items-center gap-2 sm:gap-3">
                <span className="inline-flex items-center gap-1.5 rounded-lg bg-white/10 px-2.5 py-1 text-sm font-bold tabular-nums">
                  <FiClock className="text-cyan" /> 38:05
                </span>
                <span className="hidden rounded-lg bg-white/10 px-2.5 py-1 text-sm font-semibold sm:inline">18 / 40</span>
                <span className="rounded-lg bg-danger px-3 py-1 text-sm font-semibold text-white">Bitir</span>
              </div>
            </div>

            <div className="grid gap-px bg-white/10 sm:grid-cols-[auto_1fr]">
              {/* question navigator */}
              <div className="section-navy p-4">
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-white/50">Suallar</p>
                <div className="grid grid-cols-5 gap-1.5 sm:w-36">
                  {navSeq.map((n, i) => (
                    <span
                      key={i}
                      className={`grid h-8 place-items-center rounded-md text-xs font-bold ${
                        i === 4
                          ? "bg-cyan text-navy ring-2 ring-cyan/40"
                          : i % 3 === 0
                          ? "bg-primary text-white"
                          : "bg-white/10 text-white/70"
                      }`}
                    >
                      {n}
                    </span>
                  ))}
                </div>
                <div className="mt-3 space-y-1.5 text-[11px] text-white/60">
                  <p className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-primary" /> Cavablanıb</p>
                  <p className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-white/20" /> Boş</p>
                  <p className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-cyan" /> Cari</p>
                </div>
              </div>

              {/* question panel */}
              <div className="section-navy p-5 sm:p-7">
                <p className="text-xs font-semibold text-white/50">Sual 19 · Funksiyalar</p>
                <p className="mt-2 text-[15px] text-white/90">
                  Aşağıdakı funksiyanın minimum qiymətini tapın:
                </p>
                <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-5 text-center font-display text-2xl text-white">
                  <MathText text="$f(x) = x^2 - 6x + 11$" />
                </div>
                <label className="mt-5 block text-xs font-semibold text-white/50">Cavabınızı daxil edin</label>
                <div className="mt-1.5 flex items-center gap-2.5">
                  <div className="flex h-11 flex-1 items-center rounded-xl border border-white/15 bg-white/5 px-4 font-display text-lg text-white">
                    <span className="text-cyan">2</span>
                    <span className="ml-0.5 inline-block h-5 w-px animate-pulse bg-cyan" />
                  </div>
                  <span className="grid h-11 w-11 place-items-center rounded-xl bg-primary text-white">
                    <FiArrowRight />
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 6 — PERFORMANCE ANALYTICS */}
      <section className="container-app py-20 sm:py-24">
        <SectionTitle
          eyebrow="Nəticə analizi"
          title="Nəticəni sadəcə görmə. Səbəbini anla."
          subtitle="Hər sınaqdan sonra mövzu üzrə nəticələrini gör və növbəti addımını bil."
        />
        <div className="mt-12 grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
          {/* score */}
          <div className="flex flex-col items-center justify-center rounded-3xl border border-line bg-surface p-8 text-center shadow-soft">
            <RadialScore value={78} label="100 baldan" size={168} />
            <p className="mt-5 font-display text-lg font-bold text-text">Son sınaq nəticən</p>
            <p className="mt-1 text-sm text-muted">32 düzgün · 6 səhv · 2 cavabsız</p>
          </div>
          {/* topic bars + recommendation */}
          <div className="rounded-3xl border border-line bg-surface p-7 shadow-soft sm:p-8">
            <p className="mb-5 font-display text-base font-bold text-text">Mövzu üzrə nəticə</p>
            <div className="space-y-4">
              {skills.map((s) => (
                <SkillBar key={s.label} {...s} />
              ))}
            </div>
            <div className="mt-6 flex items-start gap-3 rounded-2xl border border-warning/30 bg-warning/10 px-4 py-3.5">
              <FiTarget className="mt-0.5 shrink-0 text-warning" />
              <p className="text-sm text-text">
                <span className="font-semibold">Tövsiyə:</span> Triqonometriya üzrə 3 əlavə sınaq et —
                ən çox səhv etdiyin mövzu budur.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 7 — DAILY CHALLENGE */}
      <section className="container-app pb-20 sm:pb-24">
        <div className="relative overflow-hidden rounded-3xl border border-line bg-surface p-7 shadow-soft sm:p-10">
          <CoordinatePlane className="pointer-events-none absolute -right-10 -top-10 h-56 w-56 text-primary/30" />
          <div className="relative grid items-center gap-8 lg:grid-cols-[1.1fr_0.9fr]">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full bg-advanced/12 px-3 py-1 text-xs font-bold text-advanced">
                Bugünün sualı
              </span>
              <p className="mt-4 font-display text-xl font-bold leading-relaxed text-text sm:text-2xl">
                Bir düzbucaqlının uzunluğu enindən 4 sm çoxdur. Sahəsi 96 sm²-dirsə, enini tapın.
              </p>
              <Button to="/register" size="lg" className="mt-6">
                Həll etməyə başla <FiArrowRight />
              </Button>
            </div>
            {/* rectangle diagram */}
            <div className="flex justify-center">
              <svg viewBox="0 0 260 170" className="w-full max-w-xs text-primary" fill="none" aria-hidden>
                <rect x="30" y="40" width="200" height="100" rx="4" stroke="currentColor" strokeWidth="2.5" fill="currentColor" fillOpacity="0.05" />
                <text x="130" y="28" textAnchor="middle" fontSize="15" fontWeight="700" fill="currentColor">x + 4</text>
                <text x="16" y="95" textAnchor="middle" fontSize="15" fontWeight="700" fill="currentColor" transform="rotate(-90 16 95)">x</text>
                <text x="130" y="96" textAnchor="middle" fontSize="16" fontWeight="700" className="fill-muted">S = 96 sm²</text>
              </svg>
            </div>
          </div>
        </div>
      </section>

      {/* 8 — FINAL CTA */}
      <section className="relative overflow-hidden section-navy text-white">
        <div aria-hidden className="pointer-events-none absolute inset-0 bg-graph-on-dark [mask-image:radial-gradient(ellipse_at_center,black,transparent_80%)]" />
        <div className="container-app relative pb-10 pt-20 text-center sm:pb-12 sm:pt-28">
          <h2 className="mx-auto max-w-2xl font-display text-3xl font-extrabold tracking-tight sm:text-5xl">
            Növbəti imtahana daha hazırlıqlı gir.
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-lg leading-relaxed text-white/70">
            Bu gün sınağa başla və riyaziyyat nəticəni sistemli şəkildə yüksəlt.
          </p>
          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              to="/register"
              className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-primary px-7 text-base font-semibold text-primary-fg shadow-glow transition-transform hover:-translate-y-0.5"
            >
              İlk sınağa başla <FiArrowRight />
            </Link>
            <a
              href="#topics"
              className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-white/20 px-7 text-base font-semibold text-white transition-colors hover:bg-white/10"
            >
              Mövzuları araşdır
            </a>
          </div>
          <ul className="mx-auto mt-9 flex max-w-md flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-white/60">
            <li className="flex items-center gap-2"><FiCheckCircle className="text-cyan" /> Pulsuz başla</li>
            <li className="flex items-center gap-2"><FiCheckCircle className="text-cyan" /> Real imtahan formatı</li>
            <li className="flex items-center gap-2"><FiCheckCircle className="text-cyan" /> Nəticə analizi</li>
          </ul>
        </div>
      </section>
    </>
  );
};

export default Home;
