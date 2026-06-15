import { FiSearch } from "react-icons/fi";

const SearchUser = ({ value, onChange }) => {
  return (
    <div className="relative w-full max-w-sm">
      <FiSearch className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
      <input
        type="text"
        name="search"
        value={value}
        onChange={onChange}
        placeholder="İstifadəçi axtar"
        className="h-11 w-full rounded-xl border border-line bg-surface pl-10 pr-3.5 text-sm text-text outline-none transition placeholder:text-muted/60 focus:border-primary focus:ring-4 focus:ring-ring/25"
      />
    </div>
  );
};

export default SearchUser;
