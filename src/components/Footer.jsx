import { Link } from "react-router-dom";
import { BsFacebook, BsInstagram } from "react-icons/bs";
import { FiPhone, FiMail } from "react-icons/fi";

const columns = [
  {
    title: "Platforma",
    items: ["İmtahan sistemi", "Sual bazası", "Bloq", "Xəbərlər"],
  },
  {
    title: "Faydalı linklər",
    items: ["Haqqımızda", "Uğurlarımız", "Əlaqə"],
  },
  {
    title: "Dəstək",
    items: [
      "İstifadəçi razılaşması",
      "Məxfilik siyasəti",
      "Ödəniş şərtləri",
      "Partnyorluq",
    ],
  },
];

const Footer = () => {
  const year = new Date().getFullYear();

  return (
    <footer id="contact" className="mt-24 border-t border-line bg-surface2/60">
      <div className="container-app py-16">
        <div className="grid gap-12 lg:grid-cols-[1.6fr_1fr_1fr_1fr]">
          <div className="max-w-sm">
            <Link to="/" className="flex items-center gap-2.5">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary font-display text-lg font-extrabold text-primary-fg">
                İ
              </span>
              <span className="font-display text-xl font-bold text-text">İmtahan</span>
            </Link>
            <p className="mt-4 text-sm leading-relaxed text-muted">
              Onlayn sınaq imtahanları, yarışlar və geniş test bazası ilə hər kəs üçün
              bərabər təhsil. Abituriyent, məktəbli, müəllim və xaricdə təhsil almaq
              istəyənlər üçün hazırlanıb.
            </p>
            <div className="mt-6 flex gap-3">
              <a
                href="https://www.instagram.com/riyaziyyat.99"
                target="_blank"
                rel="noreferrer"
                aria-label="Instagram"
                className="grid h-10 w-10 place-items-center rounded-full border border-line bg-surface text-text transition-colors hover:bg-primary hover:text-primary-fg"
              >
                <BsInstagram />
              </a>
              <a
                href="https://www.facebook.com/nuriyev.eliyar"
                target="_blank"
                rel="noreferrer"
                aria-label="Facebook"
                className="grid h-10 w-10 place-items-center rounded-full border border-line bg-surface text-text transition-colors hover:bg-primary hover:text-primary-fg"
              >
                <BsFacebook />
              </a>
            </div>
          </div>

          {columns.map((col) => (
            <div key={col.title}>
              <h3 className="font-display text-sm font-bold uppercase tracking-wider text-text">
                {col.title}
              </h3>
              <ul className="mt-4 flex flex-col gap-2.5">
                {col.items.map((item) => (
                  <li key={item}>
                    <span className="cursor-pointer text-sm text-muted transition-colors hover:text-primary">
                      {item}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 grid gap-4 rounded-2xl border border-line bg-surface p-6 sm:grid-cols-2">
          <a
            href="tel:+994773999966"
            className="flex items-center gap-3.5 transition-colors hover:text-primary"
          >
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-primary/12 text-primary">
              <FiPhone className="text-[19px]" />
            </span>
            <span>
              <span className="block text-xs font-semibold uppercase tracking-wide text-muted">
                Əlaqə nömrəsi
              </span>
              <span className="font-semibold text-text">+994 77 399 99 66</span>
            </span>
          </a>
          <a
            href="mailto:rufi.aliyev.tech@gmail.com"
            className="flex items-center gap-3.5 transition-colors hover:text-primary"
          >
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-primary/12 text-primary">
              <FiMail className="text-[19px]" />
            </span>
            <span>
              <span className="block text-xs font-semibold uppercase tracking-wide text-muted">
                Elektron ünvan
              </span>
              <span className="font-semibold text-text">rufi.aliyev.tech@gmail.com</span>
            </span>
          </a>
        </div>

        <div className="mt-10 flex flex-col items-center justify-between gap-3 border-t border-line pt-6 text-sm text-muted sm:flex-row">
          <p>
            <span className="font-display font-bold text-text">İmtahan</span> © {year} Bütün
            hüquqlar qorunur
          </p>
          <p>Azərbaycanda sevgi ilə hazırlanıb</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
