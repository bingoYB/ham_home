import { describe, expect, it } from "vitest";
import { PlanManager } from "./plan";

describe("PlanManager", () => {
  it("should initialize with empty plan", () => {
    const manager = new PlanManager();
    expect(manager.getPlan()).toEqual([]);
    expect(manager.isPlanMode()).toBe(false);
  });

  it("should return tools with default namespace", () => {
    const manager = new PlanManager();
    const tools = manager.getTools();

    expect(tools.map((t) => t.name)).toEqual([
      "plan.createTask",
      "plan.updateTask",
      "plan.getTasks",
      "plan.deleteTask",
      "plan.clearTasks",
      "plan.enterPlanMode",
      "plan.exitPlanMode",
    ]);
  });

  it("should return tools with custom namespace", () => {
    const manager = new PlanManager({ namespace: "taskPlan" });
    const tools = manager.getTools();

    expect(tools.map((t) => t.name)).toEqual([
      "taskPlan.createTask",
      "taskPlan.updateTask",
      "taskPlan.getTasks",
      "taskPlan.deleteTask",
      "taskPlan.clearTasks",
      "taskPlan.enterPlanMode",
      "taskPlan.exitPlanMode",
    ]);
  });

  it("should return tools with no namespace", () => {
    const manager = new PlanManager({ namespace: "" });
    const tools = manager.getTools();

    expect(tools.map((t) => t.name)).toEqual([
      "createTask",
      "updateTask",
      "getTasks",
      "deleteTask",
      "clearTasks",
      "enterPlanMode",
      "exitPlanMode",
    ]);
  });

  it("plan.createTask should create a new task item", () => {
    const manager = new PlanManager();
    const createTool = manager.getTools().find(t => t.name === "plan.createTask")!;

    const result = createTool.execute({ subject: "Task 1", description: "Details", activeForm: "Running" }, {} as any) as any;

    expect(result.success).toBe(true);
    expect(result.task.subject).toBe("Task 1");
    expect(result.task.status).toBe("pending");
    expect(result.task.description).toBe("Details");
    expect(result.task.activeForm).toBe("Running");
    expect(result.task.id).toBeDefined();

    expect(manager.getPlan()).toHaveLength(1);
    expect(manager.getPlan()[0]).toEqual(result.task);
  });

  it("plan.updateTask should update fields of a specific task", () => {
    const manager = new PlanManager();
    const createTool = manager.getTools().find(t => t.name === "plan.createTask")!;
    const updateTool = manager.getTools().find(t => t.name === "plan.updateTask")!;

    createTool.execute({ subject: "Task 1" }, {} as any);
    const plan = manager.getPlan();
    const taskId = plan[0].id;

    const result = updateTool.execute({ id: taskId, status: "in-progress", description: "Updated" }, {} as any) as any;
    expect(result.success).toBe(true);
    expect(result.task.status).toBe("in-progress");
    expect(result.task.description).toBe("Updated");

    expect(manager.getPlan()[0].status).toBe("in-progress");
  });

  it("plan.updateTask should throw if task id is not found", () => {
    const manager = new PlanManager();
    const updateTool = manager.getTools().find(t => t.name === "plan.updateTask")!;

    expect(() => {
      updateTool.execute({ id: "non-existent-id", status: "completed" }, {} as any);
    }).toThrow(/not found/);
  });

  it("plan.getTasks should return the current list of tasks", () => {
    const manager = new PlanManager();
    const createTool = manager.getTools().find(t => t.name === "plan.createTask")!;
    const getTool = manager.getTools().find(t => t.name === "plan.getTasks")!;

    createTool.execute({ subject: "Task 1" }, {} as any);

    const result = getTool.execute({}, {} as any) as any;
    expect(result.tasks).toEqual(manager.getPlan());
  });

  it("plan.deleteTask should delete a specific task", () => {
    const manager = new PlanManager();
    const createTool = manager.getTools().find(t => t.name === "plan.createTask")!;
    const deleteTool = manager.getTools().find(t => t.name === "plan.deleteTask")!;

    createTool.execute({ subject: "Task 1" }, {} as any);
    const taskId = manager.getPlan()[0].id;

    const result = deleteTool.execute({ id: taskId }, {} as any) as any;
    expect(result.success).toBe(true);
    expect(manager.getPlan()).toHaveLength(0);
  });

  it("plan.clearTasks should clear all tasks", () => {
    const manager = new PlanManager();
    const createTool = manager.getTools().find(t => t.name === "plan.createTask")!;
    const clearTool = manager.getTools().find(t => t.name === "plan.clearTasks")!;

    createTool.execute({ subject: "Task 1" }, {} as any);
    createTool.execute({ subject: "Task 2" }, {} as any);
    expect(manager.getPlan()).toHaveLength(2);

    const result = clearTool.execute({}, {} as any) as any;
    expect(result.success).toBe(true);
    expect(result.tasks).toHaveLength(0);
    expect(manager.getPlan()).toHaveLength(0);
  });

  it("plan mode tools should toggle planMode state", () => {
    const manager = new PlanManager();
    const enterTool = manager.getTools().find(t => t.name === "plan.enterPlanMode")!;
    const exitTool = manager.getTools().find(t => t.name === "plan.exitPlanMode")!;

    expect(manager.isPlanMode()).toBe(false);

    enterTool.execute({}, {} as any);
    expect(manager.isPlanMode()).toBe(true);

    exitTool.execute({}, {} as any);
    expect(manager.isPlanMode()).toBe(false);
  });
});
