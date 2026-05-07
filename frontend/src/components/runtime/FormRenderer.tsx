"use client";

import { useState } from "react";
import type { RendererProps } from "./registry";
import type { FieldDef } from "@/lib/types";
import { createEntity, updateEntity } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

function getFieldLabel(name: string, def: FieldDef): string {
  if (def.label) return def.label;
  return name.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase());
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
      <Card>
        <CardContent className="p-6 text-gray-500">
          {!entityName ? "No entity specified for this form." : `Entity '${entityName}' not found in config.`}
        </CardContent>
      </Card>
    );
  }

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
      let result;
      if (editId) {
        result = await updateEntity(appId, entityName, editId, formData);
      } else {
        result = await createEntity(appId, entityName, formData);
      }

      // Notification
      const notifTemplate = editId
        ? config.notifications.onUpdate
        : config.notifications.onCreate;
      const message = notifTemplate.replace(/\{\{entity\}\}/g, entityName);
      toast.success(message);

      // Reset form if creating
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

  return (
    <Card>
      <CardHeader>
        <CardTitle>{page.name}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {Object.entries(entity.fields).map(([fieldName, fieldDef]) => {
            if (fieldDef.type === "password") return null; // Don't show password in entity forms
            return (
              <div key={fieldName} className="space-y-1.5">
                <Label htmlFor={fieldName}>
                  {getFieldLabel(fieldName, fieldDef)}
                  {fieldDef.required && <span className="text-red-500 ml-1">*</span>}
                </Label>

                {fieldDef.enum ? (
                  <Select
                    value={String(formData[fieldName] ?? "")}
                    onValueChange={(v: string | null) => handleChange(fieldName, v ?? "")}
                  >
                    <SelectTrigger>
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
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id={fieldName}
                      checked={!!formData[fieldName]}
                      onChange={(e) => handleChange(fieldName, e.target.checked)}
                      className="h-4 w-4 rounded border-gray-300"
                    />
                    <span className="text-sm text-gray-600">
                      {formData[fieldName] ? "Yes" : "No"}
                    </span>
                  </div>
                ) : fieldDef.type === "text" ? (
                  <textarea
                    id={fieldName}
                    value={String(formData[fieldName] ?? "")}
                    onChange={(e) => handleChange(fieldName, e.target.value)}
                    className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    placeholder={getFieldLabel(fieldName, fieldDef)}
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
                    value={String(formData[fieldName] ?? "")}
                    onChange={(e) =>
                      handleChange(
                        fieldName,
                        fieldDef.type === "number"
                          ? e.target.valueAsNumber || 0
                          : e.target.value
                      )
                    }
                    placeholder={getFieldLabel(fieldName, fieldDef)}
                  />
                )}

                {errors[fieldName] && (
                  <p className="text-sm text-red-500">{errors[fieldName]}</p>
                )}
              </div>
            );
          })}

          <Button type="submit" disabled={loading} className="w-full">
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {(extra as any).editId ? "Update" : "Create"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
