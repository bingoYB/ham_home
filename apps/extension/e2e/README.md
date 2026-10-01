# 扩展 E2E 测试基建（Playwright）

基于 [Playwright](https://playwright.dev/) 对**已构建的 Chrome MV3 扩展产物**进行端到端测试，
并生成**带截图的 HTML 测试报告**。

## 目录结构

```
e2e/
├── playwright.config.ts   # Playwright 配置（报告/超时/项目）
├── global-setup.ts        # 跑测试前自动构建扩展产物（已存在则跳过）
├── fixtures.ts            # 加载扩展、解析 extensionId 的测试夹具
├── tests/                 # 测试用例（*.spec.ts）
│   └── app-page.spec.ts   # 示例：主页面加载冒烟用例
├── playwright-report/     # 生成的 HTML 报告（gitignore）
└── test-results/          # 失败用例的截图/视频/trace（gitignore）
```

## 运行

```bash
# 首次：安装 Playwright 的 Chromium
pnpm test:e2e:install

# 运行全部 E2E 用例（默认中文、英文、暗色三个 project 都会跑）
pnpm test:e2e

# 有头模式（可见浏览器窗口，便于调试）
pnpm test:e2e:headed

# 只运行英文 UI project（复用同一套核心用例）
pnpm test:e2e:english

# 只运行暗色主题 project（复用同一套核心用例）
pnpm test:e2e:dark

# 需要浏览器整窗截图的用例（包含标签栏、地址栏、原生 Tab 分组）
pnpm test:e2e:desktop

# 查看带截图的 HTML 报告
pnpm test:e2e:report
```

## 关键设计

- **测产物而非源码**：测试加载 `.output/chrome-mv3`，测得的是真实打包后的扩展。
  `global-setup.ts` 在产物缺失时自动 `pnpm build`。
  - `E2E_SKIP_BUILD=1`：跳过构建（产物已就绪，快速迭代测试）。
  - `E2E_FORCE_BUILD=1`：强制重新构建。
- **扩展加载**：`fixtures.ts` 用 `launchPersistentContext` + `--load-extension`，
  并通过 MV3 Service Worker 的 URL 解析出 `extensionId`。
- **AI/向量基础配置注入**：`fixtures.ts` 会在每个测试上下文启动后自动写入
  `sync:aiConfig` 和 `sync:embeddingConfig`，默认指向本地 OpenAI-compatible mock
  地址 `http://127.0.0.1:31415/v1`。可通过环境变量覆盖：
  - `E2E_AI_BASE_URL`、`E2E_AI_API_KEY`、`E2E_AI_MODEL`、`E2E_AI_PROVIDER`
  - `E2E_EMBEDDING_BASE_URL`、`E2E_EMBEDDING_API_KEY`、`E2E_EMBEDDING_MODEL`、`E2E_EMBEDDING_PROVIDER`
  - `E2E_INJECT_AI_CONFIG=0` 可关闭自动注入
- **AI mock 服务**：需要模型应答的用例（如 `global-agent.spec.ts`）用
  `helpers/mock-ai-server.ts` 的 `startMockAiServer()` 在随机端口启动 OpenAI 兼容
  `/v1/chat/completions` mock（支持按段延迟的 SSE 流式和非流式应答），在
  `resetExtensionData(...)` 之后调用 `pointAiConfigToMock(worker, server.baseUrl)`
  把 AI 配置指向它；`server.requests` 记录请求体以及是否被客户端中断。
- **截图报告**：配置中 `screenshot: only-on-failure` 自动捕获失败截图；
  核心流程用例会通过 `attachStepScreenshot(...)` 主动附加成功路径的关键节点截图，
  例如空态入口、筛选结果、导入成功、popup 保存前表单、设置失败态等。
- **语言和主题变体**：Playwright 配置了 `chromium-extension`、
  `chromium-extension-english`、`chromium-extension-dark` 三个核心 project。
  它们复用同一套 `tests/*.spec.ts`，在测试上下文启动和每次
  `resetExtensionData(...)` 后写入对应的 `settings.language` / `settings.theme`。
  新增核心用例后会自动覆盖默认中文、英文 UI、暗色主题三种场景，并附加对应关键节点截图。
- **浏览器整窗截图**：Tab 自动分组等需要看 Chrome 标签栏的场景使用
  `HEADED=1 E2E_DESKTOP_SCREENSHOT=1`。当前通过 macOS `screencapture`
  截取当前屏幕并附加到 HTML 报告；如需裁剪到浏览器窗口，可设置
  `E2E_DESKTOP_APP_NAME="Google Chrome"`。如果希望当前环境无法截图时直接失败，
  可额外设置 `E2E_DESKTOP_SCREENSHOT_REQUIRED=1`。

## 新增用例

在 `tests/` 下新建 `*.spec.ts`，从 `../fixtures` 导入 `test` / `expect`：

```ts
import { test, expect, extPageUrl } from "../fixtures";

test("打开 popup", async ({ context, extensionId }) => {
  const page = await context.newPage();
  await page.goto(extPageUrl(extensionId, "popup.html"));
  await expect(page.locator("#root")).toBeVisible();
});
```

可加载的扩展内页面：`app.html`、`popup.html`、`example.html`。

核心流程的用例矩阵见 [TEST_CASES.md](./TEST_CASES.md)。
