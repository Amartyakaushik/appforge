"use client";

import { useState } from "react";
import type { RendererProps } from "./registry";
import type { FieldDef } from "@/lib/types";
import { createEntity, updateEntity } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Loader2, Save, PlusCircle, FileText } from "lucide-react";

function getFieldLabel(name: string, def: FieldDef): string {
  if (def.label) return def.label;
  return name.replace(/([A-Z])/g, " $1").replace(/_/g, " ").replace(/^./, (s) => s.toUpperCase());
}

function getDefault(def: FieldDef): unknown {
  if (def.default !== undefined) return def.default;
  switch (def.type) {
    case "number": return 0;
    case "boolean": return false;
    default: return "";
  }
}

interface FormRendererExtraProps extends RendererProps {
  editData?: Record<string, unknown>;
  editId?: string;
  onSuccess?: () => void;
}

export function FormRenderer({ page, config, appId, ...extra }: FormRendererExtraProps) {
  const entityName = page.entity;
  const entity = entityName ? config.entities[entityName] : null;

  const [formData, setFormData] = useState<Record<string, unknown>>(() => {
    if ((extra as any).editData) return { ...(extra as any).editData };
    if (!entity) return {};
    const defaults: Record<string, unknown> = {};
    for (const [name, def] of Object.entries(entity.fields)) {
      defaults[name] = getDefault(def);
    }
    return defaults;
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  if (!entityName || !entity) {
    return (
      <Card className="border-dashed">
        <CardContent className="p-10 text-center">
          <FileText className="mx-auto h-8 w-8 text-muted-foreground/50 mb-3" />
          <p className="text-muted-foreground">
            {!entityName ? "No entity specified for this form." : `Entity '${entityName}' not found in config.`}
          </p>
        </CardContent>
      </Card>
    );
  }

  const isEditing = !!(extra as any).editId;

  const handleChange = (field: string, value: unknown) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrors({});

    try {
      const editId = (extra as any).editId;
      if (editId) {
        await updateEntity(appId, entityName, editId, formData);
      } else {
        await createEntity(appId, entityName, formData);
      }

      const notifTemplate = editId
        ? config.notifications.onUpdate
        : config.notifications.onCreate;
      const message = notifTemplate.replace(/\{\{entity\}\}/g, entityName);
      toast.success(message);

      if (!editId) {
        const defaults: Record<string, unknown> = {};
        for (const [name, def] of Object.entries(entity.fields)) {
          defaults[name] = getDefault(def);
        }
        setFormData(defaults);
      }

      (extra as any).onSuccess?.();
    } catch (err: any) {
      const details = err.response?.data?.details;
      if (Array.isArray(details)) {
        const fieldErrors: Record<string, string> = {};
        for (const d of details) {
          fieldErrors[d] = d;
        }
        setErrors(fieldErrors);
      }
      toast.error(err.response?.data?.error || "Failed to save");
    } finally {
      setLoading(false);
    }
  };

  const fields = Object.entries(entity.fields).filter(([, def]) => def.type !== "password");

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {isEditing ? <Save className="h-5 w-5" /> : <PlusCircle className="h-5 w-5" />}
          {page.name}
        </CardTitle>
        <CardDescription>
          {isEditing ? `Update this ${entityName} record` : `Add a new ${entityName} record`}
        </CardDescription>
      </CardHeader>
      <Separator />
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid gap-5 sm:grid-cols-2">
            {fields.map(([fieldName, fieldDef]) => (
              <div
                key={fieldName}
                className={`space-y-2 ${fieldDef.type === "text" ? "sm:col-span-2" : ""}`}
              >
                <Label htmlFor={fieldName} className="text-sm font-medium">
                  {getFieldLabel(fieldName, fieldDef)}
                  {fieldDef.required && <span className="text-destructive ml-0.5">*</span>}
                </Label>

                {fieldDef.enum ? (
                  <Select
                    value={String(formData[fieldName] ?? "")}
                    onValueChange={(v: string | null) => handleChange(fieldName, v ?? "")}
                  >
                    <SelectTrigger className="h-10">
                      <SelectValue placeholder={`Select ${getFieldLabel(fieldName, fieldDef)}`} />
                    </SelectTrigger>
                    <SelectContent>
                      {fieldDef.enum.map((opt) => (
                        <SelectItem key={opt} value={opt}>
                          {opt}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : fieldDef.type === "boolean" ? (
                  <div className="flex items-center gap-3 pt-1">
                    <Switch
                      id={fieldName}
                      checked={!!formData[fieldName]}
                      onCheckedChange={(checked) => handleChange(fieldName, checked)}
                    />
                    <Label htmlFor={fieldName} className="text-sm text-muted-foreground cursor-pointer">
                      {formData[fieldName] ? "Yes" : "No"}
                    </Label>
                  </div>
                ) : fieldDef.type === "text" ? (
                  <textarea
                    id={fieldName}
                    value={String(formData[fieldName] ?? "")}
                    onChange={(e) => handleChange(fieldName, e.target.value)}
                    className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-y"
                    placeholder={`Enter ${getFieldLabel(fieldName, fieldDef).toLowerCase()}`}
                  />
                ) : (
                  <Input
                    id={fieldName}
                    type={
                      fieldDef.type === "number" ? "number"
                      : fieldDef.type === "email" ? "email"
                      : fieldDef.type === "date" ? "date"
                      : "text"
                    }
                    className="h-10"
                    value={String(formData[fieldName] ?? "")}
                    onChange={(e) =>
                      handleChange(
                        fieldName,
                        fieldDef.type === "number"
                          ? e.target.valueAsNumber || 0
                          : e.target.value
                      )
                    }
                    placeholder={`Enter ${getFieldLabel(fieldName, fieldDef).toLowerCase()}`}
                  />
                )}

                {errors[fieldName] && (
                  <p className="text-xs text-destructive">{errors[fieldName]}</p>
                )}
              </div>
            ))}
          </div>

          <Separator />

          <Button type="submit" disabled={loading} className="w-full sm:w-auto shadow-sm" size="lg">
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : isEditing ? (
              <>
                <Save className="mr-2 h-4 w-4" />
                Update Record
              </>
            ) : (
              <>
                <PlusCircle className="mr-2 h-4 w-4" />
                Create Record
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
