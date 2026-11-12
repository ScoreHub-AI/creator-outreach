# WorkBuddy 专家交付与市场连接器依赖

> 本文是 `creator-outreach` 专家包依赖声明、组装与渠道隔离的唯一权威说明。跨包上架流程、字段合规与提交基线见[开放平台上架方案](../../../docs/WORKBUDDY_OPEN_PLATFORM_LISTING.md)。
>
> 官方依据（2026-11-12 核验）：[专家文档「连接器依赖」](https://open.workbuddy.cn/docs/expert#连接器依赖)支持引用已上架连接器；[连接器文档](https://open.workbuddy.cn/docs/connector)明确 `source` 是 Connector 的唯一 ID。用户已确认 ScoreHub 连接器上架。

## 市场版依赖契约

专家的 `.codebuddy-plugin/plugin.json` 声明：

```json
"dependencies": {
  "connectors": ["scorehub-tiktok"]
}
```

`scorehub-tiktok` 对应 `packages/mcp-server/connector/connector-meta.json` 的 `source`。它与连接器内部 MCP Server key `scorehub` 分别用于市场引用与 MCP 配置。名称、描述、图标、运行时与授权流程由市场连接器提供。

专家包只允许上述单一连接器依赖，不声明 `dependencies.mcpServers`。仓库包根与 `listing/` 均不得保留 `.mcp.json`，ZIP 的专家根目录也不得包含该文件：官方会在未声明 `dependencies.mcpServers` 时自动读取根 `.mcp.json`，残留会重新引入内置 MCP。

用户召唤专家前，WorkBuddy 引导连接与授权；已连接过的依赖不重复引导。专家本身不要求用户执行本地安装命令。共享行为与依赖未就绪时的交付仍由 Agent 定义，上架版正文由 `scripts/build-platform-agent.py` 从权威正文生成。

## 打包与校验

`scripts/pack-expert.sh` 在组装前验证连接器 ID，并拒绝缺失、错误或混合的依赖声明，以及包根 / `listing/` 中残留的 `.mcp.json`。只复制展示头像，不再附带旧 MCP 卡片图标与配置。

ZIP 内保留 `.codebuddy-plugin/`、生成的 Agent、共享 Reference、八个 Skill、展示头像与 `listing/README.md`；产品摘要不含本地安装命令。打包后验证无内置 MCP，并继续检查相对引用、凭证与旧安装路径痕迹。打包回归应实际解压核对依赖声明与文件清单，并覆盖错误依赖和旧配置混入的拒绝分支。

## npm 自测通道隔离

源清单同时供 npm 渠道使用。`install.js` 生成 `--dev` 自测副本时，只在暂存副本中移除 `dependencies.connectors`；若依赖对象已空则删除该对象，其他依赖字段保留。源码位与物化缓存均不携带市场连接器依赖，原始清单继续保留市场声明。

自测副本沿用 bootstrap 管理的 MCP 与 `-dev` 身份。安装回归应同时验证源码位、缓存位与原始清单，防止自测时重复触发市场连接流程。

## 本次交付与验证

专家清单与 npm 包版本同步递增为 `1.12.5`，增量同步 `package-lock.json`。本次修复市场依赖引导，工具契约与 npm 连接方式兼容，按 patch 递增；不发布 npm 或连接器。`npm install` 同时同步了原 lock 中滞后的 `mcp-remote` workspace 版本字段，未更改其包清单或依赖。

- 本地回归：`npm test -w packages/creator-outreach`。
- 工作区预览包：`bash packages/creator-outreach/scripts/pack-expert.sh --skip-baseline-check`，仅供本地核对，不作为已锁定提交的提审包。
- 正式提审：遵循跨包上架方案的干净提交与 tag 基线规则，重新执行不带跳过参数的打包命令，再上传新版专家。
- 客户端验收：在纯净环境召唤新版专家，检查市场连接器引导、ScoreHub 登录与店铺授权、工具可见性；已连接用户再次召唤时检查不会重复引导。切换依赖不会自动移除用户已有的自定义连接记录。

本地验证：包内 94 项测试通过，无跳过；预览 ZIP 为 `dist/tiktok-creator-outreach-1.12.5.zip`，138,206 B / 30 个文件，解压确认单一市场连接器声明、八个 Skill、无 `.mcp.json`，压缩完整性检查通过。三包 workspace 版本均与 lock 一致。真实客户端连接与专家重新提审待执行，不以本地 ZIP 检查替代。
