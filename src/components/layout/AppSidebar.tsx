import { LayoutDashboard, CalendarDays, TrendingUp, Upload, Settings, Users, User, ChevronLeft, ChevronRight, LogOut } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const menuItems = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Vendas Diárias", url: "/vendas-diarias", icon: CalendarDays },
  { title: "Importação", url: "/importacao", icon: Upload },
  { title: "Sellers", url: "/sellers", icon: Users },
  { title: "Configurações", url: "/configuracoes", icon: Settings },
];

export function AppSidebar() {
  const { state, toggleSidebar } = useSidebar();
  const isCollapsed = state === "collapsed";

  return (
    <Sidebar collapsible="icon" className="border-r-0">
      <SidebarHeader className="p-4 border-b border-white/10">
        <div className={`flex ${isCollapsed ? 'flex-col items-center gap-2' : 'items-center justify-between'}`}>
          <div className={`flex items-center gap-3 min-w-0 ${isCollapsed ? 'justify-center' : ''}`}>
            <div className="w-10 h-10 rounded-xl bg-gradient-primary flex items-center justify-center flex-shrink-0 shadow-glow transition-transform duration-300 hover:scale-105">
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
            {!isCollapsed && (
              <div className="flex flex-col overflow-hidden">
                <span className="font-semibold text-base tracking-tight text-sidebar-foreground truncate">Marketplace</span>
                <span className="text-xs text-sidebar-foreground/60 font-medium truncate">Analytics Pro</span>
              </div>
            )}
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleSidebar}
            className="h-7 w-7 flex-shrink-0 text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-white/10"
          >
            {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </Button>
        </div>
      </SidebarHeader>

      <SidebarContent className="px-3 py-5">
        <SidebarGroup>
          {!isCollapsed && (
            <SidebarGroupLabel className="text-[11px] uppercase tracking-widest text-sidebar-foreground/40 font-semibold px-3 mb-3">
              Menu Principal
            </SidebarGroupLabel>
          )}
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild tooltip={item.title}>
                    <NavLink
                      to={item.url}
                      end
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground ${isCollapsed ? 'justify-center' : ''}`}
                      activeClassName="bg-sidebar-primary text-sidebar-primary-foreground shadow-glow"
                    >
                      <item.icon className="h-5 w-5 flex-shrink-0" />
                      {!isCollapsed && <span className="font-medium text-sm">{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-3 border-t border-white/10 mt-auto">
        <div className={`flex items-center gap-3 px-2 py-2 ${isCollapsed ? 'justify-center' : ''}`}>
          <NavLink to="/perfil" className="flex items-center gap-3 min-w-0 hover:opacity-80 transition-opacity">
            <Avatar className="h-8 w-8 flex-shrink-0">
              <AvatarFallback className="bg-sidebar-primary/30 text-sidebar-foreground text-xs font-semibold">
                U
              </AvatarFallback>
            </Avatar>
            {!isCollapsed && (
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-medium text-sidebar-foreground truncate">Usuário</span>
                <span className="text-[10px] text-sidebar-foreground/50">Administrador</span>
              </div>
            )}
          </NavLink>
          {!isCollapsed && (
            <Button variant="ghost" size="icon" className="h-7 w-7 ml-auto flex-shrink-0 text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-white/10" title="Sair">
              <LogOut className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
