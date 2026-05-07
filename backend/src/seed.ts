import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const sampleConfigs = [
  {
    name: "Todo App",
    config: {
      appName: "Todo App",
      auth: { enabled: false },
      entities: {
        tasks: {
          fields: {
            title: { type: "string", required: true, label: "Task" },
            completed: { type: "boolean", default: false, label: "Done" },
            priority: {
              type: "string",
              enum: ["Low", "Medium", "High"],
              label: "Priority",
            },
          },
        },
      },
      pages: [
        {
          name: "Tasks",
          type: "table",
          entity: "tasks",
          columns: ["title", "priority", "completed"],
          actions: ["create", "edit", "delete"],
        },
        { name: "Add Task", type: "form", entity: "tasks", actions: ["create", "edit", "delete"] },
        {
          name: "Dashboard",
          type: "dashboard",
          widgets: [
            { type: "stat", label: "Total Tasks", entity: "tasks", operation: "count" },
          ],
          actions: ["create", "edit", "delete"],
        },
      ],
      notifications: {
        onCreate: "Task added!",
        onUpdate: "Task updated!",
        onDelete: "Task removed!",
      },
    },
  },
  {
    name: "Inventory Manager",
    config: {
      appName: "Inventory Manager",
      auth: {
        enabled: true,
        fields: [
          { name: "email", type: "email", required: true },
          { name: "password", type: "password", required: true },
        ],
        methods: ["email"],
      },
      entities: {
        products: {
          fields: {
            name: { type: "string", required: true, label: "Product Name" },
            sku: { type: "string", required: true, label: "SKU" },
            price: { type: "number", required: true, label: "Price (INR)" },
            quantity: { type: "number", default: 0, label: "Quantity" },
            category: {
              type: "string",
              enum: ["Electronics", "Clothing", "Food", "Other"],
              label: "Category",
            },
            inStock: { type: "boolean", default: true, label: "In Stock" },
          },
        },
        suppliers: {
          fields: {
            name: { type: "string", required: true, label: "Supplier Name" },
            email: { type: "email", required: true, label: "Email" },
            phone: { type: "string", label: "Phone" },
            city: { type: "string", label: "City" },
          },
        },
      },
      pages: [
        {
          name: "Products",
          type: "table",
          entity: "products",
          columns: ["name", "sku", "price", "quantity", "category"],
          actions: ["create", "edit", "delete"],
        },
        { name: "Add Product", type: "form", entity: "products", actions: ["create", "edit", "delete"] },
        { name: "Suppliers", type: "table", entity: "suppliers", actions: ["create", "edit", "delete"] },
        { name: "Add Supplier", type: "form", entity: "suppliers", actions: ["create", "edit", "delete"] },
        {
          name: "Dashboard",
          type: "dashboard",
          widgets: [
            { type: "stat", label: "Total Products", entity: "products", operation: "count" },
            { type: "stat", label: "Total Suppliers", entity: "suppliers", operation: "count" },
            { type: "stat", label: "Avg Price", entity: "products", field: "price", operation: "avg" },
          ],
          actions: ["create", "edit", "delete"],
        },
      ],
      notifications: {
        onCreate: "New {{entity}} added to inventory!",
        onUpdate: "{{entity}} record updated",
        onDelete: "{{entity}} removed from inventory",
      },
    },
  },
  {
    name: "Blog CMS",
    config: {
      appName: "Blog CMS",
      auth: {
        enabled: true,
        fields: [
          { name: "email", type: "email", required: true },
          { name: "password", type: "password", required: true },
          { name: "displayName", type: "string", required: true },
        ],
        methods: ["email"],
      },
      entities: {
        posts: {
          fields: {
            title: { type: "string", required: true, label: "Title" },
            content: { type: "text", required: true, label: "Content" },
            author: { type: "string", required: true, label: "Author" },
            category: {
              type: "string",
              enum: ["Tech", "Lifestyle", "Business", "Other"],
              label: "Category",
            },
            published: { type: "boolean", default: false, label: "Published" },
          },
        },
        comments: {
          fields: {
            postTitle: { type: "string", required: true, label: "Post" },
            commenter: { type: "string", required: true, label: "Name" },
            body: { type: "text", required: true, label: "Comment" },
            approved: { type: "boolean", default: false, label: "Approved" },
          },
        },
      },
      pages: [
        {
          name: "All Posts",
          type: "table",
          entity: "posts",
          columns: ["title", "author", "category", "published"],
          actions: ["create", "edit", "delete"],
        },
        { name: "New Post", type: "form", entity: "posts", actions: ["create", "edit", "delete"] },
        {
          name: "Comments",
          type: "table",
          entity: "comments",
          columns: ["postTitle", "commenter", "approved"],
          actions: ["create", "edit", "delete"],
        },
        {
          name: "Dashboard",
          type: "dashboard",
          widgets: [
            { type: "stat", label: "Total Posts", entity: "posts", operation: "count" },
            { type: "stat", label: "Total Comments", entity: "comments", operation: "count" },
          ],
          actions: ["create", "edit", "delete"],
        },
      ],
      notifications: {
        onCreate: "{{entity}} created!",
        onUpdate: "{{entity}} updated!",
        onDelete: "{{entity}} deleted!",
      },
    },
  },
];

async function main() {
  console.log("Seeding sample apps...");

  for (const sample of sampleConfigs) {
    const existing = await prisma.app.findFirst({ where: { name: sample.name } });
    if (existing) {
      console.log(`  Skipping "${sample.name}" (already exists)`);
      continue;
    }
    await prisma.app.create({ data: sample });
    console.log(`  Created "${sample.name}"`);
  }

  console.log("Seeding complete!");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
