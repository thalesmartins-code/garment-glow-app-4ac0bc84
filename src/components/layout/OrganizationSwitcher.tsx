import { Building2, Check, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useOrganization } from "@/contexts/OrganizationContext";

export function OrganizationSwitcher() {
  const { orgs, currentOrg, switchOrg } = useOrganization();

  if (!currentOrg) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="h-9 md:h-10 gap-2 rounded-xl border-0 bg-secondary/50 px-2 md:px-3 hover:bg-secondary"
        >
          <div className="flex h-6 w-6 md:h-7 md:w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Building2 className="h-3.5 w-3.5" />
          </div>
          <span className="hidden sm:inline text-sm font-medium text-foreground max-w-[140px] truncate">
            {currentOrg.name}
          </span>
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-60 rounded-xl p-1.5">
        <DropdownMenuLabel className="px-2 py-1.5 text-xs text-muted-foreground font-normal">
          Organização
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {orgs.map((org) => {
          const isActive = org.id === currentOrg.id;
          return (
            <DropdownMenuItem
              key={org.id}
              onClick={() => switchOrg(org.id)}
              className={`cursor-pointer gap-2.5 rounded-lg px-2 py-2 hover:bg-muted focus:bg-muted ${isActive ? "bg-muted" : ""}`}
            >
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Building2 className="h-3.5 w-3.5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm truncate ${isActive ? "font-semibold" : "font-medium"}`}>{org.name}</p>
                <p className="text-[11px] text-muted-foreground capitalize">{org.role}</p>
              </div>
              {isActive && <Check className="h-4 w-4 shrink-0 text-accent" />}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}