# Edge 1.4.3 送审记录

时间：2026-10-14 16:08，Asia/Shanghai。

结果：**Edge 1.4.3 已成功提交审核。Partner Center 显示 `UPDATE ... Version 1.4.3` / `In review`，线上版本仍为 1.4.2 / `Live`。**

## 安装包核验

- 复用 [GitHub Release v1.4.3](https://github.com/bingoYB/ham_home/releases/tag/v1.4.3) 的 `hamhome-1.4.3-edge.zip`，未从当前工作区重新构建。
- 发布包大小：4,046,284 bytes。
- 官方 SHA-256：`bf5998f1cee487074a0f6eb67c226e9701960bfac0ad2f2530fd0d0fe57273ae`。
- `manifest.version`：`1.4.3`，Manifest V3，包含 Edge 的 `tabGroups` 权限。
- 中英文名称及短描述与既有 AEO 方案一致；当前草稿名称显示为 `HamHome — AI 网页收藏与标签页管理`。
- 本地旧 zip 的归档摘要不同，但逐条解压内容与官方 zip 完全一致。本次实际上传官方发布文件。
- 本次未修改版本、commit、tag、GitHub Release 或当前未提交业务代码，也未重复提交 Chrome/Firefox。

## 官方 API 回执

通过既有 `.env.submit` 凭据调用 Microsoft 官方 API；凭据未写入记录或输出。

1. 上传安装包：HTTP 202；operation `122f7879-575a-4c71-a62a-8bc69d823b1c`。
2. 核验上传：HTTP 200，`Succeeded`，`Successfully updated package ...`。
3. 发布草稿：HTTP 202；operation `1b9f6062-4ca3-4c50-860f-aab14079cdb8`。
4. 核验送审：HTTP 200，`Succeeded`，`Successfully created submission with ID 1152921505702123605`。
5. Partner Center 实际页面：1.4.3 `In review`；1.4.2 `Live`，界面提示审核预计 7 个工作日，该提示不是承诺完成日期。

## 文案与后续验收

- 本次安装包带新中英文名称和摘要，已一起进入审核。
- 本次未更新商店中英文长描述。开发者后台最初停留在空白登录页；随后成功进入后台核验，送审已处于 In review，列表发布按钮禁用。
- 既有 5 张 Edge 截图的公开更新已在本次送审前核实。
- 审核通过后核验公开商店版本、名称与摘要；长描述仍需要按 AEO 方案补齐。新官网尚未部署，官网与隐私链接迁移继续保留为待办。
- 三商店 AEO 总任务保持 `In progress` / 未完成，不将 API 创建 submission 的成功等同于上架或全部文案验收完成。

来源：[Microsoft 发布 API 文档](https://learn.microsoft.com/en-us/microsoft-edge/extensions/update/api/using-addons-api)、[Edge 公开商店](https://microsoftedge.microsoft.com/addons/detail/hamhome/nmbdgbicgagmokdmohgngcbhkaicfnpi)。
