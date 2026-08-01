import { useEffect, useRef, useState } from "react";
import { useI18n } from "../../i18n/I18nProvider";
import { LANG_LABELS, SUPPORTED_LANGS, type Lang } from "../../i18n/messages";

/**
 * Compact language picker mounted in the dashboard header.
 * Header-mount logic (only show for SUPPLIER role) lives in AppHeader.
 */
export default function LanguageToggler() {
  const { lang, setLang } = useI18n();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex h-8 items-center gap-1 rounded-lg px-2 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-white"
      >
        <span className="uppercase">{lang}</span>
        <svg width="12" height="12" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
          <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.06l3.71-3.83a.75.75 0 111.08 1.04l-4.25 4.4a.75.75 0 01-1.08 0l-4.25-4.4a.75.75 0 01.02-1.06z" clipRule="evenodd" />
        </svg>
      </button>
      {open && (
        <div className="absolute right-0 z-50 mt-1.5 w-40 overflow-hidden rounded-lg border border-gray-200 bg-white p-1 shadow-theme-lg dark:border-gray-800 dark:bg-gray-dark">
          {SUPPORTED_LANGS.map((code: Lang) => (
            <button
              key={code}
              type="button"
              onClick={() => {
                setLang(code);
                setOpen(false);
              }}
              className={`block w-full rounded-md px-2.5 py-1.5 text-left text-xs transition-colors hover:bg-gray-100 dark:hover:bg-white/5 ${
                code === lang ? "font-semibold text-brand-600" : "text-gray-700 dark:text-gray-200"
              }`}
            >
              <span className="mr-2 uppercase text-gray-500">{code}</span>
              {LANG_LABELS[code]}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
