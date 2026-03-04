import { Upload } from "lucide-react";

const Import = () => {
  return (
    <div className="dashboard-container">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-primary text-primary-foreground">
            <Upload className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Importação</h1>
            <p className="text-muted-foreground text-sm">Importe dados de vendas dos marketplaces</p>
          </div>
        </div>

        <div className="dashboard-section p-10 text-center">
          <div className="text-6xl mb-4">📤</div>
          <h3 className="text-xl font-semibold mb-2">Importar Dados</h3>
          <p className="text-muted-foreground">
            Faça upload de planilhas com dados de vendas para alimentar o dashboard.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Import;
