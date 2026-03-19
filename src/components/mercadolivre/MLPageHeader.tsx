import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface Props {
  title: string;
  children?: React.ReactNode;
  lastUpdated?: Date | null;
}

export function MLPageHeader({ title, children, lastUpdated }: Props) {
  const { user } = useAuth();
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

  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-2xl font-bold text-foreground">{title}</h1>
        <p className="text-sm text-muted-foreground">
          {nickname ? `Vendedor: ${nickname}` : "Mercado Livre"}
        </p>
        <p className="text-xs text-muted-foreground/70">
          {formattedDate ? `Última sinc: ${formattedDate}` : "Nunca sincronizado"}
        </p>
      </div>
      {children && <div className="flex items-center gap-2">{children}</div>}
    </div>
  );
}
