import { Settings as SettingsIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const Settings = () => {
  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-8">
      <div className="flex items-center gap-4">
        <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-primary shadow-glow">
          <SettingsIcon className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Configurações</h1>
          <p className="text-muted-foreground text-sm">Gerencie metas, marketplaces e preferências</p>
        </div>
      </div>

      <Card className="border border-border/50 shadow-md">
        <CardContent className="p-10 text-center">
          <div className="text-6xl mb-4">⚙️</div>
          <h3 className="text-xl font-semibold mb-2">Configurações</h3>
          <p className="text-muted-foreground">
            Configure metas de vendas, marketplaces ativos e preferências do sistema.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Settings;
