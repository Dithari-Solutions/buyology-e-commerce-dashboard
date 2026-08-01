import { useEffect, useRef, useState } from "react";
import { usersService } from "../../api/services/users.service";
import type { UserListItem } from "../../types/user.types";

interface Props {
  /** Selected users.id (empty when none chosen). */
  value: string;
  onSelect: (userId: string) => void;
}

/**
 * Search-as-you-type user picker: queries GET /api/admin/users?search=... and lets the
 * admin pick a user by name/email instead of pasting a raw UUID. Emits the users.id.
 */
export default function UserSearchSelect({ value, onSelect }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<UserListItem[]>([]);
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<UserListItem | null>(null);
  const [loading, setLoading] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  // If the parent clears the value externally, drop the local selection.
  useEffect(() => {
    if (!value) setSelected(null);
  }, [value]);

  // Debounced search (skip while a user is already chosen).
  useEffect(() => {
    if (selected) return;
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      return;
    }
    const ctrl = new AbortController();
    const t = setTimeout(() => {
      setLoading(true);
      usersService
        .search(q, 0, 8, ctrl.signal)
        .then((r) => {
          setResults(r.data?.users ?? []);
          setOpen(true);
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    }, 300);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [query, selected]);

  // Close on outside click.
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const label = (u: UserListItem) =>
    [u.firstName, u.lastName].filter(Boolean).join(" ") || "(no name)";

  function pick(u: UserListItem) {
    setSelected(u);
    onSelect(u.userId);
    setOpen(false);
    setQuery("");
  }

  function clear() {
    setSelected(null);
    onSelect("");
    setQuery("");
    setResults([]);
  }

  if (selected) {
    return (
      <div className="flex items-center justify-between rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-800">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-gray-800 dark:text-white">{label(selected)}</p>
          <p className="truncate text-xs text-gray-500">{selected.email ?? "—"}</p>
        </div>
        <button type="button" onClick={clear} className="ml-2 shrink-0 text-xs font-medium text-brand-500 hover:text-brand-600">
          Change
        </button>
      </div>
    );
  }

  return (
    <div ref={boxRef} className="relative">
      <input
        type="text"
        placeholder="Search by name or email…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => results.length > 0 && setOpen(true)}
        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
      />
      {open && (
        <div className="absolute z-20 mt-1 max-h-60 w-full overflow-auto rounded-lg border border-gray-200 bg-white shadow-theme-md dark:border-gray-700 dark:bg-gray-900">
          {loading && <div className="px-3 py-2 text-sm text-gray-400">Searching…</div>}
          {!loading && results.length === 0 && query.trim().length >= 2 && (
            <div className="px-3 py-2 text-sm text-gray-400">No users found</div>
          )}
          {results.map((u) => (
            <button
              type="button"
              key={u.userId}
              onClick={() => pick(u)}
              className="flex w-full flex-col items-start px-3 py-2 text-left hover:bg-gray-50 dark:hover:bg-white/[0.05]"
            >
              <span className="text-sm font-medium text-gray-800 dark:text-white">{label(u)}</span>
              <span className="text-xs text-gray-500">{u.email ?? "—"}</span>
            </button>
          ))}
        </div>
      )}
      {query.trim().length > 0 && query.trim().length < 2 && (
        <p className="mt-1 text-xs text-gray-400">Type at least 2 characters</p>
      )}
    </div>
  );
}
