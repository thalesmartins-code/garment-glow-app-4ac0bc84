import { useMLStore } from "@/contexts/MLStoreContext";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Store } from "lucide-react";

export function MLStoreSelector() {
  const { stores, selectedStore, setSelectedStore } = useMLStore();

  if (stores.length <= 1) return null;

  return (
    <div className="flex items-center gap-2">
      <Store className="w-4 h-4 text-muted-foreground" />
      <Select value={selectedStore} onValueChange={setSelectedStore}>
        <SelectTrigger className="w-[200px] h-8 text-xs">
          <SelectValue placeholder="Selecionar loja" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todas as lojas</SelectItem>
          {stores.map((store) => (
            <SelectItem key={store.ml_user_id} value={store.ml_user_id}>
              {store.nickname || `Loja ${store.ml_user_id}`}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
