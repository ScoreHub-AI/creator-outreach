#!/usr/bin/env python3
"""从权威 Agent 正文生成 WorkBuddy 开放平台「上架版」正文。

背景：`agents/tiktok-creator-outreach.md` 是 Agent 行为规范的唯一权威来源，其首轮
bootstrap 门禁服务于**分享链接安装路径**（WorkBuddy 不在安装阶段配置 MCP，需由
`npx @scorehub/creator-outreach bootstrap` 自行合并 `~/.workbuddy/mcp.json`）。
开放平台上架走依赖引导卡片，平台负责 MCP 连接，因此上架版必须剥离该门禁。

做法：不改权威正文、不维护第二份正文，只做一组**带锚点校验的确定性替换**。任一
锚点缺失即报错退出，避免正文演进后生成出过期或半成品包。

用法:
    python3 build-platform-agent.py <权威正文.md> <输出.md>
"""

import re
import sys

# (锚点原文, 上架版替换文本)；锚点必须在权威正文中恰好出现一次。
REPLACEMENTS = [
    (
        # 首轮引导：bootstrap 门禁 + npx 命令 + 结构化状态分支 + 分享链接回退
        """每个新对话的第一条回复，**无论用户输入问候、快捷指令、账号/店铺切换还是具体业务需求**，都必须先完成 WorkBuddy bootstrap 门禁。bootstrap 未完成时不执行搜索、分析、建联或 `authorize`，也不输出标准欢迎语。`restart_required` 分支允许仅为验证重启是否生效而调用本地 `status`，不得把该调用当作业务操作。

首先执行 `npx -y @scorehub/creator-outreach@latest bootstrap --check --json`，并严格按结构化状态处理：

- `uninitialized`：只告知用户 Tiky 需要安装 ScoreHub 本地组件才能使用达人能力，且不会清除现有授权数据；**必须等待用户明确确认**。确认后执行 `npx -y @scorehub/creator-outreach@latest bootstrap --install --json`。返回 `restart_required` 后提示完全退出并重启 WorkBuddy，本轮结束。这次确认同时代表用户允许后续静默更新，不再对每个 creator-outreach 新版本重复询问。
- `restart_required`：仅为确认重启是否生效调用本地 `status`。若返回 `config_source.managed_by = "@scorehub/creator-outreach"`、`config_source.client_host = "workbuddy"`，且 `config_source.creator_outreach_version` 与本次 bootstrap 检查返回的 `installed_creator_outreach_version` 一致，执行 `npx -y @scorehub/creator-outreach@latest bootstrap --mark-ready --json` 清除重启标记并继续；若 `status` 不可用、版本不一致、返回其他托管信息或调用失败，只提示完全退出并重启 WorkBuddy，不进入业务流程。
- `repair_required`：说明结果中的可恢复原因。若明确是 Node.js / npm / npx 问题，进入“本地运行环境恢复”；其他情况经用户确认后重试 `bootstrap --install --json`。修复前不进入业务流程。
- `ready`：仅当结果同时返回 `update_due = true` 时，执行 `npx -y @scorehub/creator-outreach@latest bootstrap --update --silent --json`；否则直接继续。更新返回 `ready` 时继续；返回 `restart_required` 时可继续使用当前已加载版本，但需在首轮末尾简短提示重启后使用新版本。网络检查失败但现有 MCP 仍可用时，保留当前版本并继续，不误判为 OAuth 问题。

宿主不支持执行本地命令时，回退为提示用户重新打开分享链接 `https://www.workbuddy.cn/work/launch/?sharecode=lNM8H05BRKoV-dw2gac3ZwQ-p01o3C3KVz1gXJ_CwvtX02-mSRqBB3xepE4V0gr7&expertname=Tiky+%C2%B7+TikTok%E8%BE%BE%E4%BA%BA%E8%90%A5%E9%94%80%E4%B8%93%E5%AE%B6&buddy_type=workbuddy` 进行覆盖安装；不要让终端用户手工编辑 `mcp.json`。

bootstrap 返回 `ready` 后，再识别以下明确意图：""",
        """每个新对话的第一条回复，**无论用户输入问候、快捷指令、账号/店铺切换还是具体业务需求**，都先按本节处理，再进入业务流程。本专家的 MCP 连接由 WorkBuddy 的依赖引导卡片负责：不要要求用户执行任何本地安装或更新命令，也不要让终端用户手工编辑 `mcp.json`。

若本轮的 `search_creators`、`authorize` 等 ScoreHub MCP 工具未出现在可用工具列表中，说明依赖尚未就绪：按 `## 调用方式` 一节的固定话术提示用户完全退出并重新打开 WorkBuddy，本轮不执行搜索、分析、建联，也不调用 `authorize`。

再识别以下明确意图：""",
    ),
    (
        # 本地运行环境恢复：不得再引导执行 creator-outreach 自身的 bootstrap 命令
        """执行 `npx -y @scorehub/creator-outreach@latest` 前，也必须先尽量复用 WorkBuddy 当前可用的 Node.js / npx。""",
        """""",
    ),
    (
        # 断连提示：不再以 bootstrap 状态作为前置条件
        """如果 bootstrap 已返回 `ready`，但 MCP 工具仍不可见、连接关闭或本地 MCP 未启动，直接告诉用户：""",
        """如果 MCP 工具仍不可见、连接关闭或本地 MCP 未启动，直接告诉用户：""",
    ),
]

# 上架版正文中不得残留的分享链接安装路径痕迹。
FORBIDDEN = [
    "bootstrap",
    "Bootstrap",
    "sharecode",
    "@scorehub/creator-outreach@latest",
    "分享链接",
]


def main() -> int:
    if len(sys.argv) != 3:
        print(__doc__.strip(), file=sys.stderr)
        return 2
    src_path, out_path = sys.argv[1], sys.argv[2]
    with open(src_path, encoding="utf-8") as handle:
        source = handle.read()

    frontmatter = source.split("---\n", 2)[1] if source.startswith("---\n") else ""

    result = source
    for old, new in REPLACEMENTS:
        count = result.count(old)
        if count != 1:
            print(
                f"错误: 锚点在权威正文中出现 {count} 次（期望 1 次），"
                f"权威正文可能已演进，请同步维护 {__file__}: {old[:40]}…",
                file=sys.stderr,
            )
            return 1
        result = result.replace(old, new)

    leftovers = sorted({token for token in FORBIDDEN if token in result})
    if leftovers:
        print(f"错误: 上架版正文仍残留分享链接安装路径痕迹: {leftovers}", file=sys.stderr)
        return 1

    if result.split("---\n", 2)[1] != frontmatter:
        print("错误: frontmatter 与权威正不一致（本脚本不应改动 frontmatter）", file=sys.stderr)
        return 1

    with open(out_path, "w", encoding="utf-8") as handle:
        handle.write(result)

    removed = len(source) - len(result)
    print(f"  上架版 Agent 正文: {out_path}（{len(result.splitlines())} 行，较权威正文少 {removed} 字符）")
    return 0


if __name__ == "__main__":
    sys.exit(main())
