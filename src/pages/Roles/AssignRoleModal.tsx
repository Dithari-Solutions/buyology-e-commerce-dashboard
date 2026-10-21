import { useEffect, useState } from "react";
import { Link } from "react-router";
import { usersService } from "../../api/services/users.service";
import { rolesService } from "../../api/services/roles.service";
import { ApiRequestError } from "../../api";
import type { Role } from "../../types/roles.types";
import type { UserListItem } from "../../types/user.types";

export default function AssignRoleModal({ role, onClose, onAssigned }: {
  role: Role;
  onClose: () => void;
  onAssigned: () => void;
}) {
  const [search, setSearch] = useState("");
  const [people, setPeople] = useState<UserListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [pages, setPages] = useState(0);
  const [replaceRoles, setReplaceRoles] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setPeople([]);
    setError(null);
    const timer = setTimeout(() => {
      usersService.getAdmins(page, 10, search, controller.signal)
        .then((res) => {
          if (controller.signal.aborted) return;
          setPeople(res.data.users);
          setPages(res.data.totalPages);
        })
        .catch((err: unknown) => {
          if (!controller.signal.aborted) setError(err instanceof ApiRequestError ? err.message : "Could not load people.");
        })
        .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    }, 250);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [search, page]);

  async function assign(person: UserListItem) {
    setAssigning(person.userId);
    setError(null);
    try {
      if (replaceRoles) await usersService.setAdminRoles(person.userId, [role.id]);
      else await rolesService.assignRole({ userId: person.userId, roleId: role.id });
      onAssigned();
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : "Could not assign this role.");
    } finally {
      setAssigning(null);
    }
  }

  return (
    <div className="fixed inset-0 z-[100000] flex items-start justify-center overflow-y-auto bg-black/40 px-4 py-10 backdrop-blur-sm">
      <div role="dialog" aria-modal="true" aria-labelledby="assign-role-title" className="w-full max-w-2xl rounded-2xl border border-gray-200 bg-white p-6 shadow-xl dark:border-gray-700 dark:bg-gray-900">
        <div className="flex items-center justify-between gap-4">
          <h2 id="assign-role-title" className="text-lg font-semibold text-gray-800 dark:text-white">Assign people</h2>
          <button aria-label="Close assignment" disabled={assigning !== null} onClick={onClose} className="p-2 text-gray-500">✕</button>
        </div>
        <p className="mt-2 text-sm text-gray-500">Add {role.name.toLowerCase().replace(/_/g, " ")} to an existing admin account. Their other roles stay assigned; permissions from all their roles are combined.</p>
        <input autoFocus aria-label="Search people" value={search} onChange={(e) => { setSearch(e.target.value); setPage(0); }} placeholder="Search by name or email" className="mt-4 w-full rounded-xl border border-gray-200 bg-transparent px-4 py-3 text-sm text-gray-800 dark:border-gray-700 dark:text-white" />
        <label className="mt-4 flex items-start gap-3 text-sm text-gray-700 dark:text-gray-300"><input type="checkbox" checked={replaceRoles} disabled={assigning !== null} onChange={(e) => setReplaceRoles(e.target.checked)} className="mt-1 accent-brand-500" /><span>Replace existing roles with this role<span className="mt-1 block text-xs text-gray-500">Use this to limit the person to this role's permissions. Otherwise, their existing roles continue to grant access.</span></span></label>
        {error && <p role="alert" className="mt-3 text-sm text-red-600">{error}</p>}
        <div className="mt-4 space-y-2">
          {loading ? <p className="py-6 text-center text-sm text-gray-500">Loading people…</p> : people.length === 0 ? <p className="py-6 text-center text-sm text-gray-500">No admin accounts found.</p> : people.map((person) => {
            const assigned = person.roles?.includes(role.name);
            return <div key={person.userId} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-100 p-3 dark:border-gray-800">
              <div className="min-w-0 text-sm"><p className="font-medium text-gray-800 dark:text-white">{[person.firstName, person.lastName].filter(Boolean).join(" ") || person.email || "Admin"}</p><p className="break-all text-gray-500">{person.email}</p></div>
              <button disabled={(assigned && !replaceRoles) || person.status !== "ACTIVE" || assigning !== null} onClick={() => void assign(person)} className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">{assigning === person.userId ? "Assigning…" : person.status !== "ACTIVE" ? "Suspended" : replaceRoles ? "Replace roles" : assigned ? "Assigned" : "Assign role"}</button>
            </div>;
          })}
        </div>
        <div className="mt-4 flex items-center justify-between gap-3 text-sm text-gray-500">
          <button disabled={page === 0 || loading} onClick={() => setPage((p) => p - 1)} className="disabled:opacity-40">Previous</button>
          <span>Page {page + 1} of {Math.max(1, pages)}</span>
          <button disabled={page + 1 >= pages || loading} onClick={() => setPage((p) => p + 1)} className="disabled:opacity-40">Next</button>
        </div>
        <Link to={`/admin/admins/new?roleId=${encodeURIComponent(role.id)}`} className="mt-5 block text-sm font-medium text-brand-500">Create an admin account or promote an existing customer →</Link>
      </div>
    </div>
  );
}
