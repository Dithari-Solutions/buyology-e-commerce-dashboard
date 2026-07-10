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

  const renderMenuItems = (items: NavItem[], menuType: "main" | "others") => (
    <ul className="flex flex-col gap-4">
      {items.map((nav, index) => (
        <li key={nav.name}>
          {nav.subItems ? (
            <button
              onClick={() => handleSubmenuToggle(index, menuType)}
              className={`menu-item group rounded-[30px] ${
                openSubmenu?.type === menuType && openSubmenu?.index === index
                  ? "menu-item-active"
                  : "menu-item-inactive"
              } cursor-pointer ${
                !isExpanded && !isHovered
                  ? "lg:justify-center"
                  : "lg:justify-start"
              }`}
            >
              <span
                className={`menu-item-icon-size   ${
                  openSubmenu?.type === menuType && openSubmenu?.index === index
                    ? "menu-item-icon-active"
                    : "menu-item-icon-inactive"
                }`}
              >
                {nav.icon}
              </span>
              {(isExpanded || isHovered || isMobileOpen) && (
                <span className="menu-item-text rounded-[30px]">{nav.name}</span>
              )}
              {nav.name === "Procurement" && procurementNewCount > 0 && (
                <span
                  className={`flex min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-semibold leading-none text-white ${
                    isExpanded || isHovered || isMobileOpen
                      ? "relative ml-2"
                      : "absolute right-2 top-1.5"
                  }`}
                  title={`${newQuoteCount} new quote${newQuoteCount === 1 ? "" : "s"}, ${newRequestCount} new product request${newRequestCount === 1 ? "" : "s"}`}
                >
                  {procurementNewCount > 99 ? "99+" : procurementNewCount}
                  <span className="absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75 animate-ping" />
                </span>
              )}
              {(isExpanded || isHovered || isMobileOpen) && (
                <ChevronDownIcon
                  className={`ml-auto w-5 h-5 transition-transform duration-200 ${
                    openSubmenu?.type === menuType &&
                    openSubmenu?.index === index
                      ? "rotate-180 text-buyology-600 dark:text-buyology-300"
                      : ""
                  }`}
                />
              )}
            </button>
          ) : (
            nav.path && (
              <Link
                to={nav.path}
                className={`menu-item group rounded-[30px] ${
                  isActive(nav.path) ? "menu-item-active" : "menu-item-inactive"
                }`}
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
                {(isExpanded || isHovered || isMobileOpen) && (
                  <span className="menu-item-text">{nav.name}</span>
                )}
              </Link>
            )
          )}
          {nav.subItems && (isExpanded || isHovered || isMobileOpen) && (
            <div
              ref={(el) => {
                subMenuRefs.current[`${menuType}-${index}`] = el;
              }}
              className="overflow-hidden transition-all duration-300 rounded-[30px]"
              style={{
                height:
                  openSubmenu?.type === menuType && openSubmenu?.index === index
                    ? `${subMenuHeight[`${menuType}-${index}`]}px`
                    : "0px",
              }}
            >
              <ul className="mt-2 ml-9">
                {nav.subItems.map((subItem, subIndex, subArr) => (
                  <li key={subItem.name} className="relative pl-5">
                    {/* Tree connectors — rounded yellow branch + continuous trunk (elbow on the last item) */}
                    <span
                      aria-hidden
                      className="absolute left-0 top-0 h-1/2 w-3 rounded-bl-[12px] border-b-2 border-l-2 border-[#FBBB14]"
                    />
                    {subIndex !== subArr.length - 1 && (
                      <span aria-hidden className="absolute left-0 top-1/2 bottom-0 w-0.5 bg-[#FBBB14]" />
                    )}
                    <Link
                      to={subItem.path}
                      className={`menu-dropdown-item rounded-[30px] ${
                        isActive(subItem.path)
                          ? "menu-dropdown-item-active"
                          : "menu-dropdown-item-inactive"
                      }`}
                    >
                      {subItem.name}
                      <span className="flex items-center gap-1 ml-auto">
                        {subItem.path === "/procurement/quotes" && newQuoteCount > 0 && (
                          <span
                            className="flex min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-semibold leading-none text-white"
                            title={`${newQuoteCount} new quote${newQuoteCount === 1 ? "" : "s"} to price`}
                          >
                            {newQuoteCount > 99 ? "99+" : newQuoteCount}
                          </span>
                        )}
                        {subItem.path === "/procurement/requests" && newRequestCount > 0 && (
                          <span
                            className="flex min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-semibold leading-none text-white"
                            title={`${newRequestCount} new product request${newRequestCount === 1 ? "" : "s"}`}
                          >
                            {newRequestCount > 99 ? "99+" : newRequestCount}
                          </span>
                        )}
                        {subItem.new && (
                          <span
                            className={`ml-auto ${
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
                            className={`ml-auto ${
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
      ))}
    </ul>
  );

  return (
    <aside
      className={`fixed mt-16 flex flex-col lg:mt-0 top-0 px-5 left-0 bg-white dark:bg-gray-900 dark:border-gray-800 text-gray-900 h-screen transition-all duration-300 ease-in-out z-50 border-r border-gray-200 
        ${
          isExpanded || isMobileOpen
            ? "w-[290px]"
            : isHovered
            ? "w-[290px]"
            : "w-[90px]"
        }
        ${isMobileOpen ? "translate-x-0" : "-translate-x-full"}
        lg:translate-x-0`}
      onMouseEnter={() => !isExpanded && setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div
        className={`py-8 flex ${
          !isExpanded && !isHovered ? "lg:justify-center" : "justify-start"
        }`}
      >
        <Link to={homePath}>
          {isExpanded || isHovered || isMobileOpen ? (
            <div className="flex items-center gap-3">
              <img
                className="rounded-full"
                src="/logo.png"
                alt="Logo"
                width={90}
                height={40}
              />
              <span className="text-xl font-bold tracking-tight text-brand-500 dark:text-white">
                Buyology
              </span>
            </div>
          ) : (
            <div>
              <img
            className=" rounded-full"
              src="/logo.png"
              alt="Logo"
              width={32}
              height={32}
            />
            </div>
          )}
        </Link>
      </div>
      <div className="flex flex-col overflow-y-auto duration-300 ease-linear no-scrollbar">
        <nav className="mb-6">
          <div className="flex flex-col gap-4">
            <div>
              <h2
                className={`mb-4 text-xs uppercase flex leading-[20px] text-gray-400 ${
                  !isExpanded && !isHovered
                    ? "lg:justify-center"
                    : "justify-start"
                }`}
              >
                {isExpanded || isHovered || isMobileOpen ? (
                  "Menu"
                ) : (
                  <HorizontaLDots className="size-6" />
                )}
              </h2>
              {renderMenuItems(visibleNavItems, "main")}
            </div>
            {visibleOthersItems.length > 0 && (
              <div className="">
                <h2
                  className={`mb-4 text-xs uppercase flex leading-[20px] text-gray-400 ${
                    !isExpanded && !isHovered
                      ? "lg:justify-center"
                      : "justify-start"
                  }`}
                >
                  {isExpanded || isHovered || isMobileOpen ? (
                    "Others"
                  ) : (
                    <HorizontaLDots />
                  )}
                </h2>
                {renderMenuItems(visibleOthersItems, "others")}
              </div>
            )}
          </div>
        </nav>
      </div>
    </aside>
  );
};

export default AppSidebar;
