# 推荐输入的受保护提取契约

推荐入口不让模型直接返回 Agent 名称。输入最多 500 字，只能产生 `taskType`、`environment`、`autonomy`、`riskPreference` 四类候选。

每个候选必须包含 `fieldId`、`value`、`confidence`、`evidence`、`status`，Schema 禁止额外字段。`evidence` 必须是用户原文中的连续逐字片段；允许的状态为 `asserted`、`negated`、`uncertain`、`historical`、`resolved`、`hypothetical`。

Acceptance Policy：

- 当前、肯定且置信度不低于 0.68 的候选可进入评分。
- `negated` 只作为排除约束，不转换成肯定偏好。
- `uncertain`、`historical`、`resolved`、`hypothetical` 不进入当前推荐事实。
- 未知字段、额外属性、非法枚举、越界置信度和证据不落地直接拒绝。
- 没有当前 `taskType` 时请求澄清，不强行推荐。
- Provider 报错时保持相同输入，回退到纯规则 Provider；提问不持久化。

当前 Provider 是确定性关键词 Provider，`mockProvider` 使用相同契约供测试。未来接入真实 LLM 时只能替换候选生成层，Validator 和 Acceptance Policy 保持不变。
