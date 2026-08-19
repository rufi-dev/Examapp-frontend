import { useState, useEffect } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import { FiArrowRight, FiCheckCircle } from "react-icons/fi";
import Hero from "../components/Hero";
import ExamCard from "../components/ExamCard";

// Centred editorial section header: a plain eyebrow, a large display title, and
// a fading hairline rule under it — the landing's premium section-lead treatment.
const SectionHeader = ({ title }) => (
  <div className="mx-auto max-w-2xl text-center">
    <h2 className="font-display text-3xl font-extrabold tracking-tight text-text sm:text-[2.6rem] sm:leading-[1.08]">
      {title}
    </h2>
    <div className="mx-auto mt-5 h-px w-24 bg-gradient-to-r from-transparent via-primary/45 to-transparent" />
  </div>
);

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

      {/* 2 — LATEST OPEN EXAMS. Stays mounted while loading (skeletons) so the
          layout doesn't collapse and the dark section below doesn't jump up on
          every refresh. Hidden only once we KNOW there are no public exams. */}
      {(loadingExams || publicExams.length > 0) && (
        <section id="sinaqlar" className="relative scroll-mt-24 overflow-hidden py-14 sm:py-20">
          {/* Decorative stage: faint graph paper + a soft green aura up top. */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-graph opacity-70 [mask-image:radial-gradient(85%_55%_at_50%_0%,black,transparent_78%)]"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -top-28 left-1/2 h-72 w-[46rem] max-w-[95%] -translate-x-1/2 rounded-full bg-primary/[0.07] blur-3xl"
          />
          <div className="container-app relative">
            <SectionHeader title="Son əlavə olunan sınaqlar" />
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
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
          </div>
        </section>
      )}

      {/* 3.5 — HOW IT WORKS: mobile screen-recording demo. Renders only once a
          recording exists at /demo.mp4 (drop the file into Frontend/public/, and
          optionally a /demo-poster.jpg thumbnail). */}
      {hasDemo && (
        <section
          id="demo"
          className="relative scroll-mt-24 overflow-hidden border-y border-line bg-surface2/40 py-14 sm:py-20"
        >
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-graph opacity-50 [mask-image:radial-gradient(90%_80%_at_100%_50%,black,transparent_80%)]"
          />
          <div className="container-app relative grid items-center gap-12 lg:grid-cols-2">
            <div className="text-center lg:text-left">
              <h2 className="font-display text-3xl font-extrabold tracking-tight text-text sm:text-[2.5rem] sm:leading-[1.1]">
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

      {/* FINAL CTA — a drenched forest-green band; its gradient ends on the
          footer's green so the two flow together with no seam. */}
      <section className="relative overflow-hidden text-white">
        <div
          aria-hidden
          className="absolute inset-0"
          style={{ background: "linear-gradient(180deg,#0c2c1c 0%,#124029 52%,#0f3826 100%)" }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-60"
          style={{ background: "radial-gradient(50% 45% at 85% 10%, rgba(226,182,87,0.22), transparent 62%)" }}
        />
        <div aria-hidden className="pointer-events-none absolute inset-0 bg-graph-on-dark opacity-70" />
        <div className="container-app relative py-16 text-center sm:py-24">
          <h2 className="mx-auto max-w-2xl font-display text-3xl font-extrabold tracking-tight sm:text-5xl">
            Növbəti imtahana daha hazırlıqlı gir.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-lg leading-relaxed text-emerald-50/85">
            Bu gün sınağa başla və riyaziyyat nəticəni sistemli şəkildə yüksəlt.
          </p>
          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              to="/register"
              className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-amber-400 px-7 text-base font-bold text-emerald-950 shadow-lift transition-all duration-200 ease-out-quint hover:-translate-y-0.5 hover:bg-amber-300"
            >
              İlk sınağa başla <FiArrowRight />
            </Link>
            <a
              href="#sinaqlar"
              className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-white/25 px-7 text-base font-semibold text-white transition-colors hover:bg-white/10"
            >
              Sınaqlara bax
            </a>
          </div>
          <ul className="mx-auto mt-9 flex max-w-md flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-emerald-50">
            <li className="flex items-center gap-2"><FiCheckCircle className="text-amber-300" /> Pulsuz başla</li>
            <li className="flex items-center gap-2"><FiCheckCircle className="text-amber-300" /> Real imtahan formatı</li>
            <li className="flex items-center gap-2"><FiCheckCircle className="text-amber-300" /> Nəticə analizi</li>
          </ul>
        </div>
      </section>
    </>
  );
};

export default Home;
