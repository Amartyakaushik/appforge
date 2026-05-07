import { z } from "zod";
import type { FieldDef } from "./config-parser";

/**
 * Dynamically builds a Zod schema from entity field definitions.
 * Used to validate incoming entity data against the config.
 */
export function buildEntitySchema(
  fields: Record<string, FieldDef>,
  partial = false
): z.ZodObject<Record<string, z.ZodTypeAny>> {
  const shape: Record<string, z.ZodTypeAny> = {};

  for (const [fieldName, fieldDef] of Object.entries(fields)) {
    let fieldSchema: z.ZodTypeAny;

    switch (fieldDef.type) {
      case "number":
        fieldSchema = z.coerce.number();
        if (fieldDef.min !== undefined)
          fieldSchema = (fieldSchema as z.ZodNumber).min(fieldDef.min);
        if (fieldDef.max !== undefined)
          fieldSchema = (fieldSchema as z.ZodNumber).max(fieldDef.max);
        break;

      case "boolean":
        fieldSchema = z.coerce.boolean();
        break;

      case "email":
        fieldSchema = z.string().email("Invalid email format");
        break;

      case "date":
        fieldSchema = z.string(); // Accept date strings
        break;

      case "text":
        fieldSchema = z.string().max(5000);
        break;

      case "password":
        fieldSchema = z.string().min(6, "Password must be at least 6 characters");
        break;

      case "string":
      default:
        fieldSchema = z.string().max(255);
        if (fieldDef.enum && fieldDef.enum.length > 0) {
          fieldSchema = z.enum(fieldDef.enum as [string, ...string[]]);
        }
        break;
    }

    // Handle required vs optional
    if (partial || !fieldDef.required) {
      fieldSchema = fieldSchema.optional().nullable();
    }

    // Apply default if provided
    if (fieldDef.default !== undefined) {
      fieldSchema = fieldSchema.default(fieldDef.default);
    }

    shape[fieldName] = fieldSchema;
  }

  return z.object(shape).passthrough(); // passthrough allows extra fields
}

/**
 * Validate entity data against its field definitions.
 * Returns { success, data, errors }
 */
export function validateEntityData(
  fields: Record<string, FieldDef>,
  data: unknown,
  partial = false
): { success: boolean; data?: Record<string, unknown>; errors?: string[] } {
  const schema = buildEntitySchema(fields, partial);
  const result = schema.safeParse(data);

  if (result.success) {
    return { success: true, data: result.data as Record<string, unknown> };
  }

  const errors = result.error.issues.map(
    (issue) => `${issue.path.join(".")}: ${issue.message}`
  );
  return { success: false, errors };
}
