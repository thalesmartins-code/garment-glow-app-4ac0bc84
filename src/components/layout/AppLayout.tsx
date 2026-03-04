import { Outlet } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { Breadcrumbs } from "./Breadcrumbs";
import { ThemeToggle } from "./ThemeToggle";

export function AppLayout() {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <main className="flex-1 flex flex-col">
          <header className="h-14 flex items-center justify-between gap-4 border-b bg-background/95 backdrop-blur-md supports-[backdrop-filter]:bg-background/60 px-4 sticky top-0 z-10 shadow-sm">
            <div className="flex items-center gap-4">
              <SidebarTrigger />
              <Breadcrumbs />
            </div>
            <div className="flex items-center gap-3">
              <ThemeToggle />
            </div>
          </header>
          <div className="flex-1 animate-fade-in">
            <Outlet />
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
