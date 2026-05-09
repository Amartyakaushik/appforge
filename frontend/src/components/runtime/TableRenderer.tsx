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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { toast } from "sonner";
import {
  Trash2,
  Pencil,
  ArrowUpDown,
  Upload,
  ChevronLeft,
  ChevronRight,
  Database,
  RefreshCw,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
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
  const [total, setTotal] = useState(0);
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
      setTotal(result.total);
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
      <Card className="border-dashed">
        <CardContent className="p-10 text-center">
          <Database className="mx-auto h-8 w-8 text-muted-foreground/50 mb-3" />
          <p className="text-muted-foreground">
            {!entityName
              ? "No entity specified for this table."
              : `Entity '${entityName}' not found in config.`}
          </p>
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
      await deleteEntity(appId, entityName, record.id);
      const template = config.notifications.onDelete;
      toast.success(template.replace(/\{\{entity\}\}/g, entityName));
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Failed to delete");
    }
  };

  const formatValue = (value: unknown): React.ReactNode => {
    if (value === null || value === undefined) return <span className="text-muted-foreground/50">-</span>;
    if (typeof value === "boolean") {
      return (
        <Badge variant={value ? "default" : "secondary"} className="text-xs font-normal">
          {value ? "Yes" : "No"}
        </Badge>
      );
    }
    if (typeof value === "number") {
      return <span className="font-mono text-sm">{value.toLocaleString()}</span>;
    }
    return String(value);
  };

  const getLabel = (col: string) => {
    const def = entity.fields[col];
    if (def?.label) return def.label;
    return col.replace(/([A-Z])/g, " $1").replace(/_/g, " ").replace(/^./, (s) => s.toUpperCase());
  };

  const SortIcon = ({ field }: { field: string }) => {
    if (sortField !== field) return <ArrowUpDown className="h-3 w-3 text-muted-foreground/40" />;
    return sortOrder === "asc"
      ? <ArrowUp className="h-3 w-3 text-primary" />
      : <ArrowDown className="h-3 w-3 text-primary" />;
  };

  return (
    <TooltipProvider>
      <Card className="shadow-sm">
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle className="text-xl">{page.name}</CardTitle>
            <CardDescription className="mt-1">
              {loading ? "Loading..." : `${total} ${total === 1 ? "record" : "records"}`}
            </CardDescription>
          </div>
          <div className="flex gap-2 shrink-0">
            <Tooltip>
              <TooltipTrigger>
                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={fetchData}>
                  <RefreshCw className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Refresh</TooltipContent>
            </Tooltip>
            {actions.includes("create") && (
              <Button size="sm" variant="outline" onClick={() => setShowCsvImport(true)} className="shadow-sm">
                <Upload className="mr-1.5 h-3.5 w-3.5" />
                Import CSV
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : error ? (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-6 text-center">
              <p className="text-destructive font-medium">{error}</p>
              <Button size="sm" variant="outline" className="mt-3" onClick={fetchData}>
                <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
                Retry
              </Button>
            </div>
          ) : records.length === 0 ? (
            <div className="rounded-lg border border-dashed py-14 text-center">
              <Database className="mx-auto h-10 w-10 text-muted-foreground/30 mb-3" />
              <p className="text-base font-medium text-muted-foreground">No data yet</p>
              <p className="text-sm text-muted-foreground/70 mt-1">Create a record or import a CSV to get started.</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50 hover:bg-muted/50">
                      {columns.map((col) => (
                        <TableHead
                          key={col}
                          className="cursor-pointer select-none text-xs font-semibold uppercase tracking-wider"
                          onClick={() => handleSort(col)}
                        >
                          <span className="flex items-center gap-1.5">
                            {getLabel(col)}
                            <SortIcon field={col} />
                          </span>
                        </TableHead>
                      ))}
                      {(actions.includes("edit") || actions.includes("delete")) && (
                        <TableHead className="w-24 text-xs font-semibold uppercase tracking-wider">Actions</TableHead>
                      )}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {records.map((record) => (
                      <TableRow key={record.id} className="group transition-colors">
                        {columns.map((col) => (
                          <TableCell key={col} className="max-w-[200px] truncate">
                            {formatValue((record.data as Record<string, unknown>)[col])}
                          </TableCell>
                        ))}
                        {(actions.includes("edit") || actions.includes("delete")) && (
                          <TableCell>
                            <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                              {actions.includes("edit") && (
                                <Tooltip>
                                  <TooltipTrigger>
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      className="h-7 w-7"
                                      onClick={() => setEditRecord(record)}
                                    >
                                      <Pencil className="h-3.5 w-3.5" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Edit</TooltipContent>
                                </Tooltip>
                              )}
                              {actions.includes("delete") && (
                                <Tooltip>
                                  <TooltipTrigger>
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                                      onClick={() => handleDelete(record)}
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Delete</TooltipContent>
                                </Tooltip>
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
                <p className="text-sm text-muted-foreground">
                  Page {currentPage} of {totalPages}
                </p>
                <div className="flex items-center gap-1">
                  <Button
                    size="icon"
                    variant="outline"
                    className="h-8 w-8"
                    disabled={currentPage <= 1}
                    onClick={() => setCurrentPage((p) => p - 1)}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  {[...Array(Math.min(totalPages, 5))].map((_, i) => {
                    const pageNum = i + 1;
                    return (
                      <Button
                        key={pageNum}
                        size="icon"
                        variant={currentPage === pageNum ? "default" : "outline"}
                        className="h-8 w-8 text-xs"
                        onClick={() => setCurrentPage(pageNum)}
                      >
                        {pageNum}
                      </Button>
                    );
                  })}
                  <Button
                    size="icon"
                    variant="outline"
                    className="h-8 w-8"
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
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
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
    </TooltipProvider>
  );
}
