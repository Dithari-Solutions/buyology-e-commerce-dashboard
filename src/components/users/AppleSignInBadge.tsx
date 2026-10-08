/** Based on an APPLE credential, not the customer's email domain. */
export function AppleSignInBadge() {
  return (
    <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-800 dark:bg-white/10 dark:text-white" title="User used Apple to sign in">
      <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
        <path d="M17.05 12.54c.03 3.01 2.64 4.01 2.67 4.02-.02.07-.42 1.43-1.38 2.84-.83 1.22-1.7 2.44-3.06 2.46-1.34.03-1.77-.79-3.3-.79-1.53 0-2 .77-3.27.82-1.31.05-2.31-1.32-3.15-2.53C3.85 16.89 2.49 12.38 4.24 9.34c.87-1.51 2.43-2.46 4.12-2.49 1.29-.03 2.51.87 3.3.87.79 0 2.27-1.08 3.83-.92.65.03 2.49.26 3.67 1.99-.1.06-2.19 1.28-2.11 3.75ZM14.54 5.15c.7-.85 1.17-2.03 1.04-3.21-1.01.04-2.23.67-2.95 1.52-.65.75-1.22 1.95-1.07 3.1 1.13.09 2.28-.57 2.98-1.41Z" />
      </svg>
      Used Apple to sign in
    </span>
  );
}
