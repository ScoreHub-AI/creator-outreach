#!/usr/bin/env bash
# 打包 WorkBuddy 开放平台「专家」包，用于上传 open.workbuddy.cn。
#
# 产出（dist/ 已在根 .gitignore 中忽略）:
#   packages/creator-outreach/dist/tiktok-creator-outreach-<version>.zip   ← 上传件
#   packages/creator-outreach/dist/tiktok-creator-outreach-<version>/      ← 与 zip 完全一致的目录树，便于上传前逐项核对
# 层级: zip 根目录为单一文件夹 <plugin name>/，与官方模板 design-experts.zip 一致。
#
# 用法: bash packages/creator-outreach/scripts/pack-expert.sh [--skip-baseline-check]
#       --skip-baseline-check 跳过「工作区干净 + HEAD 已打 tag」校验，仅用于本地排查。
#
# 注意: 本脚本刻意不使用 pack-connector.sh 里的 `-x '*/.*'` 排除规则——专家包必须包含
#       `.codebuddy-plugin/` 与 `.mcp.json` 两个点开头的路径，该规则会把它们静默丢掉。
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PKG_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
OUT_DIR="$PKG_DIR/dist"
PLUGIN_JSON="$PKG_DIR/.codebuddy-plugin/plugin.json"
AGENT_SRC="$PKG_DIR/agents/tiktok-creator-outreach.md"

fail() { echo "错误: $*" >&2; exit 1; }

# ---------------------------------------------------------------- 1. 前置校验
META="$(python3 - "$PLUGIN_JSON" "$PKG_DIR" <<'PY'
import json, os, re, struct, sys

plugin_path, pkg_dir = sys.argv[1], sys.argv[2]
plugin = json.load(open(plugin_path, encoding="utf-8"))
errors, notes = [], []

def need(condition, message):
    if not condition:
        errors.append(message)

# 基础字段
for field in ("name", "version", "description", "author", "agents", "expertType",
              "agentName", "displayName", "profession", "displayDescription",
              "avatar", "categoryId", "defaultInitPrompt", "plugin", "tags", "quickPrompts"):
    need(field in plugin, f"plugin.json 缺少必填字段 {field}")
if errors:
    print("\n".join("  " + e for e in errors), file=sys.stderr)
    sys.exit(1)

need(plugin["expertType"] == "agent", "expertType 需为 agent")
need(plugin["plugin"] == plugin["name"], "plugin 需与 name 一致")
need(re.fullmatch(r"[a-z0-9]+(-[a-z0-9]+)*", plugin["name"]) is not None,
     f"name 需为小写字母加连字符: {plugin['name']}")
need(re.fullmatch(r"\d+\.\d+\.\d+", plugin["version"]) is not None,
     f"version 需为语义化版本: {plugin['version']}")

# 市场展示字段：官方字段表要求固定数量
need(len(plugin["tags"]) == 3, f"tags 需固定 3 个，当前 {len(plugin['tags'])} 个")
need(len(plugin["quickPrompts"]) == 3, f"quickPrompts 需固定 3 个，当前 {len(plugin['quickPrompts'])} 个")
need(plugin["defaultInitPrompt"] == plugin["quickPrompts"][0],
     "defaultInitPrompt 必须与 quickPrompts[0] 完全一致")
for tag in plugin["tags"]:
    need(set(tag) >= {"en", "zh"}, "tags 每项需同时包含 en 与 zh")
for prompt in plugin["quickPrompts"]:
    need(set(prompt) >= {"en", "zh"}, "quickPrompts 每项需同时包含 en 与 zh")

# displayDescription.zh：官方字段表要求 40–50 字
zh = plugin["displayDescription"]["zh"]
total = len(zh)
cjk = len(re.findall(r"[\u4e00-\u9fff]", zh))
if not 40 <= total <= 50:
    errors.append(f"displayDescription.zh 共 {total} 字符，需落在 40–50 字之间: {zh}")
elif cjk < 40:
    notes.append(f"displayDescription.zh 共 {total} 字符（纯汉字 {cjk} 个）。"
                 f"官方字段表只说“中文字数 40–50 字”，未写明计数口径；本包按全字符数计。")

# displayName：官方字段表只写“市场展示名称”，未给长度上限；平台表单实测为 15 字
# （提交时返回「专家名称：当前 24 字，上限 15 字」）。展示名放短人设名，职业头衔放 profession。
for lang in ("zh", "en"):
    value = plugin["displayName"].get(lang, "")
    if len(value) > 15:
        errors.append(
            f"displayName.{lang} 共 {len(value)} 字，超过平台 15 字上限: {value}"
        )

# Agent 定义文件
for agent in plugin["agents"]:
    need(os.path.isfile(os.path.join(pkg_dir, agent)), f"agents 路径不存在: {agent}")
need(os.path.isfile(os.path.join(pkg_dir, "agents", plugin["agentName"] + ".md")),
     f"agentName 对应的 agents/{plugin['agentName']}.md 不存在")
for skill in plugin.get("skills", []):
    need(os.path.isdir(os.path.join(pkg_dir, skill)), f"skills 路径不存在: {skill}")

# 头像：PNG 512×512，≤500KB
avatar = os.path.join(pkg_dir, plugin["avatar"])
if not os.path.isfile(avatar):
    errors.append(f"avatar 文件不存在: {plugin['avatar']}")
else:
    size = os.path.getsize(avatar)
    if size > 500 * 1024:
        errors.append(f"头像 {plugin['avatar']} 为 {size / 1024:.0f}KB，超过 500KB")
    with open(avatar, "rb") as handle:
        head = handle.read(33)
    if head[:8] != b"\x89PNG\r\n\x1a\n":
        errors.append(f"头像 {plugin['avatar']} 不是 PNG")
    else:
        width, height = struct.unpack(">II", head[16:24])
        if (width, height) != (512, 512):
            errors.append(f"头像 {plugin['avatar']} 为 {width}×{height}，需为 512×512")

# 依赖声明
mcp_path = os.path.join(pkg_dir, "listing", ".mcp.json")
icon_rel = None
if not os.path.isfile(mcp_path):
    errors.append("缺少上架依赖声明 listing/.mcp.json")
else:
    mcp = json.load(open(mcp_path, encoding="utf-8"))
    servers = mcp.get("mcpServers", {})
    if len(servers) != 1:
        errors.append(f"listing/.mcp.json 只能配置 1 个 MCP Server，当前 {len(servers)} 个")
    else:
        icon = (servers[next(iter(servers))].get("x-workbuddy") or {}).get("icon", "")
        if icon.startswith("./"):
            icon_rel = icon[2:]
            need(os.path.isfile(os.path.join(pkg_dir, icon_rel)),
                 f"x-workbuddy.icon 指向的文件不存在: {icon}")
        elif icon:
            notes.append(f"x-workbuddy.icon 为外部地址，打包时不会附带本地文件: {icon}")

if errors:
    print("\n".join("  " + e for e in errors), file=sys.stderr)
    sys.exit(1)

for note in notes:
    print("警告: " + note, file=sys.stderr)
print(f"NAME={plugin['name']}")
print(f"VERSION={plugin['version']}")
print(f"AVATAR={plugin['avatar']}")
print(f"ICON={icon_rel or ''}")
print(f"AGENT=agents/{plugin['agentName']}.md")
PY
)" || fail "plugin.json 校验未通过（详见上方）"

NAME="$(sed -n 's/^NAME=//p' <<<"$META")"
VERSION="$(sed -n 's/^VERSION=//p' <<<"$META")"
AVATAR="$(sed -n 's/^AVATAR=//p' <<<"$META")"
ICON="$(sed -n 's/^ICON=//p' <<<"$META")"
AGENT="$(sed -n 's/^AGENT=//p' <<<"$META")"

[[ -n "$NAME" && -n "$VERSION" ]] || fail "无法从 plugin.json 解析 name / version"
echo "打包目标: ${NAME} ${VERSION}（头像 ${AVATAR}）"

# ------------------------------------------------- 1.5 上架基线守卫
# 上架包必须是「某个已提交、已打 tag 的状态」的可复现产物：提审之后主干仍会前进，
# 不锁基线就再也打不出与审核中那份一致的 zip。规则见
# docs/WORKBUDDY_OPEN_PLATFORM_LISTING.md 第 8 节。
SKIP_BASELINE_CHECK=0
for arg in "$@"; do
  case "$arg" in
    --skip-baseline-check) SKIP_BASELINE_CHECK=1 ;;
    *) fail "未知参数: $arg（仅支持 --skip-baseline-check）" ;;
  esac
done

gitpkg() { (cd "$PKG_DIR" && git "$@"); }

if (( SKIP_BASELINE_CHECK == 1 )); then
  echo "警告: 已跳过上架基线校验，产物不可追溯到任何提交。" >&2
elif ! gitpkg rev-parse --git-dir >/dev/null 2>&1; then
  echo "警告: 当前不在 git 仓库中，跳过上架基线校验。" >&2
else
  DIRTY="$(gitpkg status --porcelain -- . || true)"
  if [[ -n "$DIRTY" ]]; then
    printf '%s\n' "$DIRTY" >&2
    fail "上架包只应从干净的提交构建：以上是本包未提交的改动。
      先提交（或 stash）再打包，让 zip 可追溯到某个具体提交；
      确需在脏工作区出包时加 --skip-baseline-check（不推荐）。"
  fi

  TAGS_AT_HEAD="$(gitpkg for-each-ref refs/tags --points-at HEAD --format='%(objecttype) %(refname:short)')"
  if [[ -z "$TAGS_AT_HEAD" ]]; then
    fail "HEAD（$(gitpkg rev-parse --short HEAD)）还没有 tag，产物无法追溯。
      先打不可变基线再打包（npm 版本未变时用上架专用命名空间，不要复用已指向旧提交的版本 tag）：
        git tag -a \"@scorehub/creator-outreach@$VERSION\" -m \"creator-outreach $VERSION\"
        git tag -a \"listing/tiktok-creator-outreach@$VERSION.1\" -m \"专家包 $VERSION 第 1 次提审\"
      确需跳过时加 --skip-baseline-check（不推荐）。"
  fi

  if grep -q '^tag ' <<<"$TAGS_AT_HEAD"; then
    BASELINE="$(awk '$1 == "tag" { print $2 }' <<<"$TAGS_AT_HEAD" | paste -sd, -)（annotated）"
  else
    BASELINE="$(awk '{ print $2 }' <<<"$TAGS_AT_HEAD" | paste -sd, -)（轻量 tag，建议改用 git tag -a）"
  fi
  grep -qF "$VERSION" <<<"$TAGS_AT_HEAD" || \
    echo "警告: HEAD 上的 tag（$BASELINE）不含当前版本号 $VERSION，请确认打的是同一基线。" >&2
  echo "上架基线: $(gitpkg rev-parse --short HEAD) @ $BASELINE"
fi

# ------------------------------------------------- 2. 组装纯净包（排除开发件）
TREE_DIR="$OUT_DIR/$NAME-$VERSION"
rm -rf "$TREE_DIR"
mkdir -p "$TREE_DIR"

cp -R "$PKG_DIR/.codebuddy-plugin" "$TREE_DIR/"
cp -R "$PKG_DIR/skills" "$TREE_DIR/"
mkdir -p "$TREE_DIR/avatars"
cp "$PKG_DIR/$AVATAR" "$TREE_DIR/avatars/"
if [[ -n "$ICON" ]]; then
  cp "$PKG_DIR/$ICON" "$TREE_DIR/avatars/"
fi
cp "$PKG_DIR/listing/.mcp.json" "$TREE_DIR/.mcp.json"
cp "$PKG_DIR/listing/README.md" "$TREE_DIR/README.md"

# 上架版 Agent 正文由权威正文生成，不直接复制权威正文
mkdir -p "$TREE_DIR/agents"
python3 "$SCRIPT_DIR/build-platform-agent.py" "$AGENT_SRC" "$TREE_DIR/$AGENT"

find "$TREE_DIR" -name '.DS_Store' -delete

# ------------------------------------------------------------- 3. 交付物自检
CLEAN_REFS=("agents" "skills" "avatars" ".codebuddy-plugin" ".mcp.json" "README.md")
for ref in "${CLEAN_REFS[@]}"; do
  [[ -e "$TREE_DIR/$ref" ]] || fail "打包结果缺少 $ref"
done

LEAKED=""
if grep -rInE 'sk-[A-Za-z0-9]{16,}|Bearer [A-Za-z0-9._-]{24,}|AKID[A-Za-z0-9]{16,}' "$TREE_DIR" >/dev/null 2>&1; then
  LEAKED="疑似真实凭证"
fi
if grep -rIin -e 'sharecode' -e '@scorehub/creator-outreach@latest' -e 'bootstrap' "$TREE_DIR" >/dev/null 2>&1; then
  LEAKED="$LEAKED 分享链接安装路径痕迹(bootstrap/sharecode)"
fi
[[ -z "$LEAKED" ]] || fail "打包结果存在$LEAKED，请清理后重试"

# --------------------------------------------------------------- 4. 生成 zip
mkdir -p "$OUT_DIR"
ZIP_PATH="$OUT_DIR/$NAME-$VERSION.zip"
rm -f "$ZIP_PATH"
# 仅排除 macOS 元数据；不能排除点开头的路径（见文件顶部说明）
(cd "$OUT_DIR" && zip -rqX "$ZIP_PATH" "$NAME-$VERSION" -x '*.DS_Store' -x '*/__MACOSX/*')

SIZE_BYTES="$(python3 -c 'import os,sys;print(os.path.getsize(sys.argv[1]))' "$ZIP_PATH")"
if (( SIZE_BYTES > 20 * 1024 * 1024 )); then
  fail "zip 体积 $((SIZE_BYTES / 1024 / 1024))MB 超过平台 20MB 上限"
fi

echo
echo "已生成: ${ZIP_PATH#$PKG_DIR/}（$((SIZE_BYTES / 1024))KB）"
echo "目录树: ${TREE_DIR#$PKG_DIR/}（与 zip 内容一致，可直接核对）"
echo
unzip -l "$ZIP_PATH"
