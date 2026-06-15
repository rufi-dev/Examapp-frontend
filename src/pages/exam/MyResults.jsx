import { useEffect } from "react";
import useRedirectLoggedOutUser from "../../customHook/useRedirectLoggedOutUser";
import { useDispatch, useSelector } from "react-redux";
import { getResultsByUser } from "../../../redux/features/quiz/resultSlice";
import Loader from "../../components/Loader";
import AccountLayout from "../../components/AccountLayout";
import { FiEye } from "react-icons/fi";
import { Link } from "react-router-dom";
import Button from "../../components/ui/Button";

const MyResults = () => {
  useRedirectLoggedOutUser("/login");
  const dispatch = useDispatch();

  const { user } = useSelector((state) => state.auth);
  const { result, isLoading } = useSelector((state) => state.result);

  useEffect(() => {
    dispatch(getResultsByUser());
  }, [dispatch]);

  if (isLoading) return <Loader />;

  return (
    <AccountLayout title="Nəticələrim" subtitle="Həll etdiyin bütün sınaqların nəticələri.">
      {user && result && result.length > 0 ? (
          <div className="overflow-x-auto rounded-2xl border border-line bg-surface shadow-soft scrollbar-thin">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
                  <th className="px-6 py-4 font-semibold">Ad</th>
                  <th className="px-6 py-4 font-semibold">Cəhd</th>
                  <th className="px-6 py-4 font-semibold">İmtahan</th>
                  <th className="px-6 py-4 font-semibold">Bal</th>
                  <th className="px-6 py-4 text-right font-semibold">Təhlil</th>
                </tr>
              </thead>
              <tbody>
                {result.map((res) => (
                  <tr
                    key={res?._id}
                    className="border-b border-line/60 transition-colors last:border-0 hover:bg-surface2/50"
                  >
                    <td className="whitespace-nowrap px-6 py-4 font-medium text-text">{user?.name}</td>
                    <td className="whitespace-nowrap px-6 py-4 text-muted">{res?.attempts}</td>
                    <td className="whitespace-nowrap px-6 py-4 text-text">{res?.examId?.name}</td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <span className="inline-flex items-center rounded-full bg-primary/12 px-2.5 py-1 text-xs font-semibold text-primary">
                        {res?.earnPoints} bal
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-right">
                      <Link
                        to={`/result/${res._id}/review`}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-line text-muted transition-colors hover:border-primary/40 hover:text-primary"
                        aria-label="Təhlilə bax"
                      >
                        <FiEye />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="rounded-3xl border border-dashed border-line bg-surface p-16 text-center">
            <p className="font-display text-xl font-bold text-text">Hələ nəticə yoxdur</p>
            <p className="mx-auto mt-2 max-w-sm text-muted">
              İlk sınaq imtahanını həll et və nəticən burada görünsün.
            </p>
            <Button to="/tags" className="mt-6">
              İmtahanlara bax
            </Button>
          </div>
      )}
    </AccountLayout>
  );
};

export default MyResults;
