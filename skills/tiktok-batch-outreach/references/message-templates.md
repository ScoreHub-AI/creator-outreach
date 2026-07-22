# 建联话术模板

生成话术由“已确认的利益前置 Offer + 英文正文”组成。3 套正文按发送序号取模（`i % 3`）轮换，同一批达人始终使用同一个已确认 Offer。发送前的选择、确认与自定义话术行为由建联 Skill 统一规定。

## 变量

- `{offer_prefix}`：按下方 Offer 预设生成的完整利益前缀。
- `{name}`：达人昵称。
- `{brand}`：品牌名。
- `{cash}`：包含币种符号与金额的展示值，默认为 `$200`；不自动换汇或改写币种。
- `{commission}` / `{discount}`：不带 `%` 的比例数值。

## Offer 预设

| 类型 | 前缀模板 | 默认前缀 | 前 15 字预览 |
|------|----------|------------|----------------|
| 现金 + 高佣 | `【{cash} Cash + {commission}% Comm】` | `【$200 Cash + 30% Comm】` | `【$200 Cash + 30` |
| 高佣 + 免费送样 | `【{commission}% Comm + Free Sample】` | `【35% Comm + Free Sample】` | `【35% Comm + Fre` |
| 独家折扣码 + 免费送样 | `【Exclusive {discount}% Off Code + Free Sample】` | `【Exclusive 50% Off Code + Free Sample】` | `【Exclusive 50% ` |

默认值只是可编辑起点，不代表品牌已承诺该条件。用户修改后必须使用其明确确认的值，不得自动提高现金、佣金或折扣。

## 通知栏前 15 字规则

- 按 Unicode 用户可见字符计数，括号、空格和标点均计入。
- 系统生成或改写的话术必须从 `{offer_prefix}` 开始；问候、品牌和背景介绍不得出现在它之前。
- 现金型的完整 `{cash}`，或非现金型的最高利益比例（含 `%`），必须完整出现在前 15 个字符内。
- Offer 标签本身可超过 15 字；若用户修改后的非利益文字挤出核心值，优先缩写或后移非核心文字，不改写用户确认的金额或比例。

## Template A

```
{offer_prefix} Hi {name}! I'm with {brand}. Your content is a strong fit for our next campaign. Interested in collaborating?
```

## Template B

```
{offer_prefix} Hey {name}! {brand} would love to feature you in an upcoming campaign. Want the details?
```

## Template C

```
{offer_prefix} {name}, your content stood out to {brand}. We'd love to partner on your next video. Open to it?
```

## 说明

- `send_message` 的 `content` 字段为 JSON 编码字符串：`{"content": "<填充后的文本>"}`。
- 后续若做 A/B 测试，可扩展模板池并追踪各模板回复率（见包 ROADMAP）。
