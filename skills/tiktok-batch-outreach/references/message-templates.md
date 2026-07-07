# 建联话术模板

3 套英文模板轮换发送（按发送序号取模：`i % 3`），降低 spam 检测风险。
变量：`{name}` 达人昵称、`{brand}` 品牌名、`{commission}` 佣金比例。品牌名与佣金比例发送前需向用户确认。

## Template A

```
Hi {name}! I'm from {brand} and I love your content style. We have beauty products that would be a great fit for your audience. Free samples + {commission}% commission — interested in collaborating? 😊
```

## Template B

```
Hey {name}! {brand} has some trending beauty products your followers would love. We're offering {commission}% commission per sale + free samples to try. Want to explore a partnership?
```

## Template C

```
Hi {name} 👋 {brand} is looking for creators like you! Your content really stands out. Free product samples + {commission}% commission. Would you be open to working together?
```

## 说明

- `send_message` 的 `content` 字段为 JSON 编码字符串：`{"content": "<填充后的文本>"}`。
- 模板文案偏美妆场景，其他品类可让用户提供定制话术后替换。
- 后续若做 A/B 测试，可扩展模板池并追踪各模板回复率（见包 ROADMAP）。
