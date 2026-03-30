import { useState, useCallback } from "react";
import { Upload, FileText, FileSpreadsheet, X, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getFileType } from "@/utils/csvParser";

interface Props {
  marketplaceLabel: string;
  selectedFile: File | null;
  parseError: string | null;
  onFile: (file: File) => void;
  onClear: () => void;
}

export function FileUploadCard({ marketplaceLabel, selectedFile, parseError, onFile, onClear }: Props) {
  const [isDragging, setIsDragging] = useState(false);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files.length > 0) onFile(e.dataTransfer.files[0]);
  }, [onFile]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) onFile(e.target.files[0]);
  }, [onFile]);

  const isExcel = selectedFile && getFileType(selectedFile.name) === "excel";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Upload className="w-5 h-5" />
          Upload — {marketplaceLabel}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!selectedFile ? (
          <label
            className={cn(
              "flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-lg cursor-pointer transition-colors",
              isDragging ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50"
            )}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}
            onDrop={handleDrop}
          >
            <Upload className={cn("w-10 h-10 mb-3", isDragging ? "text-primary" : "text-muted-foreground")} />
            <p className="mb-2 text-sm text-muted-foreground">
              <span className="font-semibold">Clique para selecionar</span> ou arraste o arquivo
            </p>
            <p className="text-xs text-muted-foreground/70">CSV ou Excel (.xlsx, .xls)</p>
            <input type="file" className="hidden" accept=".csv,.xlsx,.xls" onChange={handleInputChange} />
          </label>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 border border-muted rounded-lg bg-muted/30">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  {isExcel ? <FileSpreadsheet className="w-6 h-6 text-primary" /> : <FileText className="w-6 h-6 text-primary" />}
                </div>
                <div>
                  <p className="text-sm font-medium">{selectedFile.name}</p>
                  <p className="text-xs text-muted-foreground">{(selectedFile.size / 1024).toFixed(2)} KB</p>
                </div>
              </div>
              <button onClick={onClear} className="p-1 hover:bg-muted rounded-full transition-colors">
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>

            {parseError && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {parseError}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
