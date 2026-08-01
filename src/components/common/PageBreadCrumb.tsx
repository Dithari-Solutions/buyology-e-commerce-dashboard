import { Link } from "react-router";
import type { ReactNode } from "react";

interface BreadcrumbProps {
  /** Page title — rendered as the page's h1. */
  pageTitle: string;
  /** Optional one-line explanation shown under the title. */
  description?: string;
  /** Optional right-aligned actions (buttons, filters). Replaces the crumb trail. */
  actions?: ReactNode;
}

/**
 * Compact page header used at the top of every page. Title, trail and any page
 * actions sit on a single row so content starts high on the screen instead of
 * after a tall masthead.
 */
const PageBreadcrumb: React.FC<BreadcrumbProps> = ({
  pageTitle,
  description,
  actions,
}) => {
  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
      <div className="min-w-0">
        <h1 className="ui-page-title truncate">{pageTitle}</h1>
        {description && <p className="ui-muted mt-0.5">{description}</p>}
      </div>

      {actions ?? (
        <nav aria-label="Breadcrumb">
          <ol className="flex items-center gap-1 text-xs text-gray-400">
            <li>
              <Link
                to="/"
                className="transition-colors hover:text-gray-600 dark:hover:text-gray-300"
              >
                Home
              </Link>
            </li>
            <li aria-hidden className="text-gray-300 dark:text-gray-600">
              /
            </li>
            <li className="font-medium text-gray-600 dark:text-gray-300">
              {pageTitle}
            </li>
          </ol>
        </nav>
      )}
    </div>
  );
};

export default PageBreadcrumb;
