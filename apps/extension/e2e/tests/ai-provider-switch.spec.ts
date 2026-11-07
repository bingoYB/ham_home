import { test, expect } from "../fixtures";
import { openAppPage } from "../helpers/pages";
import { getStorageState, resetExtensionData } from "../helpers/storage";
import { E2E_EXTENSION_CONFIG } from "../e2e.config";

test("switching providers keeps each connection and a just-edited model", async ({
  context,
  extensionId,
  extensionWorker,
  e2eVariant,
}) => {
  await resetExtensionData(extensionWorker, { settings: e2eVariant.settings });
  await extensionWorker.evaluate(async (config) => {
    await chrome.storage.sync.set({
      aiConfig: {
        ...config,
        provider: "custom",
        apiKey: "legacy-custom-key",
        baseUrl: "https://old.example.test/v1",
        model: "legacy-custom-model",
      },
    });
  }, E2E_EXTENSION_CONFIG.aiConfig);

  const page = await openAppPage(context, extensionId, "settings");
  const provider = page.locator("#provider");
  const apiKey = page.locator('input[type="password"]').first();
  const baseUrl = page.locator('input[type="url"]').first();
  const model = page.locator("#model");
  await expect(baseUrl).toHaveValue("https://old.example.test/v1");

  await apiKey.fill("new-custom-key");
  await baseUrl.fill("https://new.example.test/v1");
  await model.fill("just-edited-model");
  await provider.click();
  await page.getByRole("option", { name: /Ollama/i }).click();
  await expect(provider).toContainText("Ollama");
  await expect(baseUrl).toHaveValue("http://localhost:11434/v1");
  await expect(model).toHaveValue("llama3.2");
  await expect(apiKey).toHaveValue("");
  // ModelSelector saves on a delay; an old blur must not replace Ollama's model.
  await page.waitForTimeout(250);
  await expect(model).toHaveValue("llama3.2");

  await provider.click();
  await page.getByRole("option", { name: /自定义|Custom/i }).click();
  await expect(baseUrl).toHaveValue("https://new.example.test/v1");
  await expect(model).toHaveValue("just-edited-model");
  await expect(apiKey).toHaveValue("new-custom-key");

  await page.reload();
  await expect(baseUrl).toHaveValue("https://new.example.test/v1");
  await provider.click();
  await page.getByRole("option", { name: /OpenAI/i }).first().click();
  await expect(provider).toContainText("OpenAI");
  await expect(apiKey).toHaveValue("");
  await provider.click();
  await page.getByRole("option", { name: /自定义|Custom/i }).click();
  await expect(baseUrl).toHaveValue("https://new.example.test/v1");
  await expect(model).toHaveValue("just-edited-model");
  await expect(apiKey).toHaveValue("new-custom-key");

  const state = await getStorageState(extensionWorker);
  expect(state.local.aiProviderConnections).toMatchObject({
    custom: { baseUrl: "https://new.example.test/v1", model: "just-edited-model", apiKey: "new-custom-key" },
  });
});
