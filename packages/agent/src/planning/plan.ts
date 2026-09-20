import type { AgentTool, JsonSchema } from "../core/types";

export type TaskStatus = "pending" | "in-progress" | "completed" | "failed" | "blocked";

export interface TaskItem {
  id: string;
  subject: string;
  description?: string;
  status: TaskStatus;
  activeForm?: string;
  metadata?: Record<string, unknown>;
}

export interface PlanManagerOptions {
  namespace?: string;
}

export class PlanManager {
  private items: TaskItem[] = [];
  private namespace: string;
  private planMode: boolean = false;

  constructor(options?: PlanManagerOptions) {
    this.namespace = options?.namespace ?? "plan";
  }

  private generateId(): string {
    return Math.random().toString(36).substring(2, 9);
  }

  getTools(): AgentTool[] {
    const ns = this.namespace ? `${this.namespace}.` : "";

    return [
      {
        name: `${ns}createTask`,
        description: "Create a new task in the plan. This represents a distinct unit of work.",
        parameters: {
          type: "object",
          properties: {
            subject: {
              type: "string",
              description: "A brief title for the task.",
            },
            description: {
              type: "string",
              description: "Detailed description of what needs to be done.",
            },
            activeForm: {
              type: "string",
              description: "Present continuous form shown when in progress (e.g., 'Running tests').",
            },
            metadata: {
              type: "object",
              additionalProperties: true,
              description: "Arbitrary metadata to attach to the task.",
            },
          },
          required: ["subject"],
          additionalProperties: false,
        } as JsonSchema,
        execute: (input: { subject: string; description?: string; activeForm?: string; metadata?: Record<string, unknown> }) => {
          const task: TaskItem = {
            id: this.generateId(),
            subject: input.subject,
            description: input.description,
            status: "pending",
            activeForm: input.activeForm,
            metadata: input.metadata,
          };
          this.items.push(task);
          return { success: true, task };
        },
      },
      {
        name: `${ns}updateTask`,
        description: "Update the status or fields of a specific task.",
        parameters: {
          type: "object",
          properties: {
            id: {
              type: "string",
              description: "The ID of the task to update.",
            },
            status: {
              type: "string",
              enum: ["pending", "in-progress", "completed", "failed", "blocked"],
              description: "The new status of the task.",
            },
            description: {
              type: "string",
              description: "Updated description for the task.",
            },
            activeForm: {
              type: "string",
              description: "Updated active form for the task.",
            },
          },
          required: ["id"],
          additionalProperties: false,
        } as JsonSchema,
        execute: (input: { id: string; status?: TaskStatus; description?: string; activeForm?: string }) => {
          const item = this.items.find((i) => i.id === input.id);
          if (!item) {
            throw new Error(`Task with id "${input.id}" not found.`);
          }
          if (input.status) item.status = input.status;
          if (input.description !== undefined) item.description = input.description;
          if (input.activeForm !== undefined) item.activeForm = input.activeForm;

          return { success: true, task: item };
        },
      },
      {
        name: `${ns}getTasks`,
        description: "Get the list of all tasks in the current plan.",
        parameters: {
          type: "object",
          properties: {},
          additionalProperties: false,
        } as JsonSchema,
        execute: () => {
          return { tasks: this.items };
        },
      },
      {
        name: `${ns}deleteTask`,
        description: "Delete a specific task from the plan.",
        parameters: {
          type: "object",
          properties: {
            id: {
              type: "string",
              description: "The ID of the task to delete.",
            },
          },
          required: ["id"],
          additionalProperties: false,
        } as JsonSchema,
        execute: (input: { id: string }) => {
          const initialLength = this.items.length;
          this.items = this.items.filter((i) => i.id !== input.id);
          if (this.items.length === initialLength) {
            throw new Error(`Task with id "${input.id}" not found.`);
          }
          return { success: true };
        },
      },
      {
        name: `${ns}clearTasks`,
        description: "Clear all tasks from the plan.",
        parameters: {
          type: "object",
          properties: {},
          additionalProperties: false,
        } as JsonSchema,
        execute: () => {
          this.items = [];
          return { success: true, tasks: this.items };
        },
      },
      {
        name: `${ns}enterPlanMode`,
        description: "Requests permission to enter plan mode for complex tasks requiring exploration and design.",
        parameters: {
          type: "object",
          properties: {},
          additionalProperties: false,
        } as JsonSchema,
        execute: () => {
          this.planMode = true;
          return {
            success: true,
            message: "Entered plan mode. You should now focus on exploring the codebase and designing an implementation approach. Create a plan using createTask. Do NOT write or edit any files until you exit plan mode."
          };
        },
      },
      {
        name: `${ns}exitPlanMode`,
        description: "Exits plan mode and presents the designed plan for execution.",
        parameters: {
          type: "object",
          properties: {},
          additionalProperties: false,
        } as JsonSchema,
        execute: () => {
          this.planMode = false;
          return {
            success: true,
            message: "Exited plan mode. You may now proceed with executing the plan."
          };
        },
      }
    ];
  }

  getPlan(): TaskItem[] {
    return this.items;
  }

  isPlanMode(): boolean {
    return this.planMode;
  }
}
