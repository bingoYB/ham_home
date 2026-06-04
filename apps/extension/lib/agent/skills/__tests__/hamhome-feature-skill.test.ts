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

  it("creates a global usage guide skill with the detail tool mounted", () => {
    const skill = createHamHomeFeatureSkill();

    expect(skill.id).toBe("hamhome-feature-guide");
    expect(skill.match).toBeUndefined();
    expect(skill.documents?.[0]?.content).toContain("功能清单");
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
