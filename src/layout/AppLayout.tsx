import { SidebarProvider, useSidebar } from "../context/SidebarContext";
import { Outlet } from "react-router";
import AppHeader from "./AppHeader";
import Backdrop from "./Backdrop";
import AppSidebar from "./AppSidebar";

/**
 * Brand wash behind the whole app — two soft radial glows in the Buyology
 * palette (Mikado Yellow up top, American Blue down the left) over a neutral
 * base. It sits behind every page at low opacity, so cards keep their contrast
 * while the shell stops reading as plain grey.
 */
const BrandBackdrop = () => (
  <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
    <div className="absolute inset-0 bg-gray-50 dark:bg-gray-950" />
    <div className="absolute -right-56 -top-64 size-[46rem] rounded-full bg-buyology-yellow-500/[0.10] blur-[110px] dark:bg-buyology-yellow-500/[0.06]" />
    <div className="absolute -bottom-72 -left-40 size-[42rem] rounded-full bg-buyology-500/[0.10] blur-[110px] dark:bg-buyology-500/[0.13]" />
  </div>
);

const LayoutContent: React.FC = () => {
  const { isExpanded, isHovered, isMobileOpen } = useSidebar();

  return (
    <div className="min-h-screen xl:flex">
      <BrandBackdrop />
      <div>
        <AppSidebar />
        <Backdrop />
      </div>
      <div
        className={`flex min-h-screen flex-1 flex-col transition-all duration-300 ease-in-out ${
          isExpanded || isHovered ? "lg:ml-[290px]" : "lg:ml-[90px]"
        } ${isMobileOpen ? "ml-0" : ""}`}
      >
        <AppHeader />
        <main className="mx-auto w-full max-w-(--breakpoint-2xl) flex-1 p-4 md:p-6">
          <Outlet />
        </main>
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
