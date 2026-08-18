import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import { toast } from "react-toastify";
import { FiCopy, FiCheck, FiArrowLeft, FiShield, FiCreditCard } from "react-icons/fi";
import { FaWhatsapp } from "react-icons/fa";
import AccountLayout from "../../components/AccountLayout";
import Loader from "../../components/Loader";
import { fetchPaymentInfo, requestExamPayment } from "../../helper/examPaymentApi";

const WHATSAPP = "994773999966";

// "4127209300766125" → "4127 2093 0076 6125"; empty → bullet placeholder.
const groupCard = (raw) => {
  const digits = String(raw || "").replace(/\D/g, "");
  if (!digits) return "•••• •••• •••• ••••";
  return digits.replace(/(.{4})/g, "$1 ").trim();
};

const ExamPayment = () => {
  const { examId } = useParams();
  const navigate = useNavigate();
  const [exam, setExam] = useState(null);
  const [pay, setPay] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    let on = true;
    Promise.allSettled([
      axios.get(`${import.meta.env.VITE_BACKEND_URL}/api/quiz/getExam/${examId}`),
      fetchPaymentInfo(),
    ]).then(([e, p]) => {
      if (!on) return;
      if (e.status === "fulfilled") setExam(e.value.data);
      if (p.status === "fulfilled") setPay(p.value);
      setLoading(false);
    });
    return () => {
      on = false;
    };
  }, [examId]);

  const price = Number(exam?.price) || 0;
  const hasCard = !!pay?.cardNumber;

  const copyCard = async () => {
    try {
      await navigator.clipboard.writeText(String(pay.cardNumber).replace(/\s/g, ""));
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      toast.info("Kart nömrəsini əl ilə köçürün");
    }
  };

  const markPaid = async () => {
    setBusy(true);
    try {
      await requestExamPayment(examId, { paid: true });
      setDone(true);
    } catch (e) {
      toast.error(e?.response?.data?.message || "Göndərilmədi, yenidən cəhd edin");
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <Loader />;

  return (
    <AccountLayout
      title="Ödəniş"
      subtitle={exam ? `${exam.name} — ${price} ₼` : "İmtahan ödənişi"}
    >
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="mb-5 inline-flex items-center gap-1.5 text-sm font-medium text-muted transition-colors hover:text-text"
      >
        <FiArrowLeft /> Geri
      </button>

      {done ? (
        <div className="mx-auto max-w-md rounded-3xl border border-success/30 bg-success/5 p-8 text-center">
          <span className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-success text-3xl text-white shadow-glow">
            <FiCheck />
          </span>
          <h2 className="mt-4 font-display text-xl font-extrabold text-text">Təşəkkürlər! 🎉</h2>
          <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-muted">
            Ödənişini yoxlayıb təsdiqlədikdən sonra <b>{exam?.name}</b> imtahanı hesabına əlavə
            olunacaq. Daha tez təsdiq üçün <b>ödəniş qəbzini (çeki)</b> WhatsApp ilə bizə göndər 👇
          </p>
          <a
            href={`https://wa.me/${WHATSAPP}?text=${encodeURIComponent(
              `Salam! "${exam?.name}" imtahanı üçün ${price} ₼ ödəniş etdim. Qəbzi (çeki) əlavə edirəm 🧾`
            )}`}
            target="_blank"
            rel="noreferrer"
            className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#25D366] px-6 py-3.5 text-sm font-bold text-white shadow-soft transition-all duration-200 ease-out-quint hover:-translate-y-0.5 hover:brightness-105"
          >
            <FaWhatsapp className="text-lg" /> Qəbzi WhatsApp ilə göndər
          </a>
          <Link
            to="/myExams"
            className="mt-2 inline-flex items-center justify-center gap-2 rounded-xl px-6 py-2.5 text-sm font-semibold text-muted transition-colors hover:text-text"
          >
            İmtahanlarıma qayıt
          </Link>
        </div>
      ) : (
        <div className="mx-auto grid max-w-4xl gap-8 lg:grid-cols-[1.1fr_1fr]">
          {/* The card */}
          <div>
            <div className="relative aspect-[1.586/1] w-full overflow-hidden rounded-3xl bg-gradient-to-br from-primary via-primary-hover to-navy p-6 text-white shadow-lift">
              <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/15 blur-2xl" />
              <div className="pointer-events-none absolute -bottom-12 -left-8 h-40 w-40 rounded-full bg-black/15 blur-2xl" />
              <div className="relative flex h-full flex-col justify-between">
                <div className="flex items-start justify-between">
                  <span className="font-display text-lg font-extrabold tracking-tight">BunkerMath</span>
                  <FiCreditCard className="text-xl opacity-80" />
                </div>
                <div className="mt-1 h-9 w-12 rounded-md bg-gradient-to-br from-yellow-200 to-yellow-400 shadow-inner" />
                <div>
                  <p className="font-mono text-xl font-semibold tracking-[0.18em] sm:text-2xl">
                    {groupCard(pay?.cardNumber)}
                  </p>
                  <div className="mt-3 flex items-end justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[10px] uppercase tracking-widest text-white/60">Kart sahibi</p>
                      <p className="truncate text-sm font-semibold">{pay?.cardHolder || "—"}</p>
                    </div>
                    {pay?.bank && <p className="shrink-0 text-xs font-medium text-white/80">{pay.bank}</p>}
                  </div>
                </div>
              </div>
            </div>

            {hasCard && (
              <button
                type="button"
                onClick={copyCard}
                className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-line bg-surface px-4 py-3 text-sm font-semibold text-text transition-colors hover:bg-surface2"
              >
                {copied ? <FiCheck className="text-success" /> : <FiCopy />}
                {copied ? "Kopyalandı" : "Kart nömrəsini kopyala"}
              </button>
            )}
          </div>

          {/* Instructions + action */}
          <div className="flex flex-col">
            <div className="rounded-2xl border border-line bg-surface p-5">
              <h3 className="font-display text-base font-bold text-text">Necə ödəniş edim?</h3>
              <ol className="mt-3 space-y-3 text-sm text-muted">
                <li className="flex gap-3">
                  <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-primary/12 text-xs font-bold text-primary">1</span>
                  <span>Yuxarıdakı karta <b className="text-text">{price} ₼</b> köçür (m10, bank tətbiqi və ya kartdan-karta).</span>
                </li>
                <li className="flex gap-3">
                  <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-primary/12 text-xs font-bold text-primary">2</span>
                  <span>Köçürməni tamamladıqdan sonra aşağıdakı <b className="text-text">«Ödədim»</b> düyməsini bas.</span>
                </li>
                <li className="flex gap-3">
                  <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-primary/12 text-xs font-bold text-primary">3</span>
                  <span>Qəbzi WhatsApp ilə göndər — ödənişini yoxlayıb imtahanı hesabına əlavə edirik.</span>
                </li>
              </ol>
              {pay?.note && <p className="mt-4 rounded-lg bg-surface2 p-3 text-xs text-muted">{pay.note}</p>}
            </div>

            {!hasCard && (
              <p className="mt-4 rounded-xl border border-warning/30 bg-warning/5 p-3 text-sm text-muted">
                Kart məlumatı hələ əlavə olunmayıb. Zəhmət olmasa bir az sonra yenidən cəhd edin.
              </p>
            )}

            <button
              type="button"
              onClick={markPaid}
              disabled={busy || !hasCard}
              className="mt-4 inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3.5 text-sm font-bold text-primary-fg shadow-soft transition-all duration-200 ease-out-quint hover:-translate-y-0.5 hover:bg-primary-hover hover:shadow-glow disabled:translate-y-0 disabled:opacity-60"
            >
              <FiCheck /> {busy ? "Göndərilir…" : "Ödədim"}
            </button>
            <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-muted">
              <FiShield /> Kart məlumatlarını biz saxlamırıq — köçürmə birbaşa banka gedir.
            </p>
          </div>
        </div>
      )}
    </AccountLayout>
  );
};

export default ExamPayment;
