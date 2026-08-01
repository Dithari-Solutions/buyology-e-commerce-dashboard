import { Link, useLocation } from "react-router";
import PeopleIcon from '@mui/icons-material/People';
import CardMembershipOutlinedIcon from '@mui/icons-material/CardMembershipOutlined';
import HandshakeOutlinedIcon from '@mui/icons-material/HandshakeOutlined';
import GroupOutlinedIcon from '@mui/icons-material/GroupOutlined';
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import VideoCameraBackIcon from '@mui/icons-material/VideoCameraBack';
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined';
import RateReviewOutlinedIcon from '@mui/icons-material/RateReviewOutlined';
import StorefrontOutlinedIcon from '@mui/icons-material/StorefrontOutlined';
import TwoWheelerOutlinedIcon from '@mui/icons-material/TwoWheelerOutlined';
import ShoppingCartOutlinedIcon from '@mui/icons-material/ShoppingCartOutlined';
import ReceiptLongOutlinedIcon from '@mui/icons-material/ReceiptLongOutlined';
import SportsEsportsOutlinedIcon from '@mui/icons-material/SportsEsportsOutlined';
import RequestQuoteOutlinedIcon from '@mui/icons-material/RequestQuoteOutlined';
import ScienceOutlinedIcon from '@mui/icons-material/ScienceOutlined';
import WarehouseOutlinedIcon from '@mui/icons-material/WarehouseOutlined';

// Assume these icons are imported from an icon library
import {
  ChevronDownIcon,
  GridIcon,
  HorizontaLDots,
  ShootingStarIcon,
  UserCircleIcon,
} from "../icons";
import { useSidebar } from "../context/SidebarContext";
import { canAccessRoles, isProcurement, isPureSupplier, isSuperAdmin, landingPathForCurrentUser } from "../auth/roles";
import { storesService, b2bProductRequestsService, b2bQuotesService } from "../api";
import type { Store } from "../types";

type NavArea = "admin" | "supplier" | "shared";

type NavSubItem = {
  name: string;
  path: string;
  pro?: boolean;
  new?: boolean;
  /** When true, only visible to SUPERADMIN. */
  superAdminOnly?: boolean;
  /** Role names allowed to see this sub-item. Omitted = all admins. SUPERADMIN always sees it. */
  roles?: string[];
};

type NavItem = {
  name: string;
  icon: React.ReactNode;
  path?: string;
  /** Which role area this item belongs to. Defaults to "admin". */
  area?: NavArea;
  /** Role names allowed to see this whole group. Omitted = all admins. SUPERADMIN always sees it. */
  roles?: string[];
  subItems?: NavSubItem[];
};

// ── Role-based visibility ──────────────────────────────────────────────────
// Each admin group is tagged with the roles allowed to see it. SUPERADMIN sees
// everything; an omitted `roles` means "all admins". These mirror the backend
// seeded roles (STORE_ADMIN, CUSTOMER_SUPPORT, COURIER_ADMIN, MARKETING, SUPERADMIN).
// NOTE: this controls sidebar VISIBILITY only — real access is enforced server-side.
const STORE = "STORE_ADMIN";
const SUPPORT = "CUSTOMER_SUPPORT";
const COURIER = "COURIER_ADMIN";
const MARKETING = "MARKETING";
const PROCUREMENT = "PROCUREMENT";
const SUPER = "SUPERADMIN";

const navItems: NavItem[] = [
  {
    icon: <GridIcon />,
    name: "Dashboard",
    subItems: [
      { name: "Ecommerce", path: "/", pro: false },
      { name: "Revenues", path: "/revenue", pro: false, roles: [STORE] },
      { name: "Supplier Revenues", path: "/supplier-revenue", pro: false, roles: [STORE] },
      { name: "Revenue Exports", path: "/revenue-exports", pro: false, superAdminOnly: true },
    ],
  },
  {
    icon: <UserCircleIcon />,
    name: "User Profile",
    path: "/profile",
    area: "shared",
  },
  {
    name: "Marketing",
    icon: <ShootingStarIcon />,
    roles: [MARKETING],
    subItems: [
      { name: "Promo Codes", path: "/promo-codes", pro: false },
      { name: "Newsletter", path: "/newsletter", pro: false },
      { name: "Banners", path: "/banners", pro: false },
    ],
  },
  {
    name: "Admins",
    icon: <PeopleIcon />,
    roles: [SUPER],
    subItems: [
      { name: "All Admins", path: "/admin/admins", pro: false },
      { name: "Create Admin", path: "/admin/admins/new", pro: false, superAdminOnly: true },
      {
        name: "Roles & Permissions",
        path: "/admin/roles",
        pro: false,
        superAdminOnly: true,
      },
    ],
  },
  {
    name: "Users",
    icon: <GroupOutlinedIcon />,
    roles: [SUPPORT],
    subItems: [
      { name: "All Users", path: "/admin/users", pro: false },
    ],
  },
  {
    name: "Product",
    icon: <Inventory2OutlinedIcon />,
    roles: [STORE],
    subItems: [
      { name: "Products", path: "/products", pro: false },
      { name: "New Product", path: "/new-product", pro: false },
      { name: "Categories", path: "/categories", pro: false },
      { name: "Brands", path: "/brands", pro: false },
      { name: "Spec Library", path: "/specs", pro: false },
      { name: "Spec Codes", path: "/spec-codes", pro: false },
      { name: "Trash", path: "/products/trash", pro: false }
    ],
  },
  {
    name: "Story",
    icon: <VideoCameraBackIcon />,
    roles: [MARKETING],
    subItems: [
      { name: "Stories", path: "/stories", pro: false },
      { name: "New Story", path: "/new-story", pro: false }
    ],
  },
  {
    name: "Store",
    icon: <StorefrontOutlinedIcon />,
    roles: [STORE],
    subItems: [
      { name: "Stores", path: "/stores", pro: false },
      { name: "New Store", path: "/stores/new", pro: false },
      { name: "Countries", path: "/countries", pro: false },
    ],
  },
  {
    name: "Orders",
    icon: <ShoppingCartOutlinedIcon />,
    roles: [STORE, SUPPORT, COURIER],
    subItems: [
      { name: "By Store", path: "/orders", pro: false },
      { name: "All Orders", path: "/orders/all", superAdminOnly: true },
    ],
  },
  {
    name: "Refunds",
    icon: <ReceiptLongOutlinedIcon />,
    roles: [STORE, SUPPORT],
    subItems: [
      { name: "All Refunds", path: "/refunds" },
    ],
  },
  {
    name: "Payouts",
    icon: <ReceiptLongOutlinedIcon />,
    path: "/payouts",
    roles: [STORE],
  },
  {
    name: "Games",
    icon: <SportsEsportsOutlinedIcon />,
    path: "/games",
    roles: [MARKETING],
  },
  {
    name: "Couriers",
    icon: <TwoWheelerOutlinedIcon />,
    roles: [COURIER],
    subItems: [
      { name: "All Couriers", path: "/admin/couriers", pro: false },
      { name: "New Courier", path: "/admin/couriers/new", pro: false },
      { name: "Fleet Map", path: "/admin/couriers/map", pro: false },
      { name: "Store Couriers", path: "/admin/courier-profiles", pro: false },
    ],
  },
  {
    name: "Reviews & Q&A",
    icon: <RateReviewOutlinedIcon />,
    roles: [SUPPORT, STORE],
    subItems: [
      { name: "Reviews", path: "/reviews", pro: false },
      { name: "Questions", path: "/questions", pro: false },
    ],
  },
  {
    name: "B2B Membership",
    icon: <CardMembershipOutlinedIcon />,
    roles: [SUPPORT],
    subItems: [
      { name: "Applications", path: "/b2b-membership", pro: false },
      { name: "Inquiries (Legacy)", path: "/b2b-inquiries", pro: false },
    ],
  },
  {
    name: "Procurement",
    icon: <RequestQuoteOutlinedIcon />,
    roles: [PROCUREMENT],
    subItems: [
      { name: "Quotes", path: "/procurement/quotes", pro: false },
      { name: "Requests", path: "/procurement/requests", pro: false },
    ],
  },
  {
    name: "Suppliers",
    icon: <HandshakeOutlinedIcon />,
    roles: [STORE],
    subItems: [
      { name: "Applications", path: "/suppliers", pro: false },
      { name: "Products Review", path: "/supplier-products", pro: false },
      { name: "Change Requests", path: "/supplier-product-changes", pro: false, superAdminOnly: true },
    ],
  },
  {
    name: "Quiqup Testing",
    icon: <ScienceOutlinedIcon />,
    path: "/quiqup-testing",
    roles: [SUPER],
  },
  {
    name: "ERP",
    icon: <WarehouseOutlinedIcon />,
    path: "/erp",
    roles: [SUPER],
  },
  {
    name: "My Supplier Portal",
    icon: <HandshakeOutlinedIcon />,
    area: "supplier",
    subItems: [
      { name: "My Products", path: "/supplier/my-products", pro: false },
      { name: "Orders", path: "/supplier/orders", pro: false },
      { name: "Add Product", path: "/supplier/new-product", pro: false },
      { name: "Analytics", path: "/supplier/analytics", pro: false },
      { name: "Account", path: "/supplier/account", pro: false },
      { name: "Reviews", path: "/supplier/reviews", pro: false },
      { name: "Payouts", path: "/supplier/payouts", pro: false },
      { name: "Refunds", path: "/supplier/refunds", pro: false },
      { name: "Trash", path: "/supplier/trash", pro: false },
    ],
  },
];

// Kitchen-sink/UI-kit demo groups (Charts, UI Elements, Authentication) were
// removed for production — they linked to template pages no longer routed.
const othersItems: NavItem[] = [];

const AppSidebar: React.FC = () => {
  const { isExpanded, isMobileOpen, isHovered, setIsHovered } = useSidebar();
  const location = useLocation();

  const supplierOnly = isPureSupplier();
  const superAdmin = isSuperAdmin();
  const homePath = landingPathForCurrentUser();

  // Fetch all stores for any admin (not gated on isSuperAdmin(), which reads the JWT at
  // render-time and may be false before the token is restored — leaving the list empty).
  // Visibility is enforced by filterByRole (the injected items are superAdminOnly).
  const [stores, setStores] = useState<Store[]>([]);
  useEffect(() => {
    if (supplierOnly) return; // suppliers don't manage stores
    const ctrl = new AbortController();
    storesService
      .getAll(ctrl.signal)
      .then((res) => setStores(Array.isArray(res.data) ? res.data : []))
      .catch(() => {/* sidebar store shortcuts are best-effort */});
    return () => ctrl.abort();
  }, [supplierOnly]);

  // Poll the count of NEW B2B product requests + SUBMITTED quotes so the Procurement
  // group dot and the Requests / Quotes subitems surface a red badge without a manual
  // refresh. Only Procurement / SuperAdmin can read those admin endpoints, so skip
  // polling for everyone else. Mirrors the NotificationDropdown 30s polling pattern.
  const canSeeProcurement = isSuperAdmin() || isProcurement();
  const [newRequestCount, setNewRequestCount] = useState(0);
  const [newQuoteCount, setNewQuoteCount] = useState(0);
  useEffect(() => {
    if (!canSeeProcurement) return;
    let active = true;
    const refresh = () => {
      b2bProductRequestsService
        .getNewCount()
        .then((r) => {
          if (active) setNewRequestCount(r.data?.newCount ?? 0);
        })
        .catch(() => {/* badge is best-effort */});
      b2bQuotesService
        .getNewCount()
        .then((r) => {
          if (active) setNewQuoteCount(r.data?.newCount ?? 0);
        })
        .catch(() => {/* badge is best-effort */});
    };
    refresh();
    const t = setInterval(refresh, 30000);
    return () => {
      active = false;
      clearInterval(t);
    };
  }, [canSeeProcurement]);
  // Combined total drives the collapsed Procurement group badge.
  const procurementNewCount = newRequestCount + newQuoteCount;

  // Inject one Orders/Refunds sub-item per store, after the static entries. NOT gated to
  // super admins — any admin who sees the Orders/Refunds dropdown gets the full store list
  // (suppliers never see those groups, since they're area:"admin"). Gating on superAdminOnly
  // previously hid every store whenever isSuperAdmin() read false from the JWT.
  const navItemsWithStores = useMemo<NavItem[]>(() => {
    if (stores.length === 0) return navItems;
    const storeSubsFor = (base: string): NavSubItem[] =>
      stores.map((s) => ({ name: s.name, path: `${base}/${s.id}` }));
    return navItems.map((item) => {
      if (item.name === "Orders" && item.subItems) {
        return { ...item, subItems: [...item.subItems, ...storeSubsFor("/orders")] };
      }
      if (item.name === "Refunds" && item.subItems) {
        return { ...item, subItems: [...item.subItems, ...storeSubsFor("/refunds/store")] };
      }
      return item;
    });
  }, [stores]);

  const filterByRole = useCallback(
    (items: NavItem[]) =>
      items
        // 1. Area: suppliers see supplier items, admins see admin items, everyone sees shared.
        .filter((item) => {
          const area: NavArea = item.area ?? "admin";
          if (area === "shared") return true;
          return supplierOnly ? area === "supplier" : area === "admin";
        })
        // 2. Group-level role gate (e.g. only STORE_ADMIN/SUPERADMIN see the Product group).
        .filter((item) => canAccessRoles(item.roles))
        // 3. Sub-item gate: SUPERADMIN-only entries + per-sub-item role restrictions.
        .map((item) =>
          item.subItems
            ? {
                ...item,
                subItems: item.subItems.filter(
                  (s) => (!s.superAdminOnly || superAdmin) && canAccessRoles(s.roles)
                ),
              }
            : item
        )
        // 4. Drop a group whose sub-items were all filtered out.
        .filter((item) => !item.subItems || item.subItems.length > 0),
    [supplierOnly, superAdmin]
  );
  const visibleNavItems = filterByRole(navItemsWithStores);
  // Suppliers don't see the kitchen-sink/UI-kit "Others" section at all.
  const visibleOthersItems = supplierOnly ? [] : othersItems;

  const [openSubmenu, setOpenSubmenu] = useState<{
    type: "main" | "others";
    index: number;
  } | null>(null);
  const [subMenuHeight, setSubMenuHeight] = useState<Record<string, number>>(
    {}
  );
  const subMenuRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const isActive = useCallback(
    (path: string) => location.pathname === path || location.pathname.startsWith(path + "/"),
    [location.pathname]
  );

  useEffect(() => {
    let submenuMatched = false;
    ["main", "others"].forEach((menuType) => {
      const items = menuType === "main" ? visibleNavItems : visibleOthersItems;
      items.forEach((nav, index) => {
        if (nav.subItems) {
          nav.subItems.forEach((subItem) => {
            if (isActive(subItem.path)) {
              setOpenSubmenu({
                type: menuType as "main" | "others",
                index,
              });
              submenuMatched = true;
            }
          });
        }
      });
    });

    if (!submenuMatched) {
      setOpenSubmenu(null);
    }
  }, [location, isActive]);

  useEffect(() => {
    if (openSubmenu !== null) {
      const key = `${openSubmenu.type}-${openSubmenu.index}`;
      if (subMenuRefs.current[key]) {
        setSubMenuHeight((prevHeights) => ({
          ...prevHeights,
          [key]: subMenuRefs.current[key]?.scrollHeight || 0,
        }));
      }
    }
    // `stores` is included so the Orders submenu re-measures once the store list loads.
  }, [openSubmenu, stores]);

  const handleSubmenuToggle = (index: number, menuType: "main" | "others") => {
    setOpenSubmenu((prevOpenSubmenu) => {
      if (
        prevOpenSubmenu &&
        prevOpenSubmenu.type === menuType &&
        prevOpenSubmenu.index === index
      ) {
        return null;
      }
      return { type: menuType, index };
    });
  };

  const showLabels = isExpanded || isHovered || isMobileOpen;

  /** Small red count pill used by the Procurement group and its sub-items. */
  const CountBadge = ({
    count,
    title,
    className = "",
  }: {
    count: number;
    title: string;
    className?: string;
  }) => (
    <span
      title={title}
      className={`inline-flex min-w-4 items-center justify-center rounded-full bg-error-500 px-1 py-px text-[10px] font-semibold leading-none text-white ${className}`}
    >
      {count > 99 ? "99+" : count}
    </span>
  );

  const renderMenuItems = (items: NavItem[], menuType: "main" | "others") => (
    <ul className="flex flex-col gap-0.5">
      {items.map((nav, index) => {
        const isOpen =
          openSubmenu?.type === menuType && openSubmenu?.index === index;
        // A collapsed group still reads as "current" when one of its children is.
        const hasActiveChild = !!nav.subItems?.some((s) => isActive(s.path));

        return (
          <li key={nav.name}>
            {nav.subItems ? (
              <button
                onClick={() => handleSubmenuToggle(index, menuType)}
                title={!showLabels ? nav.name : undefined}
                className={`menu-item group ${
                  isOpen || hasActiveChild
                    ? "menu-item-active"
                    : "menu-item-inactive"
                } ${!showLabels ? "lg:justify-center" : "lg:justify-start"}`}
              >
                <span
                  className={`menu-item-icon-size ${
                    isOpen || hasActiveChild
                      ? "menu-item-icon-active"
                      : "menu-item-icon-inactive"
                  }`}
                >
                  {nav.icon}
                </span>
                {showLabels && <span className="truncate">{nav.name}</span>}
                {nav.name === "Procurement" && procurementNewCount > 0 && (
                  <CountBadge
                    count={procurementNewCount}
                    title={`${newQuoteCount} new quote${newQuoteCount === 1 ? "" : "s"}, ${newRequestCount} new product request${newRequestCount === 1 ? "" : "s"}`}
                    className={showLabels ? "ml-1" : "absolute right-1 top-1"}
                  />
                )}
                {showLabels && (
                  <ChevronDownIcon
                    className={`ml-auto size-4 shrink-0 text-gray-400 transition-transform duration-200 ${
                      isOpen ? "rotate-180" : ""
                    }`}
                  />
                )}
              </button>
            ) : (
              nav.path && (
                <Link
                  to={nav.path}
                  title={!showLabels ? nav.name : undefined}
                  className={`menu-item group ${
                    isActive(nav.path) ? "menu-item-active" : "menu-item-inactive"
                  } ${!showLabels ? "lg:justify-center" : "lg:justify-start"}`}
                >
                  <span
                    className={`menu-item-icon-size ${
                      isActive(nav.path)
                        ? "menu-item-icon-active"
                        : "menu-item-icon-inactive"
                    }`}
                  >
                    {nav.icon}
                  </span>
                  {showLabels && <span className="truncate">{nav.name}</span>}
                </Link>
              )
            )}

            {nav.subItems && showLabels && (
              <div
                ref={(el) => {
                  subMenuRefs.current[`${menuType}-${index}`] = el;
                }}
                className="overflow-hidden transition-[height] duration-200 ease-out"
                style={{ height: isOpen ? `${subMenuHeight[`${menuType}-${index}`]}px` : "0px" }}
              >
                {/* A single hairline rail replaces the old per-item tree elbows —
                    same hierarchy cue, far less visual noise. */}
                <ul className="ml-[19px] mt-0.5 flex flex-col gap-px border-l border-gray-200 pb-1 pl-2 dark:border-gray-800">
                  {nav.subItems.map((subItem) => (
                    <li key={subItem.name}>
                      <Link
                        to={subItem.path}
                        className={`menu-dropdown-item ${
                          isActive(subItem.path)
                            ? "menu-dropdown-item-active"
                            : "menu-dropdown-item-inactive"
                        }`}
                      >
                        <span className="truncate">{subItem.name}</span>
                        <span className="ml-auto flex items-center gap-1 pl-1">
                          {subItem.path === "/procurement/quotes" && newQuoteCount > 0 && (
                            <CountBadge
                              count={newQuoteCount}
                              title={`${newQuoteCount} new quote${newQuoteCount === 1 ? "" : "s"} to price`}
                            />
                          )}
                          {subItem.path === "/procurement/requests" && newRequestCount > 0 && (
                            <CountBadge
                              count={newRequestCount}
                              title={`${newRequestCount} new product request${newRequestCount === 1 ? "" : "s"}`}
                            />
                          )}
                          {subItem.new && (
                            <span
                              className={`${
                                isActive(subItem.path)
                                  ? "menu-dropdown-badge-active"
                                  : "menu-dropdown-badge-inactive"
                              } menu-dropdown-badge`}
                            >
                              new
                            </span>
                          )}
                          {subItem.pro && (
                            <span
                              className={`${
                                isActive(subItem.path)
                                  ? "menu-dropdown-badge-active"
                                  : "menu-dropdown-badge-inactive"
                              } menu-dropdown-badge`}
                            >
                              pro
                            </span>
                          )}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );

  const sectionLabel = (text: string) => (
    <h2
      className={`mb-1.5 flex px-2.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-gray-400 ${
        !showLabels ? "lg:justify-center lg:px-0" : "justify-start"
      }`}
    >
      {showLabels ? text : <HorizontaLDots className="size-4" />}
    </h2>
  );

  return (
    <aside
      className={`fixed left-0 top-0 z-50 mt-14 flex h-screen flex-col border-r border-gray-200 bg-white text-gray-900 transition-[width,transform] duration-200 ease-out dark:border-gray-800 dark:bg-gray-900 lg:mt-0
        ${isExpanded || isMobileOpen || isHovered ? "w-[240px]" : "w-[64px]"}
        ${isMobileOpen ? "translate-x-0" : "-translate-x-full"}
        lg:translate-x-0`}
      onMouseEnter={() => !isExpanded && setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Brand — same 56px height as the header, so the two align exactly. */}
      <div
        className={`flex h-14 shrink-0 items-center border-b border-gray-200 px-3 dark:border-gray-800 ${
          !showLabels ? "lg:justify-center lg:px-0" : "justify-start"
        }`}
      >
        {/* logo.png is a square tile with a wide wordmark inside, so it only
            reads at wordmark proportions — object-cover crops the dead padding.
            Collapsed, it falls back to a monogram that stays legible at 28px. */}
        <Link to={homePath} className="flex items-center overflow-hidden">
          {showLabels ? (
            <img
              className="h-7 w-[116px] shrink-0 rounded-md object-cover"
              src="/logo.png"
              alt="Buyology"
            />
          ) : (
            <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-[#402F75] text-sm font-bold text-white">
              B
            </span>
          )}
        </Link>
      </div>

      <div className="no-scrollbar flex flex-col overflow-y-auto px-2.5 py-3">
        <nav className="flex flex-col gap-4">
          <div>
            {sectionLabel("Menu")}
            {renderMenuItems(visibleNavItems, "main")}
          </div>
          {visibleOthersItems.length > 0 && (
            <div>
              {sectionLabel("Others")}
              {renderMenuItems(visibleOthersItems, "others")}
            </div>
          )}
        </nav>
      </div>
    </aside>
  );
};

export default AppSidebar;
