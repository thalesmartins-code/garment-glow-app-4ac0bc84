import { Outlet } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { Separator } from "@/components/ui/separator";

export function AppLayout() {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <header className="h-14 flex items-center gap-4 border-b bg-background/95 backdrop-blur-md supports-[backdrop-filter]:bg-background/60 px-6 sticky top-0 z-10 shadow-sm">
            <SidebarTrigger />
            <Separator orientation="vertical" className="h-6" />
            <div className="flex-1" />
          </header>
          <main className="flex-1 overflow-auto bg-gradient-warm">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
