import { describe, expect, it } from "vitest";
import {
  createGetHamHomeFeatureDetailTool,
  createHamHomeFeatureSkill,
  getHamHomeFeatureDetail,
  getHamHomeFeatureOverview,
} from "../hamhome-feature-skill";

describe("hamhome-feature-skill", () => {
  it("exposes a feature overview and detailed docs by id", () => {
    const overview = getHamHomeFeatureOverview();
    expect(overview.length).toBeGreaterThan(4);
    expect(overview.map((item) => item.id)).toContain("semantic-search");

    const detail = getHamHomeFeatureDetail("settings");
    expect(detail?.detail).toContain("agent 可自动修改的安全项");
    expect(getHamHomeFeatureDetail("unknown")).toBeNull();
  });

  it("documents a complete bookmark management onboarding flow", () => {
    const detail = getHamHomeFeatureDetail("bookmarks");

    expect(detail?.detail).toContain("初始化使用");
    expect(detail?.detail).toContain("配置 AI");
    expect(detail?.detail).toContain("配置分类系统");
    expect(detail?.detail).toContain("从浏览器导入书签");
    expect(detail?.detail).toContain("快捷键");
    expect(detail?.detail).toContain("WebDAV");
    expect(detail?.detail).toContain("导出插件数据");
    expect(detail?.detail).toContain("书签侧边栏");
    expect(detail?.detail).toContain("AI 对话窗口");
    expect(detail?.detail).toContain("反向导入到浏览器书签栏");
  });

  it("documents tab AI auto grouping usage", () => {
    const detail = getHamHomeFeatureDetail("workspaces-tab-groups");

    expect(detail?.detail).toContain("Tab 标签页 AI 自动分组");
    expect(detail?.detail).toContain("读取当前窗口标签页");
    expect(detail?.detail).toContain("AI 生成分组建议");
    expect(detail?.detail).toContain("用户确认后再应用");
  });

  it("documents discovery, organization, workspace, and sync edge cases", () => {
    const bookmarks = getHamHomeFeatureDetail("bookmarks");
    const semanticSearch = getHamHomeFeatureDetail("semantic-search");
    const snapshots = getHamHomeFeatureDetail("snapshots");
    const workspaces = getHamHomeFeatureDetail("workspaces-tab-groups");
    const importExport = getHamHomeFeatureDetail("import-export-sync");
    const settings = getHamHomeFeatureDetail("settings");

    expect(bookmarks?.detail).toContain("地址栏 Omnibox 搜索");
    expect(bookmarks?.detail).toContain("标签云");
    expect(bookmarks?.detail).toContain("预设分类模板");
    expect(semanticSearch?.detail).toContain("浏览器地址栏");
    expect(snapshots?.detail).toContain("保存书签时可选择同步到 Obsidian");
    expect(workspaces?.detail).toContain("恢复到当前窗口或新窗口");
    expect(workspaces?.detail).toContain("跳过重复 URL");
    expect(workspaces?.detail).toContain("需要浏览器支持 tabGroups");
    expect(importExport?.detail).toContain("保留浏览器文件夹结构");
    expect(importExport?.detail).toContain("跳过重复项");
    expect(importExport?.detail).toContain("后台会定期同步");
    expect(settings?.detail).toContain("save-bookmark");
    expect(settings?.detail).toContain("toggle-bookmark-panel");
  });

  it("creates a global usage guide skill with the detail tool mounted", () => {
    const skill = createHamHomeFeatureSkill();

    expect(skill.id).toBe("hamhome-feature-guide");
    expect(skill.match).toBeUndefined();
    expect(skill.documents?.[0]?.content).toContain("功能清单");
    expect(skill.documents?.[0]?.content).toContain("从 0 开始");
    expect(skill.documents?.[0]?.content).toContain("Agent 可以");
    expect(skill.tools?.[0]?.tool.name).toBe("get_hamhome_feature_detail");
  });

  it("returns detailed feature content from the tool", async () => {
    const tool = createGetHamHomeFeatureDetailTool();
    const output = await tool.execute(
      { featureId: "ai-automation" },
      { agentId: "test", sessionId: "s1" },
    );

    expect(output).toMatchObject({
      id: "ai-automation",
      title: "AI 自动化",
    });
  });
});
