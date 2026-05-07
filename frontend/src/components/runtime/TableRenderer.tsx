"use client";

import { useCallback, useEffect, useState } from "react";
import type { RendererProps } from "./registry";
import type { EntityRecord } from "@/lib/types";
import { listEntities, deleteEntity } from "@/lib/api";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Trash2, Pencil, ArrowUpDown, Upload, ChevronLeft, ChevronRight } from "lucide-react";
import { FormRenderer } from "./FormRenderer";
import { CsvImportModal } from "@/components/csv/CsvImportModal";

export function TableRenderer({ page, config, appId }: RendererProps) {
  const entityName = page.entity;
  const entity = entityName ? config.entities[entityName] : null;

  const [records, setRecords] = useState<EntityRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [sortField, setSortField] = useState<string>("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [editRecord, setEditRecord] = useState<EntityRecord | null>(null);
  const [showCsvImport, setShowCsvImport] = useState(false);

  const fetchData = useCallback(async () => {
    if (!entityName) return;
    setLoading(true);
    setError(null);
    try {
      const result = await listEntities(appId, entityName, {
        page: currentPage,
        limit: 20,
        sort: sortField,
        order: sortOrder,
      });
      setRecords(result.data);
      setTotalPages(result.totalPages);
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to load data");
    } finally {
      setLoading(false);
    }
  }, [appId, entityName, currentPage, sortField, sortOrder]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (!entityName || !entity) {
    return (
      <Card>
        <CardContent className="p-6 text-gray-500">
          {!entityName
            ? "No entity specified for this table."
            : `Entity '${entityName}' not found in config.`}
        </CardContent>
      </Card>
    );
  }

  const columns = page.columns || Object.keys(entity.fields);
  const actions = page.actions || ["create", "edit", "delete"];

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortOrder((o) => (o === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  const handleDelete = async (record: EntityRecord) => {
    if (!confirm("Delete this record?")) return;
    try {
      const result = await deleteEntity(appId, entityName, record.id);
      const template = config.notifications.onDelete;
      toast.success(template.replace(/\{\{entity\}\}/g, entityName));
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Failed to delete");
    }
  };

  const formatValue = (value: unknown): string => {
    if (value === null || value === undefined) return "-";
    if (typeof value === "boolean") return value ? "Yes" : "No";
    return String(value);
  };

  const getLabel = (col: string) => {
    const def = entity.fields[col];
    if (def?.label) return def.label;
    return col.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase());
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>{page.name}</CardTitle>
          <div className="flex gap-2">
            {actions.includes("create") && (
              <Button size="sm" variant="outline" onClick={() => setShowCsvImport(true)}>
                <Upload className="mr-1.5 h-4 w-4" />
                Import CSV
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : error ? (
            <div className="rounded-md bg-red-50 p-4 text-red-700">
              <p>{error}</p>
              <Button size="sm" variant="outline" className="mt-2" onClick={fetchData}>
                Retry
              </Button>
            </div>
          ) : records.length === 0 ? (
            <div className="py-12 text-center text-gray-500">
              <p className="text-lg font-medium">No data yet</p>
              <p className="text-sm">Create a record or import a CSV to get started.</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {columns.map((col) => (
                        <TableHead
                          key={col}
                          className="cursor-pointer select-none"
                          onClick={() => handleSort(col)}
                        >
                          <span className="flex items-center gap-1">
                            {getLabel(col)}
                            <ArrowUpDown className="h-3.5 w-3.5 text-gray-400" />
                          </span>
                        </TableHead>
                      ))}
                      {(actions.includes("edit") || actions.includes("delete")) && (
                        <TableHead className="w-24">Actions</TableHead>
                      )}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {records.map((record) => (
                      <TableRow key={record.id}>
                        {columns.map((col) => (
                          <TableCell key={col} className="max-w-[200px] truncate">
                            {formatValue((record.data as Record<string, unknown>)[col])}
                          </TableCell>
                        ))}
                        {(actions.includes("edit") || actions.includes("delete")) && (
                          <TableCell>
                            <div className="flex gap-1">
                              {actions.includes("edit") && (
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-8 w-8"
                                  onClick={() => setEditRecord(record)}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                              )}
                              {actions.includes("delete") && (
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-8 w-8 text-red-500 hover:text-red-700"
                                  onClick={() => handleDelete(record)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              <div className="mt-4 flex items-center justify-between">
                <p className="text-sm text-gray-500">
                  Page {currentPage} of {totalPages}
                </p>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={currentPage <= 1}
                    onClick={() => setCurrentPage((p) => p - 1)}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={currentPage >= totalPages}
                    onClick={() => setCurrentPage((p) => p + 1)}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={!!editRecord} onOpenChange={() => setEditRecord(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Record</DialogTitle>
          </DialogHeader>
          {editRecord && (
            <FormRenderer
              page={{ ...page, name: "Edit", type: "form" }}
              config={config}
              appId={appId}
              editData={editRecord.data as Record<string, unknown>}
              editId={editRecord.id}
              onSuccess={() => {
                setEditRecord(null);
                fetchData();
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* CSV Import Modal */}
      <CsvImportModal
        open={showCsvImport}
        onClose={() => setShowCsvImport(false)}
        appId={appId}
        entityName={entityName}
        fields={entity.fields}
        onSuccess={fetchData}
      />
    </>
  );
}
