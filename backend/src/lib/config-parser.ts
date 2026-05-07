import { z } from "zod";

// Field definition schema
const fieldSchema = z.object({
  type: z.string().default("string"),
  required: z.boolean().default(false),
  label: z.string().optional(),
  default: z.any().optional(),
  enum: z.array(z.string()).optional(),
  min: z.number().optional(),
  max: z.number().optional(),
});

// Auth field schema
const authFieldSchema = z.object({
  name: z.string(),
  type: z.string().default("string"),
  required: z.boolean().default(false),
  enum: z.array(z.string()).optional(),
  default: z.any().optional(),
});

// Auth config schema
const authSchema = z
  .object({
    enabled: z.boolean().default(false),
    fields: z.array(authFieldSchema).default([
      { name: "email", type: "email", required: true },
      { name: "password", type: "password", required: true },
    ]),
    methods: z.array(z.string()).default(["email"]),
  })
  .default({ enabled: false });

// Widget schema
const widgetSchema = z.object({
  type: z.string().default("stat"),
  label: z.string(),
  entity: z.string(),
  field: z.string().optional(),
  operation: z.enum(["count", "avg", "sum", "min", "max"]).default("count"),
});

// Page schema
const pageSchema = z.object({
  name: z.string(),
  type: z.string().default("table"),
  entity: z.string().optional(),
  columns: z.array(z.string()).optional(),
  actions: z.array(z.string()).default(["create", "edit", "delete"]),
  widgets: z.array(widgetSchema).optional(),
});

// Notification schema
const notificationSchema = z
  .object({
    onCreate: z.string().default("{{entity}} created successfully"),
    onUpdate: z.string().default("{{entity}} updated"),
    onDelete: z.string().default("{{entity}} deleted"),
  })
  .default({});

// Entity schema
const entitySchema = z.object({
  fields: z.record(z.string(), fieldSchema).default({}),
});

// Full app config schema
export const appConfigSchema = z.object({
  appName: z.string().default("Untitled App"),
  auth: authSchema,
  entities: z.record(z.string(), entitySchema).default({}),
  pages: z.array(pageSchema).optional(),
  notifications: notificationSchema,
});

export type AppConfig = z.infer<typeof appConfigSchema>;
export type FieldDef = z.infer<typeof fieldSchema>;
export type EntityDef = z.infer<typeof entitySchema>;

/**
 * Parse and apply defaults to a raw config object.
 * Returns the validated config with all defaults applied.
 */
export function parseConfig(raw: unknown): AppConfig {
  const result = appConfigSchema.safeParse(raw ?? {});
  if (!result.success) {
    // Apply loose parsing -- try to salvage what we can
    const partial = appConfigSchema.safeParse({});
    return partial.data!;
  }

  const config = result.data;

  // Auto-generate pages if not provided
  if (!config.pages || config.pages.length === 0) {
    config.pages = [];
    for (const [entityName, entity] of Object.entries(config.entities)) {
      const columns = Object.keys(entity.fields);
      config.pages.push({
        name: capitalize(entityName),
        type: "table",
        entity: entityName,
        columns,
        actions: ["create", "edit", "delete"],
      });
      config.pages.push({
        name: `Add ${capitalize(entityName)}`,
        type: "form",
        entity: entityName,
        actions: ["create", "edit", "delete"],
      });
    }
  }

  return config;
}

/**
 * Get the label for a field. Falls back to capitalizing the field name.
 */
export function getFieldLabel(fieldName: string, fieldDef: FieldDef): string {
  if (fieldDef.label) return fieldDef.label;
  return capitalize(fieldName);
}

/**
 * Get the default value for a field type.
 */
export function getFieldDefault(fieldDef: FieldDef): unknown {
  if (fieldDef.default !== undefined) return fieldDef.default;
  switch (fieldDef.type) {
    case "number":
      return 0;
    case "boolean":
      return false;
    case "date":
      return null;
    default:
      return "";
  }
}

function capitalize(str: string): string {
  return str
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (s) => s.toUpperCase())
    .trim();
}
