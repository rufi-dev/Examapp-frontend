import {
  FiClock,
  FiZap,
  FiCheckCircle,
  FiBarChart2,
  FiArrowRight,
  FiBookOpen,
  FiShield,
  FiGlobe,
  FiUsers,
  FiEdit3,
} from "react-icons/fi";
import Hero, { eduImg } from "../components/Hero";
import Categories from "../components/Categories";
import Container from "../components/ui/Container";
import SectionTitle from "../components/ui/SectionTitle";
import Button from "../components/ui/Button";

const IMG = {
  focus: eduImg("photo-1513258496099-48168024aec0", 900), // student w/ headphones
  students: eduImg("photo-1522202176988-66273c2fd55f", 900), // three students
  teacher: eduImg("photo-1509062522246-3755977927d7", 900), // teacher + class
};

const bandStats = [
  { icon: FiBookOpen, value: "10 000+", label: "Sual bazası" },
  { icon: FiGlobe, value: "İstənilən cihaz", label: "Telefon · planşet · PC" },
  { icon: FiShield, value: "Anti-cheat", label: "Ədalətli imtahan" },
  { icon: FiZap, value: "Anlıq", label: "Nəticə və təhlil" },
];

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

const highlightPoints = [
  "Geri sayım taymeri ilə real imtahan şəraiti",
  "Anti-cheat: ekran nəzarəti ilə ədalətli nəticə",
  "İmtahan bitən kimi bal və düzgün cavablar",
  "Hər sualın izahı və zəif mövzuların təhlili",
];

const steps = [
  { n: "01", title: "Qeydiyyatdan keç", desc: "Pulsuz hesab yarat və ya Google ilə dərhal daxil ol." },
  { n: "02", title: "İmtahanı seç və həll et", desc: "Kateqoriyalardan sınaqı seç, taymerlə real şəraitdə həll et." },
  { n: "03", title: "Nəticəni təhlil et", desc: "Balını gör, səhvlərini öyrən və daha yaxşı nəticə üçün təkrar cəhd et." },
];

const Home = () => {
  return (
    <>
      <Hero />

      {/* Trust band */}
      <section className="border-y border-line bg-surface/60">
        <Container>
          <div className="grid grid-cols-2 gap-6 py-8 lg:grid-cols-4">
            {bandStats.map((s) => {
              const Icon = s.icon;
              return (
                <div key={s.label} className="flex items-center gap-3.5">
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary/12 text-primary">
                    <Icon className="text-[20px]" />
                  </span>
                  <div className="min-w-0">
                    <div className="font-display text-lg font-extrabold leading-tight text-text">
                      {s.value}
                    </div>
                    <div className="truncate text-xs text-muted">{s.label}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </Container>
      </section>

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

      {/* Image split: real exam experience */}
      <section className="py-12 sm:py-16">
        <Container>
          <div className="grid items-center gap-10 lg:grid-cols-2">
            <div className="relative order-2 lg:order-1">
              <div className="overflow-hidden rounded-[2rem] border border-line shadow-lift">
                <img
                  src={IMG.focus}
                  alt="Şagird onlayn imtahan həll edir"
                  loading="lazy"
                  className="aspect-[4/3] w-full object-cover"
                />
              </div>
              <div className="absolute -bottom-5 -right-4 hidden rounded-2xl border border-line bg-surface px-5 py-4 shadow-lift sm:block">
                <div className="text-xs font-semibold text-muted">Bu həftə</div>
                <div className="font-display text-xl font-extrabold text-success">+12 bal 📈</div>
              </div>
            </div>

            <div className="order-1 lg:order-2">
              <span className="text-sm font-bold uppercase tracking-wider text-primary">
                Real imtahan təcrübəsi
              </span>
              <h2 className="mt-3 font-display text-3xl font-extrabold leading-tight text-text sm:text-4xl">
                Əsl imtahan kimi. Amma daha ağıllı.
              </h2>
              <p className="mt-4 max-w-lg leading-relaxed text-muted">
                Taymer, nəzarət və anlıq nəticə — hamısı bir yerdə. Hər sınaqdan sonra harada
                səhv etdiyini dəqiq görürsən və növbəti dəfəyə daha güclü hazırlaşırsan.
              </p>
              <ul className="mt-6 space-y-3">
                {highlightPoints.map((p) => (
                  <li key={p} className="flex items-start gap-3">
                    <FiCheckCircle className="mt-0.5 shrink-0 text-[18px] text-primary" />
                    <span className="text-text">{p}</span>
                  </li>
                ))}
              </ul>
              <Button to="/tags" size="lg" className="mt-8">
                İndi sına <FiArrowRight className="text-[18px]" />
              </Button>
            </div>
          </div>
        </Container>
      </section>

      {/* Audience split: students / teachers */}
      <section className="py-16 sm:py-20">
        <Container>
          <SectionTitle
            align="center"
            eyebrow="Hamı üçün"
            title="Şagird də, müəllim də qazanır"
            subtitle="Bir platforma — iki tərəf üçün. Şagirdlər hazırlaşır, müəllimlər imtahan yaradır və idarə edir."
            className="mb-12"
          />
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Students */}
            <div className="group overflow-hidden rounded-3xl border border-line bg-surface shadow-soft transition-all duration-200 ease-out-quint hover:-translate-y-1 hover:shadow-lift">
              <div className="relative h-52 overflow-hidden">
                <img
                  src={IMG.students}
                  alt="Şagirdlər birlikdə hazırlaşır"
                  loading="lazy"
                  className="h-full w-full object-cover transition-transform duration-500 ease-out-quint group-hover:scale-105"
                />
                <span className="absolute left-4 top-4 inline-flex items-center gap-1.5 rounded-full bg-surface/90 px-3 py-1 text-xs font-bold text-primary backdrop-blur">
                  <FiUsers /> Şagirdlər üçün
                </span>
              </div>
              <div className="p-7">
                <h3 className="font-display text-xl font-bold text-text">Hazırlaş və balını qaldır</h3>
                <p className="mt-2 leading-relaxed text-muted">
                  Sınaqları həll et, anlıq nəticəni gör, zəif mövzularını tap və hər dəfə bir
                  addım irəli get.
                </p>
                <Button to="/tags" variant="soft" className="mt-5">
                  İmtahanlara bax <FiArrowRight />
                </Button>
              </div>
            </div>

            {/* Teachers */}
            <div className="group overflow-hidden rounded-3xl border border-line bg-surface shadow-soft transition-all duration-200 ease-out-quint hover:-translate-y-1 hover:shadow-lift">
              <div className="relative h-52 overflow-hidden">
                <img
                  src={IMG.teacher}
                  alt="Müəllim sinif üçün imtahan yaradır"
                  loading="lazy"
                  className="h-full w-full object-cover transition-transform duration-500 ease-out-quint group-hover:scale-105"
                />
                <span className="absolute left-4 top-4 inline-flex items-center gap-1.5 rounded-full bg-surface/90 px-3 py-1 text-xs font-bold text-accent2 backdrop-blur">
                  <FiEdit3 /> Müəllimlər üçün
                </span>
              </div>
              <div className="p-7">
                <h3 className="font-display text-xl font-bold text-text">Öz imtahanını yarat</h3>
                <p className="mt-2 leading-relaxed text-muted">
                  PDF yüklə və ya süni intellektlə sualları çıxar, sinif aç, kodu paylaş və
                  nəticələri bir yerdən izlə.
                </p>
                <Button to="/register" variant="soft" className="mt-5">
                  Müəllim kimi başla <FiArrowRight />
                </Button>
              </div>
            </div>
          </div>
        </Container>
      </section>

      {/* Categories */}
      <section className="py-16 sm:py-20">
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
              <div
                key={s.n}
                className="rounded-3xl border border-line bg-surface p-7 shadow-soft transition-all duration-200 ease-out-quint hover:-translate-y-1 hover:shadow-lift"
              >
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
                <Button to="/register" size="lg" variant="secondary" className="border-transparent">
                  Pulsuz qeydiyyat
                  <FiArrowRight className="text-[18px]" />
                </Button>
                <Button to="/login" size="lg" variant="ghost" className="text-primary-fg hover:bg-primary-fg/10">
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
