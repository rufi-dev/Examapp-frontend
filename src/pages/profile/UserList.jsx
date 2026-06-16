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
} from "../../../redux/features/auth/authSlice";
import { shortenText } from "./Profile";
import { confirmAlert } from "react-confirm-alert";
import "react-confirm-alert/src/react-confirm-alert.css";
import { FILTER_USERS, selectUsers } from "../../../redux/features/auth/filterSlice";
import ReactPaginate from "react-paginate";
import { Link } from "react-router-dom";
import { AdminTeacherLink } from "../../components/protect/hiddenLink";
import Badge from "../../components/ui/Badge";

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
  const unVerifiedUser = users.length - verifiedUsers;

  useEffect(() => {
    dispatch(getUsers());
  }, [dispatch]);

  useEffect(() => {
    dispatch(CALC_VERIFIED_USER());
    dispatch(CALC_SUSPENDED_USER());
  }, [dispatch, users]);

  const filteredUsers = useSelector(selectUsers);

  const removeUser = async (id) => {
    await dispatch(deleteUser(id));
    dispatch(getUsers());
  };

  const confirmDelete = (user) => {
    confirmAlert({
      title: `Bu istifadəçini sil: ${user.email}`,
      message: "Silmək istədiyinə əminsən?",
      buttons: [
        { label: "Sil", onClick: () => removeUser(user._id) },
        { label: "Ləğv et" },
      ],
    });
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
    <AccountLayout title="İstifadəçilər" subtitle="İstifadəçiləri idarə et, rolları dəyiş.">
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
          tone="muted"
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
          İstifadəçi tapılmadı
        </div>
      ) : (
        <>
          {/* Mobile: stacked cards (a table doesn't fit a phone width) */}
          <div className="mt-6 space-y-3 md:hidden">
            {currentItems?.map((user, index) => (
              <div
                key={user._id || index}
                className="rounded-2xl border border-line bg-surface p-4 shadow-soft"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <Link
                      to={`/user/${user._id}/details`}
                      className="block truncate font-semibold text-text transition-colors hover:text-primary"
                    >
                      {user.name}
                    </Link>
                    <p className="mt-0.5 break-all text-sm text-muted">{user.email}</p>
                    {user.phone && <p className="text-sm text-muted">{user.phone}</p>}
                  </div>
                  <span className="shrink-0 text-xs font-semibold text-muted">
                    #{itemOffset + index + 1}
                  </span>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <Badge tone={roleTone(user.role)}>
                    {roleLabels[user.role] || user.role}
                  </Badge>
                  {user.isVerified ? (
                    <Badge tone="success">Təsdiqlənib</Badge>
                  ) : (
                    <Badge tone="warning">Təsdiqlənməyib</Badge>
                  )}
                </div>

                <AdminTeacherLink>
                  <div className="mt-3 flex items-center justify-between gap-2 border-t border-line/60 pt-3">
                    <ChangeRole _id={user._id} email={user.email} />
                    <button
                      onClick={() => confirmDelete(user)}
                      aria-label="Sil"
                      className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-muted transition-colors hover:bg-danger/12 hover:text-danger"
                    >
                      <AiFillDelete />
                    </button>
                  </div>
                </AdminTeacherLink>
              </div>
            ))}
          </div>

          {/* Desktop: full table */}
          <div className="mt-6 hidden overflow-x-auto rounded-2xl border border-line bg-surface shadow-soft scrollbar-thin md:block">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
                  <th className="px-4 py-4 font-semibold">s/n</th>
                  <th className="px-4 py-4 font-semibold">Ad və Soyad</th>
                  <th className="px-4 py-4 font-semibold">Email</th>
                  <th className="px-4 py-4 font-semibold">Telefon</th>
                  <th className="px-4 py-4 font-semibold">Rol</th>
                  <th className="px-4 py-4 font-semibold">Status</th>
                  <AdminTeacherLink>
                    <th className="px-4 py-4 font-semibold">Rolu dəyiş</th>
                    <th className="px-4 py-4 text-right font-semibold">Əməliyyat</th>
                  </AdminTeacherLink>
                </tr>
              </thead>
              <tbody>
                {currentItems?.map((user, index) => (
                  <tr
                    key={user._id || index}
                    className="border-b border-line/60 transition-colors last:border-0 hover:bg-surface2/50"
                  >
                    <td className="px-4 py-4 font-semibold text-text">
                      {itemOffset + index + 1}
                    </td>
                    <td className="px-4 py-4">
                      <Link
                        to={`/user/${user._id}/details`}
                        className="font-medium text-text transition-colors hover:text-primary"
                      >
                        {shortenText(user.name, 16)}
                      </Link>
                    </td>
                    <td className="whitespace-nowrap px-4 py-4 text-muted">{user.email}</td>
                    <td className="whitespace-nowrap px-4 py-4 text-muted">{user.phone}</td>
                    <td className="px-4 py-4">
                      <Badge tone={roleTone(user.role)}>
                        {roleLabels[user.role] || user.role}
                      </Badge>
                    </td>
                    <td className="px-4 py-4">
                      {user.isVerified ? (
                        <Badge tone="success">Təsdiqlənib</Badge>
                      ) : (
                        <Badge tone="warning">Təsdiqlənməyib</Badge>
                      )}
                    </td>
                    <AdminTeacherLink>
                      <td className="px-4 py-4">
                        <ChangeRole _id={user._id} email={user.email} />
                      </td>
                      <td className="px-4 py-4 text-right">
                        <button
                          onClick={() => confirmDelete(user)}
                          aria-label="Sil"
                          className="ml-auto grid h-9 w-9 place-items-center rounded-lg text-muted transition-colors hover:bg-danger/12 hover:text-danger"
                        >
                          <AiFillDelete />
                        </button>
                      </td>
                    </AdminTeacherLink>
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
    </AccountLayout>
  );
};

export default UserList;
