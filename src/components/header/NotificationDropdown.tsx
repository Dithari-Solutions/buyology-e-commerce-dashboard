import { useCallback, useEffect, useState } from "react";
import { Dropdown } from "../ui/dropdown/Dropdown";
import { notificationsService, type NotificationItem } from "../../api";

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hr ago`;
  return `${Math.floor(hrs / 24)} d ago`;
}

export default function NotificationDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unread, setUnread] = useState(0);

  const refreshUnread = useCallback(() => {
    notificationsService
      .getUnreadCount()
      .then((r) => setUnread(r.data ?? 0))
      .catch(() => {});
  }, []);

  // Poll the unread count so new orders surface without a manual refresh.
  useEffect(() => {
    refreshUnread();
    const t = setInterval(refreshUnread, 30000);
    return () => clearInterval(t);
  }, [refreshUnread]);

  function openDropdown() {
    setIsOpen(true);
    notificationsService
      .getHistory()
      .then((r) => setItems(r.data ?? []))
      .catch(() => {});
  }

  function closeDropdown() {
    setIsOpen(false);
  }

  async function handleItemClick(n: NotificationItem) {
    if (!n.isRead) {
      try {
        await notificationsService.markRead(n.id);
        setItems((prev) => prev.map((i) => (i.id === n.id ? { ...i, isRead: true } : i)));
        refreshUnread();
      } catch { /* ignore */ }
    }
  }

  return (
    <div className="relative">
      <button
        aria-label="Notifications"
        className="dropdown-toggle relative flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-white"
        onClick={() => (isOpen ? closeDropdown() : openDropdown())}
      >
        <span
          className={`absolute right-0 top-0.5 z-10 h-2 w-2 rounded-full bg-orange-400 ${
            unread === 0 ? "hidden" : "flex"
          }`}
        >
          <span className="absolute inline-flex w-full h-full bg-orange-400 rounded-full opacity-75 animate-ping"></span>
        </span>
        <svg className="fill-current" width="17" height="17" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M10.75 2.29248C10.75 1.87827 10.4143 1.54248 10 1.54248C9.58583 1.54248 9.25004 1.87827 9.25004 2.29248V2.83613C6.08266 3.20733 3.62504 5.9004 3.62504 9.16748V14.4591H3.33337C2.91916 14.4591 2.58337 14.7949 2.58337 15.2091C2.58337 15.6234 2.91916 15.9591 3.33337 15.9591H4.37504H15.625H16.6667C17.0809 15.9591 17.4167 15.6234 17.4167 15.2091C17.4167 14.7949 17.0809 14.4591 16.6667 14.4591H16.375V9.16748C16.375 5.9004 13.9174 3.20733 10.75 2.83613V2.29248ZM14.875 14.4591V9.16748C14.875 6.47509 12.6924 4.29248 10 4.29248C7.30765 4.29248 5.12504 6.47509 5.12504 9.16748V14.4591H14.875ZM8.00004 17.7085C8.00004 18.1228 8.33583 18.4585 8.75004 18.4585H11.25C11.6643 18.4585 12 18.1228 12 17.7085C12 17.2943 11.6643 16.9585 11.25 16.9585H8.75004C8.33583 16.9585 8.00004 17.2943 8.00004 17.7085Z"
            fill="currentColor"
          />
        </svg>
      </button>
      <Dropdown
        isOpen={isOpen}
        onClose={closeDropdown}
        className="absolute -right-[240px] mt-1.5 flex h-[420px] w-[320px] flex-col rounded-lg border border-gray-200 bg-white p-2 shadow-theme-lg dark:border-gray-800 dark:bg-gray-dark sm:w-[340px] lg:right-0"
      >
        <div className="mb-2 flex items-center justify-between border-b border-gray-100 px-1 pb-2 dark:border-gray-800">
          <h5 className="ui-section-title">Notifications</h5>
          <button onClick={closeDropdown} className="text-gray-500 transition dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200">
            <svg className="fill-current" width="18" height="18" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M6.21967 7.28131C5.92678 6.98841 5.92678 6.51354 6.21967 6.22065C6.51256 5.92775 6.98744 5.92775 7.28033 6.22065L11.999 10.9393L16.7176 6.22078C17.0105 5.92789 17.4854 5.92788 17.7782 6.22078C18.0711 6.51367 18.0711 6.98855 17.7782 7.28144L13.0597 12L17.7782 16.7186C18.0711 17.0115 18.0711 17.4863 17.7782 17.7792C17.4854 18.0721 17.0105 18.0721 16.7176 17.7792L11.999 13.0607L7.28033 17.7794C6.98744 18.0722 6.51256 18.0722 6.21967 17.7794C5.92678 17.4865 5.92678 17.0116 6.21967 16.7187L10.9384 12L6.21967 7.28131Z"
                fill="currentColor"
              />
            </svg>
          </button>
        </div>
        <ul className="flex flex-col h-auto overflow-y-auto custom-scrollbar">
          {items.length === 0 ? (
            <li className="py-8 text-center text-sm text-gray-400">No notifications</li>
          ) : (
            items.map((n) => (
              <li key={n.id}>
                <button
                  onClick={() => handleItemClick(n)}
                  className={`flex w-full gap-2.5 rounded-md border-b border-gray-100 p-2 text-left transition-colors hover:bg-gray-100 dark:border-gray-800 dark:hover:bg-white/5 ${
                    n.isRead ? "" : "bg-brand-50/60 dark:bg-brand-500/5"
                  }`}
                >
                  <span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${n.isRead ? "bg-transparent" : "bg-brand-500"}`} />
                  <span className="min-w-0">
                    <span className="block text-[13px] font-medium text-gray-900 dark:text-white/90">{n.title}</span>
                    <span className="block truncate text-xs text-gray-500 dark:text-gray-400">{n.body}</span>
                    <span className="mt-1 block text-xs text-gray-400">
                      {n.type} · {timeAgo(n.createdAt)}
                    </span>
                  </span>
                </button>
              </li>
            ))
          )}
        </ul>
      </Dropdown>
    </div>
  );
}
