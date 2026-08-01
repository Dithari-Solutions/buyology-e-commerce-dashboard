import { useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import { useSidebar } from "../context/SidebarContext";
import { ThemeToggleButton } from "../components/common/ThemeToggleButton";
import NotificationDropdown from "../components/header/NotificationDropdown";
import UserDropdown from "../components/header/UserDropdown";
import LanguageToggler from "../components/header/LanguageToggler";
import { hasAnyRole, hasRole } from "../api/client";

const MenuIcon = () => (
  <svg width="18" height="14" viewBox="0 0 18 14" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path fillRule="evenodd" clipRule="evenodd"
      d="M0 1C0 0.447715 0.447715 0 1 0H17C17.5523 0 18 0.447715 18 1C18 1.55228 17.5523 2 17 2H1C0.447715 2 0 1.55228 0 1ZM0 13C0 12.4477 0.447715 12 1 12H17C17.5523 12 18 12.4477 18 13C18 13.5523 17.5523 14 17 14H1C0.447715 14 0 13.5523 0 13ZM1 6C0.447715 6 0 6.44772 0 7C0 7.55228 0.447715 8 1 8H9C9.55228 8 10 7.55228 10 7C10 6.44772 9.55228 6 9 6H1Z"
      fill="currentColor"
    />
  </svg>
);

const CloseIcon = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path fillRule="evenodd" clipRule="evenodd"
      d="M1.21967 1.21967C1.51256 0.926777 1.98744 0.926777 2.28033 1.21967L9 7.93934L15.7197 1.21967C16.0126 0.926777 16.4874 0.926777 16.7803 1.21967C17.0732 1.51256 17.0732 1.98744 16.7803 2.28033L10.0607 9L16.7803 15.7197C17.0732 16.0126 17.0732 16.4874 16.7803 16.7803C16.4874 17.0732 16.0126 17.0732 15.7197 16.7803L9 10.0607L2.28033 16.7803C1.98744 17.0732 1.51256 17.0732 1.21967 16.7803C0.926777 16.4874 0.926777 16.0126 1.21967 15.7197L7.93934 9L1.21967 2.28033C0.926777 1.98744 0.926777 1.51256 1.21967 1.21967Z"
      fill="currentColor"
    />
  </svg>
);

const SearchIcon = () => (
  <svg className="size-4" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path fillRule="evenodd" clipRule="evenodd"
      d="M3.04175 9.37363C3.04175 5.87693 5.87711 3.04199 9.37508 3.04199C12.8731 3.04199 15.7084 5.87693 15.7084 9.37363C15.7084 12.8703 12.8731 15.7053 9.37508 15.7053C5.87711 15.7053 3.04175 12.8703 3.04175 9.37363ZM9.37508 1.54199C5.04902 1.54199 1.54175 5.04817 1.54175 9.37363C1.54175 13.6991 5.04902 17.2053 9.37508 17.2053C11.2674 17.2053 13.003 16.5344 14.357 15.4176L17.177 18.238C17.4699 18.5309 17.9448 18.5309 18.2377 18.238C18.5306 17.9451 18.5306 17.4703 18.2377 17.1774L15.418 14.3573C16.5365 13.0033 17.2084 11.2669 17.2084 9.37363C17.2084 5.04817 13.7011 1.54199 9.37508 1.54199Z"
      fill="currentColor"
    />
  </svg>
);

const DotsIcon = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="10" cy="4" r="1.5" fill="currentColor" />
    <circle cx="10" cy="10" r="1.5" fill="currentColor" />
    <circle cx="10" cy="16" r="1.5" fill="currentColor" />
  </svg>
);

const AppHeader: React.FC = () => {
  const [isApplicationMenuOpen, setApplicationMenuOpen] = useState(false);
  const { isMobileOpen, toggleSidebar, toggleMobileSidebar } = useSidebar();
  const inputRef = useRef<HTMLInputElement>(null);

  const handleToggle = () => {
    if (window.innerWidth >= 1024) {
      toggleSidebar();
    } else {
      toggleMobileSidebar();
    }
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === "k") {
        event.preventDefault();
        inputRef.current?.focus();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  const iconButton =
    "flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-gray-100";

  return (
    <header className="sticky top-0 z-[99999] w-full border-b border-gray-200 bg-white/85 backdrop-blur-md dark:border-gray-800 dark:bg-gray-900/85">
      <div className="flex h-14 w-full items-center justify-between gap-3 px-4 md:px-6">
        {/* Left — toggle + logo + search */}
        <div className="flex min-w-0 items-center gap-2">
          <button
            onClick={handleToggle}
            aria-label="Toggle Sidebar"
            className={iconButton}
          >
            {isMobileOpen ? <CloseIcon /> : <MenuIcon />}
          </button>

          {/* Logo — mobile only */}
          <Link to="/" className="lg:hidden">
            <img className="h-6 dark:hidden" src="/images/logo/logo.svg" alt="Logo" />
            <img className="hidden h-6 dark:block" src="/images/logo/logo-dark.svg" alt="Logo" />
          </Link>

          {/* Search — desktop only */}
          <div className="relative hidden lg:block">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
              <SearchIcon />
            </span>
            <input
              ref={inputRef}
              type="text"
              placeholder="Search…"
              className="h-8 w-56 rounded-lg border border-gray-200 bg-gray-50 pl-9 pr-14 text-[13px] text-gray-700 placeholder:text-gray-400 focus:border-brand-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-800/60 dark:text-gray-200 dark:placeholder:text-gray-500 dark:focus:border-brand-500 dark:focus:bg-gray-800 xl:w-72"
            />
            <kbd className="pointer-events-none absolute right-2 top-1/2 hidden -translate-y-1/2 items-center gap-0.5 rounded border border-gray-200 bg-white px-1.5 py-px text-[10px] font-medium text-gray-400 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-500 sm:flex">
              <span>⌘</span>
              <span>K</span>
            </kbd>
          </div>
        </div>

        {/* Right — actions + user (desktop) / dots (mobile) */}
        <div className="flex items-center gap-1">
          <div className="hidden items-center gap-1 lg:flex">
            {/* Suppliers (without higher admin roles) get a language toggler. */}
            {hasRole("SUPPLIER") && !hasAnyRole("ADMIN", "SUPERADMIN", "CUSTOMER_SUPPORT") && (
              <LanguageToggler />
            )}
            <ThemeToggleButton />
            <NotificationDropdown />
            <span className="mx-1.5 h-5 w-px bg-gray-200 dark:bg-gray-800" />
          </div>

          {/* User dropdown — always visible on desktop */}
          <div className="hidden lg:block">
            <UserDropdown />
          </div>

          {/* Mobile three-dot menu toggle */}
          <button
            onClick={() => setApplicationMenuOpen(!isApplicationMenuOpen)}
            aria-label="App menu"
            className={`${iconButton} lg:hidden`}
          >
            <DotsIcon />
          </button>
        </div>
      </div>

      {/* Mobile expanded menu */}
      {isApplicationMenuOpen && (
        <div className="flex items-center justify-between gap-3 border-t border-gray-100 bg-white px-4 py-2.5 dark:border-gray-800 dark:bg-gray-900 lg:hidden">
          <div className="relative flex-1">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
              <SearchIcon />
            </span>
            <input
              type="text"
              placeholder="Search…"
              className="h-8 w-full rounded-lg border border-gray-200 bg-gray-50 pl-9 pr-3 text-[13px] text-gray-700 placeholder:text-gray-400 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:placeholder:text-gray-500"
            />
          </div>
          <div className="flex items-center gap-1">
            {hasRole("SUPPLIER") && !hasAnyRole("ADMIN", "SUPERADMIN", "CUSTOMER_SUPPORT") && (
              <LanguageToggler />
            )}
            <ThemeToggleButton />
            <NotificationDropdown />
          </div>
          <UserDropdown />
        </div>
      )}
    </header>
  );
};

export default AppHeader;
