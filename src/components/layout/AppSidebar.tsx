import { LayoutDashboard, CalendarDays, TrendingUp, Upload, Settings, Users, User, Shield, ChevronLeft, ChevronRight, LogOut } from "lucide-react";
import { NavLink } from "@/components/NavLink";
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
  { title: "Configurações", url: "/configuracoes", icon: Settings },
  { title: "Sellers", url: "/sellers", icon: Users },
];

export function AppSidebar() {
  const { state, toggleSidebar } = useSidebar();
  const isCollapsed = state === "collapsed";

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="p-3 border-b border-sidebar-border bg-gradient-to-br from-primary/5 to-primary/10">
        <div className={`flex ${isCollapsed ? 'flex-col items-center gap-2' : 'items-center justify-between'}`}>
          <div className={`flex items-center gap-3 min-w-0 ${isCollapsed ? 'justify-center' : ''}`}>
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center flex-shrink-0 shadow-md transition-transform duration-300 hover:scale-105">
              <TrendingUp className="w-5 h-5 text-primary-foreground" />
            </div>
            {!isCollapsed && (
              <div className="flex flex-col animate-fade-in overflow-hidden">
                <span className="font-bold text-sm bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text truncate">Marketplace</span>
                <span className="text-xs text-muted-foreground font-medium truncate">Analytics Pro</span>
              </div>
            )}
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleSidebar}
            className="h-7 w-7 flex-shrink-0 hover:bg-sidebar-accent transition-all duration-200"
          >
            {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </Button>
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2 py-4">
        <SidebarGroup>
          {!isCollapsed && (
            <SidebarGroupLabel className="text-xs uppercase tracking-wider text-muted-foreground/70 font-semibold px-3 mb-2">
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
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 hover:bg-sidebar-accent/80 group relative ${isCollapsed ? 'justify-center' : ''}`}
                      activeClassName="bg-primary/10 text-primary font-medium shadow-sm before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:w-1 before:h-6 before:bg-primary before:rounded-full"
                    >
                      <item.icon className="h-4 w-4 flex-shrink-0 transition-transform duration-200 group-hover:scale-110" />
                      {!isCollapsed && (
                        <span className="transition-colors duration-200">{item.title}</span>
                      )}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}

              {/* Admin-only: User Management */}
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip="Usuários">
                  <NavLink
                    to="/usuarios"
                    end
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 hover:bg-sidebar-accent/80 group relative ${isCollapsed ? 'justify-center' : ''}`}
                    activeClassName="bg-primary/10 text-primary font-medium shadow-sm before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:w-1 before:h-6 before:bg-primary before:rounded-full"
                  >
                    <Shield className="h-4 w-4 flex-shrink-0 transition-transform duration-200 group-hover:scale-110" />
                    {!isCollapsed && (
                      <span className="transition-colors duration-200">Usuários</span>
                    )}
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-3 border-t border-sidebar-border mt-auto space-y-3">
        <div className={`flex items-center gap-2 ${isCollapsed ? 'justify-center' : ''}`}>
          <NavLink to="/perfil" className="flex items-center gap-2 min-w-0 hover:opacity-80 transition-opacity">
            <Avatar className="h-8 w-8 flex-shrink-0">
              <AvatarFallback className="bg-primary/10 text-primary text-xs">
                U
              </AvatarFallback>
            </Avatar>
            {!isCollapsed && (
              <div className="flex flex-col min-w-0 animate-fade-in">
                <span className="text-xs font-medium truncate">Usuário</span>
                <span className="text-[10px] text-muted-foreground capitalize">admin</span>
              </div>
            )}
          </NavLink>
          {!isCollapsed && (
            <Button variant="ghost" size="icon" className="h-7 w-7 ml-auto flex-shrink-0" title="Sair">
              <LogOut className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
