import { SidebarProvider, useSidebar } from "../context/SidebarContext";
import { Outlet } from "react-router";
import AppHeader from "./AppHeader";
import Backdrop from "./Backdrop";
import AppSidebar from "./AppSidebar";

const LayoutContent: React.FC = () => {
  const { isExpanded, isHovered, isMobileOpen } = useSidebar();

  return (
    // The page surface is the purple sidebar colour; the routed page floats on top of it
    // as an inset, rounded panel (padding on this column, never margin — a margin here
    // would fight the lg:ml-* the sidebar offset relies on).
    <div className="min-h-screen bg-buyology-950 xl:flex">
      <div>
        <AppSidebar />
        <Backdrop />
      </div>
      <div
        className={`flex-1 transition-all duration-300 ease-in-out lg:p-3 ${
          isExpanded || isHovered ? "lg:ml-[290px]" : "lg:ml-[90px]"
        } ${isMobileOpen ? "ml-0" : ""}`}
      >
        {/* No overflow-hidden here: it would turn the panel into a scroll container and
            break the sticky header. The header rounds its own top corners instead. */}
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 lg:min-h-[calc(100vh-1.5rem)] lg:rounded-[20px] lg:shadow-2xl lg:shadow-black/30">
          <AppHeader />
          <div className="p-4 mx-auto max-w-(--breakpoint-2xl) md:p-6">
            <Outlet />
          </div>
        </div>
      </div>
    </div>
  );
};

const AppLayout: React.FC = () => {
  return (
    <SidebarProvider>
      <LayoutContent />
    </SidebarProvider>
  );
};

export default AppLayout;
