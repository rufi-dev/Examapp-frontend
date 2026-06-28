import { useState, useEffect } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import { FiClock, FiArrowRight, FiCheckCircle } from "react-icons/fi";
import Hero from "../components/Hero";
import SectionTitle from "../components/ui/SectionTitle";
import ExamCard from "../components/ExamCard";
import { MathText } from "../components/Math";

const navSeq = [12, 7, 25, 3, 18, 31, 9, 22, 14, 5];

const Home = () => {
  // Newest exams from OPEN (public) classes — real content, no auth needed.
  const [publicExams, setPublicExams] = useState([]);
  const [loadingExams, setLoadingExams] = useState(true);
  // The "Necə işləyir?" demo shows only once a screen recording exists at
  // /demo.mp4 (drop the file into Frontend/public/). This avoids an empty
  // video player on the live site before the recording is uploaded.
  const [hasDemo, setHasDemo] = useState(false);
  useEffect(() => {
    let on = true;
    fetch("/demo.mp4", { method: "HEAD" })
      .then((r) => {
        if (on) setHasDemo(r.ok);
      })
      .catch(() => {});
    return () => {
      on = false;
    };
  }, []);
  useEffect(() => {
    let on = true;
    axios
      .get(`${import.meta.env.VITE_BACKEND_URL}/api/quiz/publicExams`)
      .then((r) => {
        if (on) setPublicExams(Array.isArray(r.data) ? r.data : []);
      })
      .catch(() => {})
      .finally(() => {
        if (on) setLoadingExams(false);
      });
    return () => {
      on = false;
    };
  }, []);

  return (
    <>
      {/* 1 — HERO */}
      <Hero />

      {/* 3 — LATEST OPEN EXAMS. Stays mounted while loading (skeletons) so the
          layout doesn't collapse and the dark section below doesn't jump up on
          every refresh. Hidden only once we KNOW there are no public exams. */}
      {(loadingExams || publicExams.length > 0) && (
        <section id="sinaqlar" className="container-app scroll-mt-24 py-20 sm:py-24">
          <SectionTitle
            eyebrow="Açıq sınaqlar"
            title="Son əlavə olunan sınaqlar"
            subtitle="Müəllimlərin açıq paylaşdığı ən yeni imtahanlar — seç və həll etməyə başla."
          />
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {loadingExams
              ? Array.from({ length: 3 }).map((_, k) => (
                  <div
                    key={k}
                    className="animate-pulse overflow-hidden rounded-2xl border border-line bg-surface"
                  >
                    <div className="h-40 bg-surface2" />
                    <div className="space-y-3 p-5">
                      <div className="h-4 w-3/4 rounded bg-surface2" />
                      <div className="flex gap-3">
                        <div className="h-12 flex-1 rounded-lg bg-surface2" />
                        <div className="h-12 flex-1 rounded-lg bg-surface2" />
                        <div className="h-12 flex-1 rounded-lg bg-surface2" />
                      </div>
                      <div className="h-10 w-full rounded-xl bg-surface2" />
                    </div>
                  </div>
                ))
              : publicExams.slice(0, 6).map((e) => (
                  <ExamCard key={e._id} exam={e} publicView />
                ))}
          </div>
        </section>
      )}

      {/* 3.5 — HOW IT WORKS: mobile screen-recording demo. Renders only once a
          recording exists at /demo.mp4 (drop the file into Frontend/public/, and
          optionally a /demo-poster.jpg thumbnail). */}
      {hasDemo && (
        <section id="demo" className="container-app scroll-mt-24 py-20 sm:py-24">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div className="text-center lg:text-left">
              <p className="text-xs font-bold uppercase tracking-wider text-primary">Necə işləyir?</p>
              <h2 className="mt-3 font-display text-3xl font-extrabold tracking-tight text-text sm:text-4xl">
                Telefonunda bir neçə toxunuşla sınağa başla.
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-lg leading-relaxed text-muted lg:mx-0">
                Qeydiyyatdan keç, sinfinə qoşul və imtahana başla — hamısı telefonda.
                Videoda saytın necə işlədiyini addım-addım izlə.
              </p>
              <ul className="mx-auto mt-6 flex max-w-xs flex-col gap-2.5 text-left text-sm text-muted lg:mx-0">
                <li className="flex items-center gap-2.5"><FiCheckCircle className="shrink-0 text-primary" /> Qeydiyyat və sinfə qoşulma</li>
                <li className="flex items-center gap-2.5"><FiCheckCircle className="shrink-0 text-primary" /> İmtahanı həll etmək</li>
                <li className="flex items-center gap-2.5"><FiCheckCircle className="shrink-0 text-primary" /> Nəticə və analiz</li>
              </ul>
              <Link
                to="/register"
                className="mt-8 inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-primary px-7 text-base font-semibold text-primary-fg shadow-glow transition-transform hover:-translate-y-0.5"
              >
                Sən də başla <FiArrowRight />
              </Link>
            </div>

            {/* phone mockup holding the screen recording */}
            <div className="flex justify-center">
              <div className="relative">
                <div aria-hidden className="absolute -inset-6 rounded-full bg-primary/15 blur-3xl" />
                <div className="relative aspect-[9/19.5] w-[270px] overflow-hidden rounded-[2.75rem] border-[12px] border-navy bg-navy shadow-lift sm:w-[300px]">
                  <div aria-hidden className="absolute left-1/2 top-0 z-10 h-6 w-1/3 -translate-x-1/2 rounded-b-2xl bg-navy" />
                  <video
                    className="h-full w-full object-cover"
                    src="/demo.mp4"
                    poster="/demo-poster.jpg"
                    autoPlay
                    loop
                    muted
                    playsInline
                    controls
                    preload="auto"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* 4 — REAL EXAM PREVIEW (dark workspace) */}
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

      {/* 5 — FINAL CTA (white band — separates the navy preview from the footer) */}
      <section className="relative overflow-hidden bg-bg">
        <div aria-hidden className="pointer-events-none absolute inset-0 bg-graph [mask-image:radial-gradient(ellipse_at_center,black,transparent_72%)]" />
        <div className="container-app relative pb-12 pt-20 text-center sm:pb-16 sm:pt-28">
          <h2 className="mx-auto max-w-2xl font-display text-3xl font-extrabold tracking-tight text-text sm:text-5xl">
            Növbəti imtahana daha hazırlıqlı gir.
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-lg leading-relaxed text-muted">
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
              href="#sinaqlar"
              className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-line bg-surface px-7 text-base font-semibold text-text transition-colors hover:border-primary/50"
            >
              Sınaqlara bax
            </a>
          </div>
          <ul className="mx-auto mt-9 flex max-w-md flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-muted">
            <li className="flex items-center gap-2"><FiCheckCircle className="text-primary" /> Pulsuz başla</li>
            <li className="flex items-center gap-2"><FiCheckCircle className="text-primary" /> Real imtahan formatı</li>
            <li className="flex items-center gap-2"><FiCheckCircle className="text-primary" /> Nəticə analizi</li>
          </ul>
        </div>
      </section>
    </>
  );
};

export default Home;
