import type { AgentTool } from "@browser-agent-sdk/agent";
import { configStorage, tabGroupRulesStorage } from "@/lib/storage";
import type {
  CustomFilter,
  FilterCondition,
  TabGroupRule,
  CreateTabGroupRuleInput,
  UpdateTabGroupRuleInput,
  TabGroupRuleMatchType,
  TabGroupRuleMatchCondition,
  TabGroupRuleColor,
} from "@/types";

export function createRuleManagementTools(): AgentTool[] {
  return [
    // ----------------------------------------------------------------------
    // Custom Filters CRUD
    // ----------------------------------------------------------------------
    {
      name: "get_custom_filters",
      description: "Get all custom filters configured in settings.",
      parameters: {
        type: "object",
        properties: {},
        additionalProperties: false,
      },
      metadata: { readOnly: true, riskLevel: "low" },
      async execute() {
        return await configStorage.getCustomFilters();
      },
    },
    {
      name: "add_custom_filter",
      description: "Create a new custom filter for bookmark search.",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string" },
          conditions: {
            type: "array",
            items: {
              type: "object",
              properties: {
                field: {
                  type: "string",
                  enum: ["title", "url", "description", "tags", "createdAt"],
                },
                operator: {
                  type: "string",
                  enum: [
                    "equals",
                    "contains",
                    "notEquals",
                    "notContains",
                    "startsWith",
                    "endsWith",
                    "greaterThan",
                    "lessThan",
                  ],
                },
                value: { type: "string" },
              },
              required: ["field", "operator", "value"],
              additionalProperties: false,
            },
          },
        },
        required: ["name", "conditions"],
        additionalProperties: false,
      },
      metadata: { readOnly: false, riskLevel: "medium" },
      async execute(input: { name: string; conditions: FilterCondition[] }) {
        const newFilter: CustomFilter = {
          id: crypto.randomUUID(),
          name: input.name,
          conditions: input.conditions,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        await configStorage.addCustomFilter(newFilter);
        return newFilter;
      },
    },
    {
      name: "update_custom_filter",
      description: "Update an existing custom filter.",
      parameters: {
        type: "object",
        properties: {
          id: { type: "string" },
          name: { type: "string" },
          conditions: {
            type: "array",
            items: {
              type: "object",
              properties: {
                field: {
                  type: "string",
                  enum: ["title", "url", "description", "tags", "createdAt"],
                },
                operator: {
                  type: "string",
                  enum: [
                    "equals",
                    "contains",
                    "notEquals",
                    "notContains",
                    "startsWith",
                    "endsWith",
                    "greaterThan",
                    "lessThan",
                  ],
                },
                value: { type: "string" },
              },
              required: ["field", "operator", "value"],
              additionalProperties: false,
            },
          },
        },
        required: ["id"],
        additionalProperties: false,
      },
      metadata: { readOnly: false, riskLevel: "medium" },
      async execute(input: {
        id: string;
        name?: string;
        conditions?: FilterCondition[];
      }) {
        const updates: Partial<CustomFilter> = { updatedAt: Date.now() };
        if (input.name !== undefined) updates.name = input.name;
        if (input.conditions !== undefined) updates.conditions = input.conditions;

        await configStorage.updateCustomFilter(input.id, updates);
        return { success: true, id: input.id, updates };
      },
    },
    {
      name: "delete_custom_filter",
      description: "Delete a custom filter by its ID.",
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
        await configStorage.deleteCustomFilter(input.id);
        return { success: true, deletedId: input.id };
      },
    },

    // ----------------------------------------------------------------------
    // Tab Group Rules CRUD
    // ----------------------------------------------------------------------
    {
      name: "get_tab_group_rules",
      description: "Get all workspace tab auto-grouping rules.",
      parameters: {
        type: "object",
        properties: {},
        additionalProperties: false,
      },
      metadata: { readOnly: true, riskLevel: "low" },
      async execute() {
        return await tabGroupRulesStorage.getRules();
      },
    },
    {
      name: "add_tab_group_rule",
      description: "Add a new tab auto-grouping rule.",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string" },
          enabled: { type: "boolean" },
          matchType: {
            type: "string",
            enum: ["domain", "urlContains", "title", "titleIgnoreCase", "regex"],
          },
          matchCondition: {
            type: "string",
            enum: ["contains", "equals", "startsWith", "endsWith", "regex"],
            nullable: true,
          },
          pattern: { type: "string" },
          groupTitle: { type: "string" },
          color: {
            type: "string",
            enum: [
              "grey",
              "blue",
              "red",
              "yellow",
              "green",
              "pink",
              "purple",
              "cyan",
              "orange",
            ],
          },
          collapsed: { type: "boolean" },
          order: { type: "number" },
        },
        required: [
          "name",
          "enabled",
          "matchType",
          "pattern",
          "groupTitle",
          "color",
          "collapsed",
          "order",
        ],
        additionalProperties: false,
      },
      metadata: { readOnly: false, riskLevel: "medium" },
      async execute(input: CreateTabGroupRuleInput) {
        return await tabGroupRulesStorage.addRule(input);
      },
    },
    {
      name: "update_tab_group_rule",
      description: "Update an existing tab group rule by its ID.",
      parameters: {
        type: "object",
        properties: {
          id: { type: "string" },
          name: { type: "string" },
          enabled: { type: "boolean" },
          matchType: {
            type: "string",
            enum: ["domain", "urlContains", "title", "titleIgnoreCase", "regex"],
          },
          matchCondition: {
            type: "string",
            enum: ["contains", "equals", "startsWith", "endsWith", "regex"],
            nullable: true,
          },
          pattern: { type: "string" },
          groupTitle: { type: "string" },
          color: {
            type: "string",
            enum: [
              "grey",
              "blue",
              "red",
              "yellow",
              "green",
              "pink",
              "purple",
              "cyan",
              "orange",
            ],
          },
          collapsed: { type: "boolean" },
          order: { type: "number" },
        },
        required: ["id"],
        additionalProperties: false,
      },
      metadata: { readOnly: false, riskLevel: "medium" },
      async execute(input: { id: string } & UpdateTabGroupRuleInput) {
        const { id, ...updates } = input;
        await tabGroupRulesStorage.updateRule(id, updates);
        return { success: true, id, updates };
      },
    },
    {
      name: "delete_tab_group_rule",
      description: "Delete a tab group rule by its ID.",
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
        await tabGroupRulesStorage.deleteRule(input.id);
        return { success: true, deletedId: input.id };
      },
    },
  ];
}
