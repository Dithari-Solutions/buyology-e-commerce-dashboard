import { useEffect, useState } from "react";
import PageMeta from "../../components/common/PageMeta";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import {
  b2bMembershipService,
  type B2bCountry,
} from "../../api/services/b2b-membership.service";

const blank = { countryCode: "", countryName: "", currencyCode: "", enabled: true };

export default function B2BCountriesPage() {
  const [countries, setCountries] = useState<B2bCountry[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(blank);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = () => {
    setLoading(true);
    b2bMembershipService
      .listCountries()
      .then((res) => setCountries(res.data ?? []))
      .catch(() => setCountries([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      await b2bMembershipService.upsertCountry({
        countryCode: form.countryCode.toUpperCase(),
        countryName: form.countryName,
        currencyCode: form.currencyCode.toUpperCase(),
        enabled: form.enabled,
      });
      setForm(blank);
      load();
    } catch (e: unknown) {
      setError((e as Error).message ?? "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const toggle = async (c: B2bCountry) => {
    await b2bMembershipService.upsertCountry({
      countryCode: c.countryCode,
      countryName: c.countryName,
      currencyCode: c.currencyCode,
      enabled: !c.enabled,
    });
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("Remove this country?")) return;
    await b2bMembershipService.deleteCountry(id);
    load();
  };

  return (
    <>
      <PageMeta title="B2B Countries" description="Markets where B2B membership is offered" />
      <PageBreadcrumb pageTitle="B2B Countries" />

      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
        <h3 className="mb-4 text-base font-semibold">Add or update country</h3>
        <form onSubmit={submit} className="grid grid-cols-1 gap-3 md:grid-cols-5">
          <input
            placeholder="ISO Code (AE)"
            maxLength={2}
            required
            className="rounded-md border px-3 py-2 dark:border-gray-700 dark:bg-gray-900"
            value={form.countryCode}
            onChange={(e) => setForm({ ...form, countryCode: e.target.value })}
          />
          <input
            placeholder="Country name"
            required
            className="rounded-md border px-3 py-2 dark:border-gray-700 dark:bg-gray-900"
            value={form.countryName}
            onChange={(e) => setForm({ ...form, countryName: e.target.value })}
          />
          <input
            placeholder="Currency (AED)"
            maxLength={10}
            required
            className="rounded-md border px-3 py-2 dark:border-gray-700 dark:bg-gray-900"
            value={form.currencyCode}
            onChange={(e) => setForm({ ...form, currencyCode: e.target.value })}
          />
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.enabled}
              onChange={(e) => setForm({ ...form, enabled: e.target.checked })}
            />
            Enabled
          </label>
          <button
            type="submit"
            disabled={saving}
            className="rounded-md bg-brand-600 px-4 py-2 text-sm text-white disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save"}
          </button>
          {error && <span className="col-span-full text-xs text-red-600">{error}</span>}
        </form>
      </div>

      <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
        <h3 className="mb-4 text-base font-semibold">Configured countries</h3>
        {loading ? (
          <div className="py-6 text-center text-gray-500">Loading…</div>
        ) : countries.length === 0 ? (
          <div className="py-6 text-center text-gray-500">No countries configured</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500 dark:bg-gray-900">
              <tr>
                <th className="px-3 py-2">Code</th>
                <th className="px-3 py-2">Name</th>
                <th className="px-3 py-2">Currency</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {countries.map((c) => (
                <tr key={c.id} className="border-t border-gray-100 dark:border-gray-800">
                  <td className="px-3 py-2 font-mono">{c.countryCode}</td>
                  <td className="px-3 py-2">{c.countryName}</td>
                  <td className="px-3 py-2">{c.currencyCode}</td>
                  <td className="px-3 py-2">
                    {c.enabled ? (
                      <span className="rounded bg-green-100 px-2 py-0.5 text-xs text-green-700">enabled</span>
                    ) : (
                      <span className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-700">disabled</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <button onClick={() => toggle(c)} className="mr-3 text-xs text-brand-600 hover:underline">
                      {c.enabled ? "Disable" : "Enable"}
                    </button>
                    <button onClick={() => remove(c.id)} className="text-xs text-red-600 hover:underline">
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
