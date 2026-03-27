import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useMarketplace } from "@/contexts/MarketplaceContext";
import { Layers } from "lucide-react";

interface Props {
  title: string;
  children?: React.ReactNode;
  lastUpdated?: Date | null;
}

export function MLPageHeader({ title, children, lastUpdated }: Props) {
  const { user } = useAuth();
  const { selectedMarketplace, activeMarketplace, marketplaces } = useMarketplace();
  const [nickname, setNickname] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("ml_user_cache")
      .select("nickname")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) setNickname(data.nickname);
      });
  }, [user]);

  const formattedDate = lastUpdated
    ? lastUpdated.toLocaleString("pt-BR")
    : null;

  const isAll = selectedMarketplace === "all";
  const mp = activeMarketplace;

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        {/* Marketplace icon indicator */}
        {isAll ? (
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Layers className="h-5 w-5" />
          </div>
        ) : mp ? (
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${mp.color} text-white`}
          >
            <mp.icon className="h-5 w-5" />
          </div>
        ) : null}

        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-foreground">{title}</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            {isAll ? "Todos os marketplaces" : mp?.name ?? "Marketplace"}
          </p>
          {nickname && (
            <p className="text-xs text-muted-foreground">Vendedor: {nickname}</p>
          )}
          <p className="text-xs text-muted-foreground/70">
            {formattedDate ? `Última sinc: ${formattedDate}` : "Nunca sincronizado"}
          </p>
        </div>
      </div>
      {children && <div className="flex items-center gap-2">{children}</div>}
    </div>
  );
}
