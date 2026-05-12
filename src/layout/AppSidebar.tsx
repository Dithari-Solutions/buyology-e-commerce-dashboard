import { Link, useLocation } from "react-router";
import PeopleIcon from '@mui/icons-material/People';
import CardMembershipOutlinedIcon from '@mui/icons-material/CardMembershipOutlined';
import HandshakeOutlinedIcon from '@mui/icons-material/HandshakeOutlined';
import GroupOutlinedIcon from '@mui/icons-material/GroupOutlined';
import { useCallback, useEffect, useRef, useState } from "react";
import VideoCameraBackIcon from '@mui/icons-material/VideoCameraBack';
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined';
import RateReviewOutlinedIcon from '@mui/icons-material/RateReviewOutlined';
import StorefrontOutlinedIcon from '@mui/icons-material/StorefrontOutlined';
import TwoWheelerOutlinedIcon from '@mui/icons-material/TwoWheelerOutlined';
import ShoppingCartOutlinedIcon from '@mui/icons-material/ShoppingCartOutlined';
import ReceiptLongOutlinedIcon from '@mui/icons-material/ReceiptLongOutlined';

// Assume these icons are imported from an icon library
import {
  BoxCubeIcon,
  CalenderIcon,
  ChevronDownIcon,
  GridIcon,
  HorizontaLDots,
  PageIcon,
  PieChartIcon,
  PlugInIcon,
  ShootingStarIcon,
  UserCircleIcon,
} from "../icons";
import { useSidebar } from "../context/SidebarContext";
import { isPureSupplier, landingPathForCurrentUser } from "../auth/roles";

type NavArea = "admin" | "supplier" | "shared";

type NavItem = {
  name: string;
  icon: React.ReactNode;
  path?: string;
  /** Which role area this item belongs to. Defaults to "admin". */
  area?: NavArea;
  subItems?: { name: string; path: string; pro?: boolean; new?: boolean }[];
};

const navItems: NavItem[] = [
  {
    icon: <GridIcon />,
    name: "Dashboard",
    subItems: [{ name: "Ecommerce", path: "/", pro: false }],
  },
  {
    icon: <CalenderIcon />,
    name: "Calendar",
    path: "/calendar",
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
    subItems: [
      { name: "Promo Codes", path: "/promo-codes", pro: false },
      { name: "Newsletter", path: "/newsletter", pro: false },
    ],
  },
  {
    name: "Admins",
    icon: <PeopleIcon />,
    subItems: [
      { name: "All Admins", path: "/admin/admins", pro: false },
    ],
  },
  {
    name: "Users",
    icon: <GroupOutlinedIcon />,
    subItems: [
      { name: "All Users", path: "/admin/users", pro: false },
    ],
  },
  {
    name: "Product",
    icon: <Inventory2OutlinedIcon />,
    subItems: [
      { name: "Products", path: "/products", pro: false },
      { name: "New Product", path: "/new-product", pro: false },
      { name: "Categories", path: "/categories", pro: false },
      { name: "Brands", path: "/brands", pro: false },
      { name: "Spec Library", path: "/specs", pro: false },
      { name: "Trash", path: "/products/trash", pro: false }
    ],
  },
  {
    name: "Story",
    icon: <VideoCameraBackIcon />,
    subItems: [
      { name: "Stories", path: "/stories", pro: false },
      { name: "New Story", path: "/new-story", pro: false }
    ],
  },
  {
    name: "Store",
    icon: <StorefrontOutlinedIcon />,
    subItems: [
      { name: "Stores", path: "/stores", pro: false },
      { name: "New Store", path: "/stores/new", pro: false },
      { name: "Countries", path: "/countries", pro: false },
    ],
  },
  {
    name: "Orders",
    icon: <ShoppingCartOutlinedIcon />,
    path: "/orders",
  },
  {
    name: "Refunds",
    icon: <ReceiptLongOutlinedIcon />,
    path: "/refunds",
  },
  {
    name: "Payouts",
    icon: <ReceiptLongOutlinedIcon />,
    path: "/payouts",
  },
  {
    name: "Couriers",
    icon: <TwoWheelerOutlinedIcon />,
    subItems: [
      { name: "All Couriers", path: "/admin/couriers", pro: false },
      { name: "New Courier", path: "/admin/couriers/new", pro: false },
      { name: "Fleet Map", path: "/admin/couriers/map", pro: false },
    ],
  },
  {
    name: "Reviews & Q&A",
    icon: <RateReviewOutlinedIcon />,
    subItems: [
      { name: "Reviews", path: "/reviews", pro: false },
      { name: "Questions", path: "/questions", pro: false },
    ],
  },
  {
    name: "Pages",
    icon: <PageIcon />,
    subItems: [
      { name: "Blank Page", path: "/blank", pro: false },
      { name: "404 Error", path: "/error-404", pro: false },
    ],
  },
  {
    name: "B2B Membership",
    icon: <CardMembershipOutlinedIcon />,
    subItems: [
      { name: "Applications", path: "/b2b-membership", pro: false },
      { name: "Inquiries (Legacy)", path: "/b2b-inquiries", pro: false },
    ],
  },
  {
    name: "Suppliers",
    icon: <HandshakeOutlinedIcon />,
    subItems: [
      { name: "Applications", path: "/suppliers", pro: false },
      { name: "Products Review", path: "/supplier-products", pro: false },
    ],
  },
  {
    name: "My Supplier Portal",
    icon: <HandshakeOutlinedIcon />,
    area: "supplier",
    subItems: [
      { name: "My Products", path: "/supplier/my-products", pro: false },
      { name: "Add Product", path: "/supplier/new-product", pro: false },
      { name: "Analytics", path: "/supplier/analytics", pro: false },
      { name: "Account", path: "/supplier/account", pro: false },
      { name: "Reviews", path: "/supplier/reviews", pro: false },
    ],
  },
];

const othersItems: NavItem[] = [
  {
    icon: <PieChartIcon />,
    name: "Charts",
    subItems: [
      { name: "Line Chart", path: "/line-chart", pro: false },
      { name: "Bar Chart", path: "/bar-chart", pro: false },
    ],
  },
  {
    icon: <BoxCubeIcon />,
    name: "UI Elements",
    subItems: [
      { name: "Alerts", path: "/alerts", pro: false },
      { name: "Avatar", path: "/avatars", pro: false },
      { name: "Badge", path: "/badge", pro: false },
      { name: "Buttons", path: "/buttons", pro: false },
      { name: "Images", path: "/images", pro: false },
      { name: "Videos", path: "/videos", pro: false },
    ],
  },
  {
    icon: <PlugInIcon />,
    name: "Authentication",
    subItems: [
      { name: "Sign In", path: "/signin", pro: false },
      { name: "Sign Up", path: "/signup", pro: false },
    ],
  },
];

const AppSidebar: React.FC = () => {
  const { isExpanded, isMobileOpen, isHovered, setIsHovered } = useSidebar();
  const location = useLocation();

  const supplierOnly = isPureSupplier();
  const homePath = landingPathForCurrentUser();
  const filterByRole = useCallback(
    (items: NavItem[]) =>
      items.filter((item) => {
        const area: NavArea = item.area ?? "admin";
        if (area === "shared") return true;
        return supplierOnly ? area === "supplier" : area === "admin";
      }),
    [supplierOnly]
  );
  const visibleNavItems = filterByRole(navItems);
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
  }, [openSubmenu]);

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
              {(isExpanded || isHovered || isMobileOpen) && (
                <ChevronDownIcon
                  className={`ml-auto w-5 h-5 transition-transform duration-200 ${
                    openSubmenu?.type === menuType &&
                    openSubmenu?.index === index
                      ? "rotate-180 text-brand-500"
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
              <ul className="mt-2 space-y-1 ml-9">
                {nav.subItems.map((subItem) => (
                  <li key={subItem.name}>
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
            <>
              <img
                className="dark:hidden rounded-full"
                src="/logo.png"
                alt="Logo"
                width={90}
                height={40}
              />
              <img
                className="hidden dark:block rounded-full"
                src="/logo.png"
                alt="Logo"
                width={90}
                height={40}
              />
            </>
          ) : (
            <img
            className=" rounded-full"
              src="/logo.png"
              alt="Logo"
              width={32}
              height={32}
            />
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
