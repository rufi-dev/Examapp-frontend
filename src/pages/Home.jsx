import {
  FiClock,
  FiZap,
  FiCheckCircle,
  FiBarChart2,
  FiArrowRight,
} from "react-icons/fi";
import Hero from "../components/Hero";
import Categories from "../components/Categories";
import Container from "../components/ui/Container";
import SectionTitle from "../components/ui/SectionTitle";
import Button from "../components/ui/Button";

const features = [
  {
    icon: FiClock,
    title: "Real vaxt sınaqları",
    desc: "Geri sayım taymeri ilə əsl imtahan təcrübəsi. Təzyiq altında vaxtını idarə etməyi öyrən.",
    wide: true,
  },
  {
    icon: FiZap,
    title: "Anlıq nəticə",
    desc: "İmtahanı bitirən kimi balını və düzgün cavabları gör.",
  },
  {
    icon: FiCheckCircle,
    title: "Hər sualın təhlili",
    desc: "Səhvlərini anla, izahları oxu, növbəti dəfə düzəlt.",
  },
  {
    icon: FiBarChart2,
    title: "İnkişafını izlə",
    desc: "Nəticələrin, sual tiplərinə görə bölgün və irəliləyişin bir yerdə toplanır.",
    wide: true,
  },
];

const steps = [
  {
    n: "01",
    title: "Qeydiyyatdan keç",
    desc: "Pulsuz hesab yarat və ya Google ilə dərhal daxil ol.",
  },
  {
    n: "02",
    title: "İmtahanı seç və həll et",
    desc: "Kateqoriyalardan sınaqı seç, taymerlə real şəraitdə həll et.",
  },
  {
    n: "03",
    title: "Nəticəni təhlil et",
    desc: "Balını gör, səhvlərini öyrən və daha yaxşı nəticə üçün təkrar cəhd et.",
  },
];

const Home = () => {
  return (
    <>
      <Hero />

      {/* Features */}
      <section id="features" className="scroll-mt-24 py-20 sm:py-28">
        <Container>
          <SectionTitle
            eyebrow="Niyə İmtahan?"
            title="Sınaqdan nəticəyə qədər hər şey bir yerdə"
            subtitle="Yalnız sual həll etmək deyil. Hazırlaşmağı, ölçməyi və inkişaf etməyi bir axında birləşdirdik."
          />

          <div className="mt-12 grid gap-5 lg:grid-cols-3">
            {features.map((f) => {
              const Icon = f.icon;
              return (
                <div
                  key={f.title}
                  className={`group rounded-3xl border border-line bg-surface p-7 shadow-soft transition-all duration-200 ease-out-quint hover:-translate-y-1 hover:shadow-lift ${
                    f.wide ? "lg:col-span-2" : ""
                  }`}
                >
                  <span className="grid h-12 w-12 place-items-center rounded-xl bg-primary/12 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-fg">
                    <Icon className="text-[22px]" />
                  </span>
                  <h3 className="mt-5 font-display text-xl font-bold text-text">{f.title}</h3>
                  <p className="mt-2 max-w-md leading-relaxed text-muted">{f.desc}</p>
                </div>
              );
            })}
          </div>
        </Container>
      </section>

      {/* Categories */}
      <section className="py-20 sm:py-24">
        <Container>
          <SectionTitle
            align="center"
            eyebrow="Ən çox işlənənlər"
            title="İmtahan kateqoriyaları"
            subtitle="Hazırlaşmaq istədiyin istiqaməti seç və sınaqlara başla."
            className="mb-12"
          />
          <Categories />
        </Container>
      </section>

      {/* How it works */}
      <section id="how" className="scroll-mt-24 py-20 sm:py-24">
        <Container>
          <SectionTitle
            eyebrow="Necə işləyir"
            title="Üç sadə addım"
            subtitle="Hazırlaşmağa başlamaq üçün mürəkkəb bir şey lazım deyil."
          />
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {steps.map((s) => (
              <div key={s.n} className="relative">
                <span className="font-display text-5xl font-extrabold text-primary/25">{s.n}</span>
                <h3 className="mt-2 font-display text-xl font-bold text-text">{s.title}</h3>
                <p className="mt-2 leading-relaxed text-muted">{s.desc}</p>
              </div>
            ))}
          </div>
        </Container>
      </section>

      {/* CTA */}
      <section className="pb-24">
        <Container>
          <div className="relative overflow-hidden rounded-[2rem] bg-primary px-8 py-16 text-center shadow-glow sm:px-16 sm:py-20">
            <div className="bg-grid pointer-events-none absolute inset-0 opacity-30" />
            <div className="relative mx-auto max-w-2xl">
              <h2 className="font-display text-3xl font-extrabold leading-tight text-primary-fg sm:text-5xl">
                Bu gün hazırlaşmağa başla
              </h2>
              <p className="mt-4 text-lg text-primary-fg/85">
                Pulsuz hesab yarat, ilk sınaq imtahanını həll et və nəticəni elə indi gör.
              </p>
              <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Button
                  to="/register"
                  size="lg"
                  variant="secondary"
                  className="border-transparent"
                >
                  Pulsuz qeydiyyat
                  <FiArrowRight className="text-[18px]" />
                </Button>
                <Button
                  to="/login"
                  size="lg"
                  variant="ghost"
                  className="text-primary-fg hover:bg-primary-fg/10"
                >
                  Daxil ol
                </Button>
              </div>
            </div>
          </div>
        </Container>
      </section>
    </>
  );
};

export default Home;
