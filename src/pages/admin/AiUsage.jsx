import { useEffect, useState } from "react";
import axios from "axios";
import { useSelector } from "react-redux";
import { FiDollarSign, FiCpu, FiFileText, FiZap, FiRefreshCw } from "react-icons/fi";
import AccountLayout from "../../components/AccountLayout";
import InfoBox from "../../components/InfoBox";
import CenterLoader from "../../components/ui/CenterLoader";
import Badge from "../../components/ui/Badge";
import useRedirectLoggedOutUser from "../../customHook/useRedirectLoggedOutUser";
import { selectUser } from "../../../redux/features/auth/authSlice";

const roleLabels = { admin: "Admin", teacher: "Müəllim" };
const roleTone = (r) => (r === "admin" ? "primary" : "accent");

const fmtUsd = (n) => `$${(Number(n) || 0).toFixed(4)}`;
const fmtUsd2 = (n) => `$${(Number(n) || 0).toFixed(2)}`;
const fmtTokens = (n) => {
  const v = Number(n) || 0;
  if (v >= 1e6) return `${(v / 1e6).toFixed(2)}M`;
  if (v >= 1e3) return `${(v / 1e3).toFixed(1)}K`;
  return String(v);
};
const fmtDate = (d) => {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleString();
  } catch {
    return "—";
  }
};

const AiUsage = () => {
  useRedirectLoggedOutUser("/login");
  const user = useSelector(selectUser);
  const isAdmin = user?.role === "admin";

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/api/quiz/aiUsage`);
      setData(res.data);
    } catch (err) {
      setError(err?.response?.data?.message || "Məlumat yüklənmədi");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) load();
    else setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin]);

  if (!isAdmin) {
    return (
      <AccountLayout title="AI istifadəsi" subtitle="Yalnız adminlər üçün.">
        <div className="rounded-3xl border border-dashed border-line bg-surface p-16 text-center text-muted">
          Bu səhifəyə yalnız adminlərin girişi var.
        </div>
      </AccountLayout>
    );
  }

  const rows = data?.rows || [];
  const totals = data?.totals || { usd: 0, tokens: 0, extractions: 0, questions: 0 };
  const recent = data?.recent || [];

  return (
    <AccountLayout
      title="AI istifadəsi və xərclər"
      subtitle="PDF-dən sual çıxarışının müəllim/admin üzrə xərci və token sərfi."
    >
      <div className="mb-6 flex items-center justify-end">
        <button
          type="button"
          onClick={load}
          disabled={loading}
          className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-surface px-3 py-2 text-sm font-semibold text-text transition-colors hover:border-primary hover:text-primary disabled:opacity-60"
        >
          <FiRefreshCw className={loading ? "animate-spin" : ""} /> Yenilə
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <InfoBox icon={<FiDollarSign />} title="Ümumi xərc" count={fmtUsd2(totals.usd)} tone="primary" />
        <InfoBox icon={<FiFileText />} title="Çıxarış sayı" count={totals.extractions} tone="success" />
        <InfoBox icon={<FiCpu />} title="Ümumi token" count={fmtTokens(totals.tokens)} tone="warning" />
        <InfoBox icon={<FiZap />} title="Çıxarılan sual" count={totals.questions} tone="muted" />
      </div>

      {error && (
        <div className="mt-6 rounded-2xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm font-medium text-danger">
          {error}
        </div>
      )}

      {loading ? (
        <CenterLoader className="mt-8" />
      ) : (
        <>
          {/* Per-user spend */}
          <h3 className="mb-3 mt-8 font-display text-base font-bold text-text">
            İstifadəçi üzrə
          </h3>
          <div className="overflow-x-auto rounded-2xl border border-line bg-surface shadow-soft scrollbar-thin">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
                  <th className="px-4 py-3.5 font-semibold">Ad</th>
                  <th className="px-4 py-3.5 font-semibold">Email</th>
                  <th className="px-4 py-3.5 font-semibold">Rol</th>
                  <th className="px-4 py-3.5 text-right font-semibold">Çıxarış</th>
                  <th className="px-4 py-3.5 text-right font-semibold">Sual</th>
                  <th className="px-4 py-3.5 text-right font-semibold">Token</th>
                  <th className="px-4 py-3.5 text-right font-semibold">Xərc</th>
                  <th className="px-4 py-3.5 text-right font-semibold">Son istifadə</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-10 text-center text-muted">
                      Hələ AI istifadəsi yoxdur.
                    </td>
                  </tr>
                ) : (
                  rows.map((u) => (
                    <tr
                      key={u._id}
                      className={`border-b border-line/60 transition-colors last:border-0 hover:bg-surface2/50 ${
                        u.extractions === 0 ? "opacity-60" : ""
                      }`}
                    >
                      <td className="whitespace-nowrap px-4 py-3.5 font-medium text-text">{u.name}</td>
                      <td className="whitespace-nowrap px-4 py-3.5 text-muted">{u.email}</td>
                      <td className="px-4 py-3.5">
                        <Badge tone={roleTone(u.role)}>{roleLabels[u.role] || u.role}</Badge>
                      </td>
                      <td className="px-4 py-3.5 text-right tabular-nums text-text">{u.extractions}</td>
                      <td className="px-4 py-3.5 text-right tabular-nums text-muted">{u.questions}</td>
                      <td className="px-4 py-3.5 text-right tabular-nums text-muted" title={`${u.totalTokens} token`}>
                        {fmtTokens(u.totalTokens)}
                      </td>
                      <td className="px-4 py-3.5 text-right font-bold tabular-nums text-text">
                        {fmtUsd(u.totalUsd)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3.5 text-right text-xs text-muted">
                        {fmtDate(u.lastUsedAt)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Recent activity */}
          {recent.length > 0 && (
            <>
              <h3 className="mb-3 mt-8 font-display text-base font-bold text-text">Son əməliyyatlar</h3>
              <div className="overflow-x-auto rounded-2xl border border-line bg-surface shadow-soft scrollbar-thin">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
                      <th className="px-4 py-3.5 font-semibold">Tarix</th>
                      <th className="px-4 py-3.5 font-semibold">İstifadəçi</th>
                      <th className="px-4 py-3.5 font-semibold">İmtahan</th>
                      <th className="px-4 py-3.5 text-right font-semibold">Sual</th>
                      <th className="px-4 py-3.5 text-right font-semibold">Token</th>
                      <th className="px-4 py-3.5 text-right font-semibold">Xərc</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recent.map((r) => (
                      <tr key={r._id} className="border-b border-line/60 last:border-0 hover:bg-surface2/50">
                        <td className="whitespace-nowrap px-4 py-3 text-xs text-muted">{fmtDate(r.createdAt)}</td>
                        <td className="whitespace-nowrap px-4 py-3 text-text">
                          {r.user?.name || "—"}
                        </td>
                        <td className="px-4 py-3 text-muted">{r.exam?.name || "—"}</td>
                        <td className="px-4 py-3 text-right tabular-nums text-muted">{r.questions}</td>
                        <td className="px-4 py-3 text-right tabular-nums text-muted">{fmtTokens(r.totalTokens)}</td>
                        <td className="px-4 py-3 text-right font-semibold tabular-nums text-text">{fmtUsd(r.usd)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          <p className="mt-4 text-xs text-muted">
            Qiymətlər Claude Opus 4.8 tariflərinə əsasən hesablanır (təxmini). Dəqiq məbləğ
            console.anthropic.com hesabınızda görünür.
          </p>
        </>
      )}
    </AccountLayout>
  );
};

export default AiUsage;
