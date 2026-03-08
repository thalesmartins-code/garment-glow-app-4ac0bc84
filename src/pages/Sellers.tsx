import { useState } from "react";
import { Store, Plus, Pencil, Trash2, Check, X, ShoppingBag, Power } from "lucide-react";
import { useSeller } from "@/contexts/SellerContext";
import { ALL_MARKETPLACES } from "@/types/seller";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export default function Sellers() {
  const { sellers, addSeller, updateSeller, deleteSeller, toggleSellerActive, selectedSeller, setSelectedSeller } = useSeller();
  const { toast } = useToast();

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingSellerId, setEditingSellerId] = useState<string | null>(null);
  
  // Form state
  const [formName, setFormName] = useState("");
  const [formMarketplaces, setFormMarketplaces] = useState<string[]>([]);

  const resetForm = () => {
    setFormName("");
    setFormMarketplaces([]);
  };

  const openEditDialog = (sellerId: string) => {
    const seller = sellers.find((s) => s.id === sellerId);
    if (seller) {
      setFormName(seller.name);
      setFormMarketplaces([...seller.activeMarketplaces]);
      setEditingSellerId(sellerId);
    }
  };

  const closeEditDialog = () => {
    setEditingSellerId(null);
    resetForm();
  };

  const handleAddSeller = () => {
    if (!formName.trim()) {
      toast({
        title: "Nome obrigatório",
        description: "Por favor, informe o nome do seller.",
        variant: "destructive",
      });
      return;
    }

    if (formMarketplaces.length === 0) {
      toast({
        title: "Selecione marketplaces",
        description: "Selecione pelo menos um marketplace ativo.",
        variant: "destructive",
      });
      return;
    }

    const newSeller = addSeller(formName.trim(), formMarketplaces);
    toast({
      title: "Seller criado",
      description: `${newSeller.name} foi adicionado com sucesso.`,
    });
    setIsAddDialogOpen(false);
    resetForm();
  };

  const handleUpdateSeller = () => {
    if (!editingSellerId) return;

    if (!formName.trim()) {
      toast({
        title: "Nome obrigatório",
        description: "Por favor, informe o nome do seller.",
        variant: "destructive",
      });
      return;
    }

    if (formMarketplaces.length === 0) {
      toast({
        title: "Selecione marketplaces",
        description: "Selecione pelo menos um marketplace ativo.",
        variant: "destructive",
      });
      return;
    }

    updateSeller(editingSellerId, {
      name: formName.trim(),
      activeMarketplaces: formMarketplaces,
    });

    toast({
      title: "Seller atualizado",
      description: "As alterações foram salvas com sucesso.",
    });
    closeEditDialog();
  };

  const handleDeleteSeller = (sellerId: string) => {
    const seller = sellers.find((s) => s.id === sellerId);
    const success = deleteSeller(sellerId);
    
    if (success) {
      toast({
        title: "Seller removido",
        description: `${seller?.name} foi removido com sucesso.`,
      });
    } else {
      toast({
        title: "Não é possível remover",
        description: "Deve haver pelo menos um seller no sistema.",
        variant: "destructive",
      });
    }
  };

  const toggleMarketplace = (marketplaceId: string) => {
    setFormMarketplaces((prev) =>
      prev.includes(marketplaceId)
        ? prev.filter((id) => id !== marketplaceId)
        : [...prev, marketplaceId]
    );
  };

  const SellerForm = () => (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="seller-name">Nome do Seller</Label>
        <Input
          id="seller-name"
          value={formName}
          onChange={(e) => setFormName(e.target.value)}
          placeholder="Ex: Minha Loja SP"
        />
      </div>

      <div className="space-y-2">
        <Label className="flex items-center gap-1.5">
          <ShoppingBag className="h-4 w-4 text-muted-foreground" />
          Marketplaces Ativos
        </Label>
        <div className="grid grid-cols-2 gap-2">
          {ALL_MARKETPLACES.map((mp) => (
            <div
              key={mp.id}
              className="flex items-center space-x-2 p-2 rounded-md border hover:bg-accent cursor-pointer"
              onClick={() => toggleMarketplace(mp.id)}
            >
              <Checkbox
                id={`mp-${mp.id}`}
                checked={formMarketplaces.includes(mp.id)}
                onCheckedChange={() => toggleMarketplace(mp.id)}
              />
              <label
                htmlFor={`mp-${mp.id}`}
                className="flex items-center gap-2 text-sm cursor-pointer flex-1"
              >
                <span>{mp.logo}</span>
                <span>{mp.name}</span>
              </label>
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          {formMarketplaces.length} de {ALL_MARKETPLACES.length} selecionados
        </p>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
        {/* Action Bar */}
        <div className="flex justify-end">
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetForm}>
                <Plus className="h-4 w-4 mr-2" />
                Novo Seller
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Novo Seller</DialogTitle>
                <DialogDescription>
                  Adicione um novo seller ao sistema e defina seus marketplaces ativos.
                </DialogDescription>
              </DialogHeader>
              <SellerForm />
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleAddSeller}>
                  <Check className="h-4 w-4 mr-2" />
                  Criar Seller
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Sellers Grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sellers.map((seller) => (
            <Card
              key={seller.id}
              className={`relative transition-all ${
                !seller.isActive ? "opacity-60" : ""
              } ${
                selectedSeller.id === seller.id
                  ? "ring-2 ring-primary"
                  : ""
              }`}
            >
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      seller.isActive ? "bg-primary/10" : "bg-muted"
                    }`}>
                      <span className={`text-sm font-bold ${
                        seller.isActive ? "text-primary" : "text-muted-foreground"
                      }`}>{seller.initials}</span>
                    </div>
                    <div>
                      <CardTitle className="text-lg">{seller.name}</CardTitle>
                      <CardDescription className="text-xs">
                        {seller.activeMarketplaces.filter(id => id !== "total").length} marketplaces ativos
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className={`h-8 w-8 ${
                            seller.isActive 
                              ? "text-success hover:text-success hover:bg-success/10" 
                              : "text-muted-foreground hover:text-foreground"
                          }`}
                          onClick={() => toggleSellerActive(seller.id)}
                        >
                          <Power className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        {seller.isActive ? "Desativar seller" : "Ativar seller"}
                      </TooltipContent>
                    </Tooltip>
                    {selectedSeller.id === seller.id && (
                      <div className="px-2 py-1 bg-primary/10 text-primary text-xs font-medium rounded">
                        Selecionado
                      </div>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex flex-wrap gap-1">
                  {seller.activeMarketplaces.map((mpId) => {
                    const mp = ALL_MARKETPLACES.find((m) => m.id === mpId);
                    return mp ? (
                      <span
                        key={mpId}
                        className="inline-flex items-center gap-1 px-2 py-0.5 bg-muted rounded text-xs"
                        title={mp.name}
                      >
                        {mp.logo}
                      </span>
                    ) : null;
                  })}
                </div>

                <div className="flex gap-2 pt-2 border-t">
                  {selectedSeller.id !== seller.id && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => setSelectedSeller(seller.id)}
                    >
                      Selecionar
                    </Button>
                  )}
                  
                  <Dialog
                    open={editingSellerId === seller.id}
                    onOpenChange={(open) => {
                      if (open) {
                        openEditDialog(seller.id);
                      } else {
                        closeEditDialog();
                      }
                    }}
                  >
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm">
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Editar Seller</DialogTitle>
                        <DialogDescription>
                          Atualize as informações do seller.
                        </DialogDescription>
                      </DialogHeader>
                      <SellerForm />
                      <DialogFooter>
                        <Button variant="outline" onClick={closeEditDialog}>
                          Cancelar
                        </Button>
                        <Button onClick={handleUpdateSeller}>
                          <Check className="h-4 w-4 mr-2" />
                          Salvar
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>

                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        disabled={sellers.length <= 1}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Remover Seller?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Esta ação irá remover <strong>{seller.name}</strong> e todos os seus dados.
                          Esta ação não pode ser desfeita.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDeleteSeller(seller.id)}
                          className="bg-destructive hover:bg-destructive/90"
                        >
                          Remover
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
    </div>
  );
}
