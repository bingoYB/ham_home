import type { AgentTool } from "@browser-agent-sdk/agent";
import { bookmarkStorage } from "@/lib/storage";
import type {
  CreateBookmarkInput,
  UpdateBookmarkInput,
} from "@/types";

export function createBookmarkManagementTools(): AgentTool[] {
  return [
    // ----------------------------------------------------------------------
    // Category CRUD
    // ----------------------------------------------------------------------
    {
      name: "create_category",
      description: "Create a new bookmark category.",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string" },
          icon: { type: "string", nullable: true },
          parentId: { type: "string", nullable: true },
        },
        required: ["name"],
        additionalProperties: false,
      },
      metadata: { readOnly: false, riskLevel: "medium" },
      async execute(input: {
        name: string;
        icon?: string;
        parentId?: string | null;
      }) {
        return await bookmarkStorage.createCategory(
          input.name,
          input.parentId || null,
          input.icon
        );
      },
    },
    {
      name: "update_category",
      description: "Update an existing bookmark category.",
      parameters: {
        type: "object",
        properties: {
          id: { type: "string" },
          name: { type: "string" },
          icon: { type: "string", nullable: true },
          parentId: { type: "string", nullable: true },
          order: { type: "number" },
        },
        required: ["id"],
        additionalProperties: false,
      },
      metadata: { readOnly: false, riskLevel: "medium" },
      async execute(input: {
        id: string;
        name?: string;
        icon?: string;
        parentId?: string | null;
        order?: number;
      }) {
        const { id, ...updates } = input;
        await bookmarkStorage.updateCategory(id, updates);
        return { success: true, id, updates };
      },
    },
    {
      name: "delete_category",
      description: "Delete a bookmark category by ID.",
      parameters: {
        type: "object",
        properties: {
          id: { type: "string" },
        },
        required: ["id"],
        additionalProperties: false,
      },
      metadata: { readOnly: false, riskLevel: "medium" },
      async execute(input: { id: string }) {
        await bookmarkStorage.deleteCategory(input.id);
        return { success: true, deletedId: input.id };
      },
    },

    // ----------------------------------------------------------------------
    // Bookmark CRUD
    // ----------------------------------------------------------------------
    {
      name: "create_bookmark",
      description: "Create a new bookmark.",
      parameters: {
        type: "object",
        properties: {
          url: { type: "string" },
          title: { type: "string" },
          description: { type: "string" },
          content: { type: "string" },
          categoryId: { type: "string", nullable: true },
          tags: { type: "array", items: { type: "string" } },
          favicon: { type: "string" },
          hasSnapshot: { type: "boolean" },
        },
        required: ["url", "title", "description", "tags"],
        additionalProperties: false,
      },
      metadata: { readOnly: false, riskLevel: "medium" },
      async execute(input: CreateBookmarkInput) {
        return await bookmarkStorage.createBookmark({
          ...input,
          categoryId: input.categoryId || null,
          hasSnapshot: input.hasSnapshot ?? false,
        });
      },
    },
    {
      name: "update_bookmark",
      description: "Update an existing bookmark (e.g., change category, add tags, modify title).",
      parameters: {
        type: "object",
        properties: {
          id: { type: "string" },
          url: { type: "string" },
          title: { type: "string" },
          description: { type: "string" },
          content: { type: "string" },
          categoryId: { type: "string", nullable: true },
          tags: { type: "array", items: { type: "string" } },
          favicon: { type: "string" },
          hasSnapshot: { type: "boolean" },
        },
        required: ["id"],
        additionalProperties: false,
      },
      metadata: { readOnly: false, riskLevel: "medium" },
      async execute(input: { id: string } & UpdateBookmarkInput) {
        const { id, ...updates } = input;
        await bookmarkStorage.updateBookmark(id, updates);
        return { success: true, id, updates };
      },
    },
    {
      name: "delete_bookmark",
      description: "Delete a bookmark by ID (soft delete by default).",
      parameters: {
        type: "object",
        properties: {
          id: { type: "string" },
          permanent: { type: "boolean" },
        },
        required: ["id"],
        additionalProperties: false,
      },
      metadata: { readOnly: false, riskLevel: "medium" },
      async execute(input: { id: string; permanent?: boolean }) {
        await bookmarkStorage.deleteBookmark(input.id, input.permanent);
        return { success: true, deletedId: input.id, permanent: input.permanent };
      },
    },
  ];
}
