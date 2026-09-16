import { useEffect, useState } from "react";
import { HiUsers } from "react-icons/hi";
import { BiSolidUserCheck, BiUserMinus, BiUserX } from "react-icons/bi";
import { AiFillDelete } from "react-icons/ai";
import AccountLayout from "../../components/AccountLayout";
import InfoBox from "../../components/InfoBox";
import SearchUser from "../../components/SearchUser";
import ChangeRole from "../../components/ChangeRole";
import CenterLoader from "../../components/ui/CenterLoader";
import useRedirectLoggedOutUser from "../../customHook/useRedirectLoggedOutUser";
import { useDispatch, useSelector } from "react-redux";
import {
  CALC_SUSPENDED_USER,
  CALC_VERIFIED_USER,
  deleteUser,
  getUsers,
  selectUser,
} from "../../../redux/features/auth/authSlice";
import { shortenText } from "./Profile";
import { FILTER_USERS, selectUsers } from "../../../redux/features/auth/filterSlice";
import ReactPaginate from "react-paginate";
import { Link } from "react-router-dom";
import Badge from "../../components/ui/Badge";
import ConfirmDialog from "../../components/ui/ConfirmDialog";
import { gradeLabel } from "../../helper/grades";

const roleLabels = {
  admin: "Admin",
  teacher: "Müəllim",
  student: "Tələbə",
  suspended: "Bloklanıb",
};

const roleTone = (role) =>
  role === "admin"
    ? "primary"
    : role === "teacher"
    ? "accent"
    : role === "suspended"
    ? "danger"
    : "neutral";

const UserList = () => {
  useRedirectLoggedOutUser("/login");
  const dispatch = useDispatch();
  const [search, setSearch] = useState("");
  const { isLoading, users, suspendedUsers, verifiedUsers } = useSelector(
    (state) => state.auth
  );
  const me = useSelector(selectUser);
  const isAdmin = me?.role === "admin";
  const unVerifiedUser = users.length - verifiedUsers;

  useEffect(() => {
    dispatch(getUsers());
  }, [dispatch]);

  useEffect(() => {
    dispatch(CALC_VERIFIED_USER());
    dispatch(CALC_SUSPENDED_USER());
  }, [dispatch, users]);

  const filteredUsers = useSelector(selectUsers);

  const [confirmUser, setConfirmUser] = useState(null);
  const [deletingUser, setDeletingUser] = useState(false);

  const handleDeleteUser = async () => {
    if (!confirmUser) return;
    setDeletingUser(true);
    try {
      await dispatch(deleteUser(confirmUser._id));
      setConfirmUser(null);
      dispatch(getUsers());
    } finally {
      setDeletingUser(false);
    }
  };

  useEffect(() => {
    dispatch(FILTER_USERS({ users, search }));
  }, [dispatch, users, search]);

  const itemsPerPage = 10;
  const [itemOffset, setItemOffset] = useState(0);
  const endOffset = itemOffset + itemsPerPage;
  const currentItems = filteredUsers.slice(itemOffset, endOffset);
  const pageCount = Math.ceil(filteredUsers.length / itemsPerPage);

  const handlePageClick = (event) => {
    const newOffset = (event.selected * itemsPerPage) % filteredUsers.length;
    setItemOffset(newOffset);
  };

  return (
    <AccountLayout title="Şagirdlər" subtitle="Hesabları idarə et, rolları dəyiş.">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <InfoBox icon={<HiUsers />} title="Ümumi" count={users.length} tone="primary" />
        <InfoBox
          icon={<BiSolidUserCheck />}
          title="Təsdiqlənmiş"
          count={verifiedUsers}
          tone="success"
        />
        <InfoBox
          icon={<BiUserMinus />}
          title="Təsdiqlənməmiş"
          count={unVerifiedUser}
          tone="warning"
        />
        <InfoBox
          icon={<BiUserX />}
          title="Bloklanmış"
          count={suspendedUsers}
          tone="danger"
        />
      </div>

      <div className="mt-6 flex justify-end">
        <SearchUser value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {isLoading ? (
        <CenterLoader className="mt-6" />
      ) : users.length === 0 ? (
        <div className="mt-6 rounded-3xl border border-dashed border-line bg-surface p-16 text-center text-muted">
          Şagird tapılmadı
        </div>
      ) : (
        <>
          {/*
           * One identity cell (avatar + name + e-mail) instead of three thin text
           * columns: the name is what you scan for, and the e-mail is only ever
           * read once you have found the person. The "Status" column is gone —
           * almost every row said the same thing; only an UNVERIFIED account is
           * worth a mark, so it rides next to the name, and the count stays in the
           * cards above.
           */}
          <div className="mt-6 overflow-x-auto rounded-2xl border border-line bg-surface shadow-soft scrollbar-thin">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-line bg-surface2/40 text-left text-[11px] uppercase tracking-wider text-muted">
                  <th className="w-12 py-3.5 pl-5 pr-2 font-semibold">#</th>
                  <th className="px-3 py-3.5 font-semibold">Şagird</th>
                  <th className="px-3 py-3.5 font-semibold">Telefon</th>
                  <th className="px-3 py-3.5 font-semibold">Sinif</th>
                  <th className="px-3 py-3.5 font-semibold">Rol</th>
                  {isAdmin && <th className="py-3.5 pl-3 pr-5 text-right font-semibold">İdarəetmə</th>}
                </tr>
              </thead>
              <tbody>
                {currentItems?.map((user, index) => (
                  <tr
                    key={user._id || index}
                    className="group border-b border-line/50 transition-colors last:border-0 hover:bg-surface2/40"
                  >
                    <td className="py-3 pl-5 pr-2 text-xs font-semibold tabular-nums text-muted">
                      {itemOffset + index + 1}
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-3">
                        {user.photo ? (
                          <img
                            src={user.photo}
                            alt=""
                            className="h-9 w-9 shrink-0 rounded-full border border-line object-cover"
                          />
                        ) : (
                          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                            {(user.name || "?").trim().charAt(0).toUpperCase()}
                          </span>
                        )}
                        <span className="min-w-0">
                          <Link
                            to={`/user/${user._id}/details`}
                            className="flex items-center gap-1.5 font-semibold text-text transition-colors hover:text-primary"
                          >
                            <span className="truncate">{shortenText(user.name, 22)}</span>
                            {!user.isVerified && (
                              <span
                                title="Təsdiqlənməyib"
                                className="h-1.5 w-1.5 shrink-0 rounded-full bg-warning"
                              />
                            )}
                          </Link>
                          <span className="block truncate text-xs text-muted">{user.email}</span>
                        </span>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 tabular-nums text-muted">
                      {user.phone || "—"}
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 text-muted">
                      {user.grade ? gradeLabel(user.grade) : "—"}
                    </td>
                    <td className="px-3 py-3">
                      <Badge tone={roleTone(user.role)}>{roleLabels[user.role] || user.role}</Badge>
                    </td>
                    {isAdmin && (
                      <td className="py-3 pl-3 pr-5">
                        {/* Admin only: full role control + delete. Teachers manage
                            students per-class from the class edit page. */}
                        <div className="flex items-center justify-end gap-2">
                          <ChangeRole _id={user._id} email={user.email} />
                          <button
                            onClick={() => setConfirmUser(user)}
                            aria-label="Sil"
                            title="Hesabı sil"
                            className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-muted opacity-60 transition-all hover:bg-danger/12 hover:text-danger group-hover:opacity-100"
                          >
                            <AiFillDelete />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {pageCount > 1 && (
            <ReactPaginate
              breakLabel="..."
              nextLabel="Növbəti"
              onPageChange={handlePageClick}
              pageRangeDisplayed={5}
              pageCount={pageCount}
              previousLabel="Əvvəlki"
              renderOnZeroPageCount={null}
              containerClassName="flex flex-wrap justify-center items-center gap-2 mt-8"
              pageLinkClassName="grid h-10 min-w-[2.5rem] place-items-center rounded-lg border border-line px-3 text-sm text-text transition-colors hover:bg-surface2 cursor-pointer"
              activeLinkClassName="!bg-primary !text-primary-fg !border-primary"
              previousLinkClassName="grid h-10 place-items-center rounded-lg border border-line px-4 text-sm text-text transition-colors hover:bg-surface2 cursor-pointer"
              nextLinkClassName="grid h-10 place-items-center rounded-lg border border-line px-4 text-sm text-text transition-colors hover:bg-surface2 cursor-pointer"
              breakClassName="px-2 text-muted"
              disabledLinkClassName="opacity-40 pointer-events-none"
            />
          )}
        </>
      )}

      <ConfirmDialog
        open={!!confirmUser}
        onClose={() => setConfirmUser(null)}
        onConfirm={handleDeleteUser}
        title="Hesabı silmək?"
        confirmLabel="Bəli, sil"
        cancelLabel="Geri"
        tone="danger"
        loading={deletingUser}
      >
        <p>
          <span className="font-semibold text-text">{confirmUser?.name}</span>{" "}
          <span className="text-muted">({confirmUser?.email})</span> hesabı
          həmişəlik silinəcək. Bu əməliyyat geri qaytarıla bilməz.
        </p>
      </ConfirmDialog>
    </AccountLayout>
  );
};

export default UserList;
