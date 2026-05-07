"use client";

import { useState, useCallback } from "react";
import Papa from "papaparse";
import type { FieldDef } from "@/lib/types";
import { importCsv } from "@/lib/api";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Upload, Loader2 } from "lucide-react";

interface CsvImportModalProps {
  open: boolean;
  onClose: () => void;
  appId: string;
  entityName: string;
  fields: Record<string, FieldDef>;
  onSuccess: () => void;
}

type Step = "upload" | "mapping" | "preview" | "result";

export function CsvImportModal({
  open,
  onClose,
  appId,
  entityName,
  fields,
  onSuccess,
}: CsvImportModalProps) {
  const [step, setStep] = useState<Step>("upload");
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvRows, setCsvRows] = useState<Record<string, string>[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{
    imported: number;
    failed: number;
    errors: { row: number; message: string }[];
  } | null>(null);

  const entityFields = Object.keys(fields);

  const reset = () => {
    setStep("upload");
    setCsvHeaders([]);
    setCsvRows([]);
    setMapping({});
    setResult(null);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleFileUpload = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          if (!results.data || results.data.length === 0) {
            toast.error("CSV file is empty");
            return;
          }

          const headers = results.meta.fields || [];
          const rows = results.data as Record<string, string>[];

          if (rows.length > 1000) {
            toast.warning(`CSV has ${rows.length} rows. Only first 1000 will be imported.`);
          }

          setCsvHeaders(headers);
          setCsvRows(rows.slice(0, 1000));

          // Auto-match headers to fields (case-insensitive)
          const autoMapping: Record<string, string> = {};
          for (const header of headers) {
            const match = entityFields.find(
              (f) => f.toLowerCase() === header.toLowerCase()
            );
            if (match) autoMapping[header] = match;
          }
          setMapping(autoMapping);
          setStep("mapping");
        },
        error: () => {
          toast.error("Failed to parse CSV file");
        },
      });
    },
    [entityFields]
  );

  const handleImport = async () => {
    setImporting(true);
    try {
      // Map CSV rows to entity fields
      const mappedRows = csvRows.map((row) => {
        const mapped: Record<string, unknown> = {};
        for (const [csvCol, entityField] of Object.entries(mapping)) {
          if (entityField && entityField !== "_skip") {
            let value: unknown = row[csvCol];
            // Type coercion
            const fieldDef = fields[entityField];
            if (fieldDef?.type === "number") {
              value = parseFloat(String(value)) || 0;
            } else if (fieldDef?.type === "boolean") {
              value = ["true", "1", "yes"].includes(
                String(value).toLowerCase()
              );
            }
            mapped[entityField] = value;
          }
        }
        return mapped;
      });

      const res = await importCsv(appId, entityName, mappedRows);
      setResult(res);
      setStep("result");

      if (res.imported > 0) {
        toast.success(`Imported ${res.imported} records`);
        onSuccess();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Import failed");
    } finally {
      setImporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import CSV - {entityName}</DialogTitle>
        </DialogHeader>

        {step === "upload" && (
          <div className="flex flex-col items-center gap-4 py-8">
            <div className="rounded-lg border-2 border-dashed border-gray-300 p-8 text-center">
              <Upload className="mx-auto h-10 w-10 text-gray-400" />
              <p className="mt-2 text-sm text-gray-600">
                Upload a CSV file to import data
              </p>
              <input
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                className="mt-4"
              />
            </div>
          </div>
        )}

        {step === "mapping" && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Map CSV columns to entity fields. {csvRows.length} rows detected.
            </p>
            <div className="space-y-3">
              {csvHeaders.map((header) => (
                <div key={header} className="flex items-center gap-3">
                  <span className="w-40 truncate text-sm font-medium">
                    {header}
                  </span>
                  <span className="text-gray-400">→</span>
                  <Select
                    value={mapping[header] || "_skip"}
                    onValueChange={(v: string | null) =>
                      setMapping((prev) => ({ ...prev, [header]: v ?? "_skip" }))
                    }
                  >
                    <SelectTrigger className="w-48">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_skip">Skip</SelectItem>
                      {entityFields.map((f) => (
                        <SelectItem key={f} value={f}>
                          {fields[f].label || f}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>

            {/* Preview first 3 rows */}
            <div className="mt-4">
              <p className="text-sm font-medium text-gray-700">Preview (first 3 rows):</p>
              <div className="mt-2 overflow-x-auto rounded border text-xs">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      {csvHeaders.map((h) => (
                        <th key={h} className="px-2 py-1 text-left">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {csvRows.slice(0, 3).map((row, i) => (
                      <tr key={i} className="border-t">
                        {csvHeaders.map((h) => (
                          <td key={h} className="px-2 py-1 max-w-[100px] truncate">
                            {row[h] || "-"}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={reset}>Back</Button>
              <Button onClick={handleImport} disabled={importing}>
                {importing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Import {csvRows.length} rows
              </Button>
            </div>
          </div>
        )}

        {step === "result" && result && (
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-lg bg-green-50 p-4 text-center">
                <p className="text-2xl font-bold text-green-700">{result.imported}</p>
                <p className="text-sm text-green-600">Imported</p>
              </div>
              <div className="rounded-lg bg-red-50 p-4 text-center">
                <p className="text-2xl font-bold text-red-700">{result.failed}</p>
                <p className="text-sm text-red-600">Failed</p>
              </div>
            </div>
            {result.errors.length > 0 && (
              <div className="max-h-40 overflow-y-auto rounded border p-2 text-xs">
                {result.errors.map((err, i) => (
                  <p key={i} className="text-red-600">
                    Row {err.row}: {err.message}
                  </p>
                ))}
              </div>
            )}
            <Button className="w-full" onClick={handleClose}>
              Done
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
