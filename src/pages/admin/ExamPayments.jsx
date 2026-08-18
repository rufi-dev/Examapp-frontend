import { useCallback, useEffect, useState } from "react";
import { toast } from "react-toastify";
import { FiCheck, FiX, FiRefreshCw, FiDollarSign, FiClock } from "react-icons/fi";
import { FaWhatsapp } from "react-icons/fa";
import AccountLayout from "../../components/AccountLayout";
import Button from "../../components/ui/Button";
import { fetchPaymentRequests, decidePaymentRequest } from "../../helper/examPaymentApi";

const digits = (s) => String(s || "").replace(/\D/g, "");
const fmtDate = (d) => (d ? new Date(d).toLocaleString("az-Latn-AZ") : "");

const ExamPayments = () => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");

  const load = useCallback(async () => {
    try {
      const data = await fetchPaymentRequests();
      setRows(data);
    } catch (e) {
      toast.error(e?.response?.data?.message || "Yüklənmədi");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const decide = async (r, status) => {
    setBusy(r._id);
    try {
      await decidePaymentRequest(r._id, status);
      toast.success(status === "done" ? "Təsdiqləndi — imtahan verildi" : "Rədd edildi");
      await load();
    } catch (e) {
      toast.error(e?.response?.data?.message || "Əməliyyat alınmadı");
    } finally {
      setBusy("");
    }
  };

  const open = rows.filter((r) => r.status === "open");
  const decided = rows.filter((r) => r.status !== "open");

  const Card = ({ r, history }) => (
    <div
      className={`flex flex-col gap-3 rounded-2xl border border-line bg-surface p-4 shadow-soft sm:flex-row sm:items-center sm:justify-between ${
        history ? "opacity-75" : ""
      }`}
    >
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-display text-base font-bold text-text">
            {r.student?.name || "Şagird"}
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-primary/12 px-2.5 py-0.5 text-xs font-semibold text-primary">
            {r.exam?.name || "İmtahan"}
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-surface2 px-2.5 py-0.5 text-xs font-bold text-text">
            {r.amount} ₼
          </span>
          {r.paidClaimed && (
            <span className="inline-flex items-center gap-1 rounded-full bg-success/12 px-2.5 py-0.5 text-xs font-semibold text-success">
              <FiCheck className="text-[12px]" /> Ödədim
            </span>
          )}
          {history && (
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                r.status === "done" ? "bg-success/12 text-success" : "bg-danger/12 text-danger"
              }`}
            >
              {r.status === "done" ? "Təsdiqləndi" : "Rədd edildi"}
            </span>
          )}
        </div>
        <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
          {r.student?.email && <span>{r.student.email}</span>}
          {r.student?.phone && <span>{r.student.phone}</span>}
          <span className="inline-flex items-center gap-1">
            <FiClock className="text-[12px]" /> {fmtDate(r.paidClaimedAt || r.createdAt)}
          </span>
        </p>
      </div>

      {!history && (
        <div className="flex shrink-0 items-center gap-2">
          {r.student?.phone && (
            <a
              href={`https://wa.me/${digits(r.student.phone)}`}
              target="_blank"
              rel="noreferrer"
              title="WhatsApp"
              className="grid h-10 w-10 place-items-center rounded-xl border border-line text-[#25D366] transition-colors hover:bg-surface2"
            >
              <FaWhatsapp />
            </a>
          )}
          <Button
            type="button"
            size="sm"
            onClick={() => decide(r, "done")}
            disabled={busy === r._id}
          >
            <FiCheck /> Təsdiqlə
          </Button>
          <button
            type="button"
            onClick={() => decide(r, "rejected")}
            disabled={busy === r._id}
            title="Rədd et"
            aria-label="Rədd et"
            className="grid h-10 w-10 place-items-center rounded-xl border border-line text-muted transition-colors hover:border-danger/40 hover:text-danger disabled:opacity-50"
          >
            <FiX />
          </button>
        </div>
      )}
    </div>
  );

  return (
    <AccountLayout
      title="Ödənişlər"
      subtitle="İmtahan ödəniş sorğularını təsdiqlə — şagird dərhal imtahana giriş alır."
      actions={
        <Button variant="secondary" size="sm" onClick={load}>
          <FiRefreshCw /> Yenilə
        </Button>
      }
    >
      {loading ? (
        <div className="flex justify-center py-20">
          <span className="h-8 w-8 animate-spin rounded-full border-2 border-line border-t-primary" />
        </div>
      ) : (
        <>
          <div className="mb-3 flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary/12 text-primary">
              <FiDollarSign />
            </span>
            <h2 className="font-display text-lg font-bold text-text">
              Gözləyən sorğular {open.length > 0 && <span className="text-primary">({open.length})</span>}
            </h2>
          </div>

          {open.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-line bg-surface p-12 text-center text-muted">
              Gözləyən ödəniş sorğusu yoxdur.
            </div>
          ) : (
            <div className="space-y-3">
              {open.map((r) => (
                <Card key={r._id} r={r} />
              ))}
            </div>
          )}

          {decided.length > 0 && (
            <>
              <h3 className="mb-3 mt-10 font-display text-sm font-bold uppercase tracking-wide text-muted">
                Tarixçə
              </h3>
              <div className="space-y-3">
                {decided.map((r) => (
                  <Card key={r._id} r={r} history />
                ))}
              </div>
            </>
          )}
        </>
      )}
    </AccountLayout>
  );
};

export default ExamPayments;
