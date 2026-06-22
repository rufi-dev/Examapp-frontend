import { Link } from "react-router-dom";
import { BsFacebook, BsInstagram, BsWhatsapp } from "react-icons/bs";
import { FiPhone, FiMail } from "react-icons/fi";
import BunkerMathLogo from "./blueprint/BunkerMathLogo";

const CONTACT_EMAIL = "nuriyevaliyar@gmail.com";
const WHATSAPP = "994773999966";

const navCol = [
  { label: "Ana səhifə", to: "/" },
  { label: "Mövzular", href: "#topics" },
  { label: "Sınaqlar", href: "#exam-preview" },
  { label: "Haqqımızda", to: "/about" },
  { label: "Əlaqə", to: "/contact" },
];

const legalCol = ["Məxfilik siyasəti", "İstifadə şərtləri"];

const Footer = () => {
  const year = new Date().getFullYear();

  return (
    <footer className="section-navy relative overflow-hidden">
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-graph-on-dark [mask-image:linear-gradient(to_bottom,transparent,black_55%)]" />
      <div className="container-app relative pb-14 pt-8">
        <div className="grid gap-12 lg:grid-cols-[1.7fr_1fr_1fr]">
          {/* brand */}
          <div className="max-w-sm">
            <BunkerMathLogo size={40} textClassName="text-white" />
            <p className="mt-4 text-sm leading-relaxed text-white/70">
              Riyaziyyat imtahanına daha ağıllı və planlı hazırlaş. Real imtahan formatında
              sınaqlar, mərhələli həllər və nəticələrinə uyğun şəxsi məşq planı.
            </p>
            <div className="mt-6 flex gap-3">
              <a
                href="https://www.instagram.com/riyaziyyat.99"
                target="_blank"
                rel="noreferrer"
                aria-label="Instagram"
                className="grid h-10 w-10 place-items-center rounded-full border border-white/15 bg-white/5 text-white transition-colors hover:bg-primary"
              >
                <BsInstagram />
              </a>
              <a
                href={`https://wa.me/${WHATSAPP}`}
                target="_blank"
                rel="noreferrer"
                aria-label="WhatsApp"
                className="grid h-10 w-10 place-items-center rounded-full border border-white/15 bg-white/5 text-white transition-colors hover:bg-success"
              >
                <BsWhatsapp />
              </a>
              <a
                href="https://www.facebook.com/nuriyev.eliyar"
                target="_blank"
                rel="noreferrer"
                aria-label="Facebook"
                className="grid h-10 w-10 place-items-center rounded-full border border-white/15 bg-white/5 text-white transition-colors hover:bg-primary"
              >
                <BsFacebook />
              </a>
            </div>
          </div>

          {/* navigation */}
          <div>
            <h3 className="font-display text-sm font-bold uppercase tracking-wider text-white">
              Naviqasiya
            </h3>
            <ul className="mt-4 flex flex-col gap-2.5">
              {navCol.map((item) => (
                <li key={item.label}>
                  {item.to ? (
                    <Link to={item.to} className="text-sm text-white/70 transition-colors hover:text-white">
                      {item.label}
                    </Link>
                  ) : (
                    <a href={item.href} className="text-sm text-white/70 transition-colors hover:text-white">
                      {item.label}
                    </a>
                  )}
                </li>
              ))}
            </ul>
          </div>

          {/* legal */}
          <div>
            <h3 className="font-display text-sm font-bold uppercase tracking-wider text-white">
              Hüquqi
            </h3>
            <ul className="mt-4 flex flex-col gap-2.5">
              {legalCol.map((item) => (
                <li key={item}>
                  <span className="text-sm text-white/70">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* contact card */}
        <div className="mt-12 grid gap-4 rounded-2xl border border-white/10 bg-white/5 p-6 sm:grid-cols-3">
          <a href={`https://wa.me/${WHATSAPP}`} target="_blank" rel="noreferrer" className="flex items-center gap-3.5 transition-opacity hover:opacity-80">
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-success/20 text-success">
              <BsWhatsapp className="text-[19px]" />
            </span>
            <span>
              <span className="block text-xs font-semibold uppercase tracking-wide text-white/50">WhatsApp</span>
              <span className="font-semibold text-white">+994 77 399 99 66</span>
            </span>
          </a>
          <a href="tel:+994773999966" className="flex items-center gap-3.5 transition-opacity hover:opacity-80">
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-white/10 text-cyan">
              <FiPhone className="text-[19px]" />
            </span>
            <span>
              <span className="block text-xs font-semibold uppercase tracking-wide text-white/50">Telefon</span>
              <span className="font-semibold text-white">+994 77 399 99 66</span>
            </span>
          </a>
          <a href={`mailto:${CONTACT_EMAIL}`} className="flex items-center gap-3.5 transition-opacity hover:opacity-80">
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-white/10 text-cyan">
              <FiMail className="text-[19px]" />
            </span>
            <span>
              <span className="block text-xs font-semibold uppercase tracking-wide text-white/50">Email</span>
              <span className="font-semibold text-white">{CONTACT_EMAIL}</span>
            </span>
          </a>
        </div>

        <div className="mt-10 flex flex-col items-center justify-between gap-3 border-t border-white/10 pt-6 text-sm text-white/60 sm:flex-row">
          <p>
            <span className="font-display font-bold text-white">BunkerMath</span> © {year} Bütün
            hüquqlar qorunur
          </p>
          <p>Azərbaycanda riyaziyyat üçün hazırlanıb</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
