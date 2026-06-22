import { useState } from "react";
import { toast } from "react-toastify";
import { FiMail, FiPhone, FiSend, FiInstagram } from "react-icons/fi";
import { BsWhatsapp } from "react-icons/bs";
import Button from "../components/ui/Button";
import { Field, inputClass, textareaClass } from "../components/ui/Field";
import { MathGridBackground } from "../components/blueprint/MathVisuals";

const CONTACT_EMAIL = "nuriyevaliyar@gmail.com";
const WHATSAPP = "994773999966";

// A point on a coordinate plane reaching a target — "your message gets through".
const TargetVisual = ({ className = "" }) => (
  <svg viewBox="0 0 200 160" fill="none" aria-hidden className={className}>
    <line x1="14" y1="130" x2="190" y2="130" stroke="currentColor" strokeOpacity="0.3" strokeWidth="1.5" />
    <line x1="30" y1="14" x2="30" y2="146" stroke="currentColor" strokeOpacity="0.3" strokeWidth="1.5" />
    <path d="M30 130 C 80 120, 110 70, 158 44" stroke="currentColor" strokeWidth="2.5" strokeDasharray="5 5" strokeLinecap="round" />
    <circle cx="30" cy="130" r="4" fill="currentColor" />
    <circle cx="158" cy="44" r="16" stroke="currentColor" strokeWidth="2" />
    <circle cx="158" cy="44" r="8" stroke="currentColor" strokeWidth="2" />
    <circle cx="158" cy="44" r="3" fill="currentColor" />
  </svg>
);

const Contact = () => {
  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" });
  const change = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const submit = (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim() || !form.message.trim()) {
      return toast.error("Ad, email və mesajı doldurun");
    }
    // No fake backend: compose a real email to the team.
    const subject = encodeURIComponent(form.subject.trim() || `BunkerMath — ${form.name.trim()}`);
    const body = encodeURIComponent(
      `Ad: ${form.name}\nEmail: ${form.email}\n\n${form.message}`
    );
    window.location.href = `mailto:${CONTACT_EMAIL}?subject=${subject}&body=${body}`;
    toast.success("Email tətbiqiniz açılır — mesajı göndərin");
  };

  return (
    <section className="relative overflow-hidden">
      <MathGridBackground variant="graph" fade />
      <div className="container-app relative grid items-start gap-10 py-16 lg:grid-cols-2 lg:py-24">
        {/* left — intro + contacts */}
        <div>
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/8 px-3.5 py-1.5 text-xs font-semibold text-primary">
            Əlaqə
          </span>
          <h1 className="mt-5 font-display text-4xl font-extrabold leading-[1.1] tracking-tight text-text sm:text-5xl">
            Bizimlə əlaqə saxla
          </h1>
          <p className="mt-5 max-w-lg text-lg leading-relaxed text-muted">
            BunkerMath ilə bağlı sualın, təklifin və ya texniki problemin varsa, bizə yaz —
            mümkün qədər tez cavab verəcəyik.
          </p>

          <div className="mt-8 space-y-3">
            <a href={`mailto:${CONTACT_EMAIL}`} className="flex items-center gap-3.5 rounded-2xl border border-line bg-surface p-4 transition-colors hover:border-primary/40">
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-primary/12 text-primary"><FiMail className="text-[19px]" /></span>
              <span>
                <span className="block text-xs font-semibold uppercase tracking-wide text-muted">Email</span>
                <span className="font-semibold text-text">{CONTACT_EMAIL}</span>
              </span>
            </a>
            <a href={`https://wa.me/${WHATSAPP}`} target="_blank" rel="noreferrer" className="flex items-center gap-3.5 rounded-2xl border border-line bg-surface p-4 transition-colors hover:border-success/50">
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-success/12 text-success"><BsWhatsapp className="text-[19px]" /></span>
              <span>
                <span className="block text-xs font-semibold uppercase tracking-wide text-muted">WhatsApp</span>
                <span className="font-semibold text-text">+994 77 399 99 66</span>
              </span>
            </a>
            <a href="tel:+994773999966" className="flex items-center gap-3.5 rounded-2xl border border-line bg-surface p-4 transition-colors hover:border-primary/40">
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-primary/12 text-primary"><FiPhone className="text-[19px]" /></span>
              <span>
                <span className="block text-xs font-semibold uppercase tracking-wide text-muted">Telefon</span>
                <span className="font-semibold text-text">+994 77 399 99 66</span>
              </span>
            </a>
            <a href="https://www.instagram.com/riyaziyyat.99" target="_blank" rel="noreferrer" className="flex items-center gap-3.5 rounded-2xl border border-line bg-surface p-4 transition-colors hover:border-primary/40">
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-primary/12 text-primary"><FiInstagram className="text-[19px]" /></span>
              <span>
                <span className="block text-xs font-semibold uppercase tracking-wide text-muted">Instagram</span>
                <span className="font-semibold text-text">@riyaziyyat.99</span>
              </span>
            </a>
          </div>

          <TargetVisual className="mt-10 hidden h-40 w-56 text-primary/70 lg:block" />
        </div>

        {/* right — form */}
        <form onSubmit={submit} className="rounded-3xl border border-line bg-surface p-6 shadow-lift sm:p-8">
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Ad və soyad" htmlFor="name" required>
              <input id="name" name="name" value={form.name} onChange={change} className={inputClass} placeholder="Adınız" />
            </Field>
            <Field label="Email" htmlFor="email" required>
              <input id="email" name="email" type="email" value={form.email} onChange={change} className={inputClass} placeholder="siz@email.com" />
            </Field>
          </div>
          <div className="mt-5">
            <Field label="Mövzu" htmlFor="subject">
              <input id="subject" name="subject" value={form.subject} onChange={change} className={inputClass} placeholder="Mövzu" />
            </Field>
          </div>
          <div className="mt-5">
            <Field label="Mesaj" htmlFor="message" required>
              <textarea id="message" name="message" value={form.message} onChange={change} className={textareaClass} placeholder="Mesajınızı yazın..." rows={5} />
            </Field>
          </div>
          <Button type="submit" size="lg" className="mt-6 w-full sm:w-auto">
            <FiSend /> Göndər
          </Button>
        </form>
      </div>
    </section>
  );
};

export default Contact;
