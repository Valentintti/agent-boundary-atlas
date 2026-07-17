export const RECOMMENDATION_RULE_VERSION = "2026-07-17.v1";

export const fieldValues = {
  taskType: ["code", "office", "research", "content", "app", "automation"],
  environment: ["terminal", "ide", "browser", "desktop", "cloud"],
  autonomy: ["interactive", "delegated", "scheduled"],
  riskPreference: ["cautious", "broad"],
} as const;

export type RecommendationField = keyof typeof fieldValues;
export type CandidateStatus =
  | "asserted"
  | "negated"
  | "uncertain"
  | "historical"
  | "resolved"
  | "hypothetical";

export type ExtractionCandidate = {
  fieldId: RecommendationField;
  value: string;
  confidence: number;
  evidence: string;
  status: CandidateStatus;
};

export type CandidateProvider = {
  extract(input: string): ExtractionCandidate[];
};

export const recommendationCandidateSchema = {
  type: "object",
  additionalProperties: false,
  required: ["fieldId", "value", "confidence", "evidence", "status"],
  properties: {
    fieldId: { enum: Object.keys(fieldValues) },
    value: { type: "string", minLength: 1, maxLength: 40 },
    confidence: { type: "number", minimum: 0, maximum: 1 },
    evidence: { type: "string", minLength: 1, maxLength: 60 },
    status: {
      enum: [
        "asserted",
        "negated",
        "uncertain",
        "historical",
        "resolved",
        "hypothetical",
      ],
    },
  },
} as const;

type KeywordDefinition = {
  fieldId: RecommendationField;
  value: string;
  keywords: string[];
};

const keywordDefinitions: KeywordDefinition[] = [
  { fieldId: "taskType", value: "code", keywords: ["写代码", "编程", "开发", "重构", "调试", "代码库", "bug", "接口"] },
  { fieldId: "taskType", value: "office", keywords: ["办公", "文档", "表格", "excel", "ppt", "幻灯片", "邮件", "报告"] },
  { fieldId: "taskType", value: "research", keywords: ["研究", "调研", "搜集资料", "查资料", "资料分析", "竞品分析", "数据分析"] },
  { fieldId: "taskType", value: "content", keywords: ["内容", "运营", "文章", "营销", "公众号", "图片", "视频", "文案"] },
  { fieldId: "taskType", value: "app", keywords: ["网站", "网页", "应用", "产品", "原型", "上线", "从0到1", "从 0 到 1"] },
  { fieldId: "taskType", value: "automation", keywords: ["自动化", "批量", "重复工作", "工作流", "自动执行", "定时任务"] },
  { fieldId: "environment", value: "terminal", keywords: ["终端", "命令行", "shell", "cli"] },
  { fieldId: "environment", value: "ide", keywords: ["ide", "编辑器", "vscode", "代码编辑器"] },
  { fieldId: "environment", value: "browser", keywords: ["浏览器", "网页操作", "在线操作"] },
  { fieldId: "environment", value: "desktop", keywords: ["本地文件", "本机文件", "电脑文件", "桌面", "本地办公", "本地"] },
  { fieldId: "environment", value: "cloud", keywords: ["云端", "后台运行", "异步", "远程执行"] },
  { fieldId: "autonomy", value: "interactive", keywords: ["一起做", "边做边看", "逐步确认", "我来审查", "可控", "协作"] },
  { fieldId: "autonomy", value: "delegated", keywords: ["交给它", "自动完成", "独立完成", "全程完成", "直接交付", "委派"] },
  { fieldId: "autonomy", value: "scheduled", keywords: ["定时", "每天", "每周", "长期运行", "持续运行", "7x24", "定期"] },
  { fieldId: "riskPreference", value: "cautious", keywords: ["隐私", "权限", "安全", "审批", "确认后", "敏感文件", "本地优先"] },
  { fieldId: "riskPreference", value: "broad", keywords: ["完全自动", "不想确认", "最高权限", "少确认", "放手执行"] },
];

const statuses: CandidateStatus[] = [
  "asserted",
  "negated",
  "uncertain",
  "historical",
  "resolved",
  "hypothetical",
];

function detectStatus(input: string, start: number, end: number): CandidateStatus {
  const before = input.slice(Math.max(0, start - 10), start);
  const around = input.slice(Math.max(0, start - 10), Math.min(input.length, end + 10));
  if (/(已经解决|已经完成|不用了|不再需要)/i.test(around)) return "resolved";
  if (/(不想|不要|不希望|避免|不用|无需|别用|不能用)[^，。；]{0,4}$/i.test(before)) return "negated";
  if (/(以前|之前|过去|曾经)[^，。；]{0,4}$/i.test(before)) return "historical";
  if (/(如果|假如|假设|万一)[^，。；]{0,4}$/i.test(before)) return "hypothetical";
  if (/(可能|也许|不确定|还没想好)/i.test(around)) return "uncertain";
  return "asserted";
}

export const ruleProvider: CandidateProvider = {
  extract(input) {
    const normalized = input.toLowerCase();
    const candidates: ExtractionCandidate[] = [];
    const seen = new Set<string>();

    for (const definition of keywordDefinitions) {
      for (const keyword of definition.keywords) {
        const start = normalized.indexOf(keyword.toLowerCase());
        if (start < 0) continue;
        const evidence = input.slice(start, start + keyword.length);
        const status = detectStatus(input, start, start + keyword.length);
        const key = `${definition.fieldId}:${definition.value}:${status}`;
        if (!seen.has(key)) {
          seen.add(key);
          candidates.push({
            fieldId: definition.fieldId,
            value: definition.value,
            confidence: keyword.length >= 2 ? 0.94 : 0.78,
            evidence,
            status,
          });
        }
        break;
      }
    }
    return candidates;
  },
};

export const mockProvider: CandidateProvider = {
  extract: (input) => ruleProvider.extract(input),
};

export function validateCandidate(candidate: unknown, input: string) {
  if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) {
    return { valid: false, reason: "candidate_not_object" } as const;
  }
  const value = candidate as Record<string, unknown>;
  const allowedKeys = ["fieldId", "value", "confidence", "evidence", "status"];
  if (Object.keys(value).some((key) => !allowedKeys.includes(key))) {
    return { valid: false, reason: "unknown_field" } as const;
  }
  if (!allowedKeys.every((key) => key in value)) {
    return { valid: false, reason: "missing_required_field" } as const;
  }
  if (typeof value.fieldId !== "string" || !(value.fieldId in fieldValues)) {
    return { valid: false, reason: "invalid_field_id" } as const;
  }
  const fieldId = value.fieldId as RecommendationField;
  if (typeof value.value !== "string" || !(fieldValues[fieldId] as readonly string[]).includes(value.value)) {
    return { valid: false, reason: "invalid_value" } as const;
  }
  if (typeof value.confidence !== "number" || value.confidence < 0 || value.confidence > 1) {
    return { valid: false, reason: "invalid_confidence" } as const;
  }
  if (typeof value.evidence !== "string" || !value.evidence || value.evidence.length > 60 || !input.includes(value.evidence)) {
    return { valid: false, reason: "evidence_not_grounded" } as const;
  }
  if (typeof value.status !== "string" || !statuses.includes(value.status as CandidateStatus)) {
    return { valid: false, reason: "invalid_status" } as const;
  }
  return { valid: true, candidate: value as ExtractionCandidate } as const;
}

type RecommendationProfile = {
  id: string;
  tasks: string[];
  environments: string[];
  autonomy: string[];
  risk: string[];
  boundary: string;
};

const profiles: RecommendationProfile[] = [
  { id: "claude-code", tasks: ["code", "app"], environments: ["terminal", "desktop"], autonomy: ["interactive", "delegated"], risk: ["cautious"], boundary: "更适合终端中的软件工程，不是通用办公执行器。" },
  { id: "codex", tasks: ["code", "app", "automation"], environments: ["terminal", "ide", "cloud", "desktop"], autonomy: ["interactive", "delegated", "scheduled"], risk: ["cautious"], boundary: "开发闭环强，但核心边界仍然围绕软件工程。" },
  { id: "cursor", tasks: ["code", "app"], environments: ["ide", "cloud"], autonomy: ["interactive", "delegated"], risk: ["cautious"], boundary: "最顺手的场景在 Cursor 编辑器和代码仓库内。" },
  { id: "manus", tasks: ["research", "office", "app", "content"], environments: ["browser", "cloud", "desktop"], autonomy: ["delegated"], risk: ["broad"], boundary: "交付范围广，但 credits 与广泛执行权限需要复核。" },
  { id: "coze", tasks: ["office", "content", "app", "automation"], environments: ["browser", "cloud"], autonomy: ["delegated", "scheduled"], risk: ["broad"], boundary: "适合中文内容与工作流，深度本机工程控制不是重点。" },
  { id: "workbuddy", tasks: ["office", "automation"], environments: ["desktop"], autonomy: ["interactive", "delegated", "scheduled"], risk: ["cautious"], boundary: "更偏腾讯生态和岗位办公，不是专业代码 Agent。" },
  { id: "qoder", tasks: ["code", "app"], environments: ["ide"], autonomy: ["interactive", "delegated"], risk: ["cautious"], boundary: "适合编辑器与长期开发任务，通用办公覆盖有限。" },
  { id: "dumate", tasks: ["office", "automation", "research"], environments: ["desktop"], autonomy: ["delegated", "scheduled"], risk: ["cautious"], boundary: "擅长本地文件和重复办公流程，跨云服务能力需具体核验。" },
  { id: "kimi-work", tasks: ["research", "office", "automation", "content"], environments: ["desktop", "browser"], autonomy: ["delegated", "scheduled"], risk: ["cautious"], boundary: "本地知识工作覆盖广，但复杂自动化仍需检查授权范围。" },
  { id: "trae", tasks: ["code", "app"], environments: ["ide"], autonomy: ["interactive", "delegated"], risk: ["cautious"], boundary: "适合 IDE 和 SOLO 开发，不面向日常办公自动化。" },
];

const valueLabels: Record<string, string> = {
  code: "代码开发",
  office: "办公产物",
  research: "资料研究",
  content: "内容创作",
  app: "网站 / 应用",
  automation: "自动化",
  terminal: "终端",
  ide: "IDE",
  browser: "浏览器",
  desktop: "本地桌面",
  cloud: "云端",
  interactive: "逐步协作",
  delegated: "自主交付",
  scheduled: "定时运行",
  cautious: "权限谨慎",
  broad: "广泛执行",
};

export type AgentRecommendation = {
  agentId: string;
  score: number;
  reasons: string[];
  boundary: string;
};

export type RecommendationResult = {
  state: "idle" | "needs_clarification" | "recommended" | "rejected";
  message: string;
  recommendations: AgentRecommendation[];
  candidates: ExtractionCandidate[];
  rejectedCandidates: Array<{ reason: string }>;
  fallbackUsed: boolean;
  trace: {
    ruleVersion: string;
    inputLength: number;
    acceptedFields: string[];
    candidateCount: number;
    rejectedCount: number;
  };
};

export function runRecommendation(input: string, provider: CandidateProvider = ruleProvider): RecommendationResult {
  const text = input.trim();
  const base = {
    recommendations: [] as AgentRecommendation[],
    candidates: [] as ExtractionCandidate[],
    rejectedCandidates: [] as Array<{ reason: string }>,
    fallbackUsed: false,
  };

  if (!text) {
    return {
      ...base,
      state: "idle",
      message: "先说说你想完成什么结果。",
      trace: { ruleVersion: RECOMMENDATION_RULE_VERSION, inputLength: 0, acceptedFields: [], candidateCount: 0, rejectedCount: 0 },
    };
  }
  if (text.length > 500) {
    return {
      ...base,
      state: "rejected",
      message: "描述请控制在 500 字以内，并只保留任务、环境和执行偏好。",
      trace: { ruleVersion: RECOMMENDATION_RULE_VERSION, inputLength: text.length, acceptedFields: [], candidateCount: 0, rejectedCount: 1 },
    };
  }

  let rawCandidates: ExtractionCandidate[];
  let fallbackUsed = false;
  try {
    rawCandidates = provider.extract(text);
  } catch {
    rawCandidates = ruleProvider.extract(text);
    fallbackUsed = true;
  }

  const candidates: ExtractionCandidate[] = [];
  const rejectedCandidates: Array<{ reason: string }> = [];
  for (const candidate of rawCandidates) {
    const validation = validateCandidate(candidate, text);
    if (validation.valid) candidates.push(validation.candidate);
    else rejectedCandidates.push({ reason: validation.reason });
  }

  const accepted = candidates.filter((candidate) => candidate.status === "asserted" && candidate.confidence >= 0.68);
  const constraints = candidates.filter((candidate) => candidate.status === "negated");
  const tasks = accepted.filter((candidate) => candidate.fieldId === "taskType");
  if (!tasks.length) {
    return {
      ...base,
      candidates,
      rejectedCandidates,
      fallbackUsed,
      state: "needs_clarification",
      message: "我还没识别出核心产出。可以补充：写代码、做报告、查资料、做内容、建网站或定时自动化。",
      trace: {
        ruleVersion: RECOMMENDATION_RULE_VERSION,
        inputLength: text.length,
        acceptedFields: accepted.map((candidate) => candidate.fieldId),
        candidateCount: candidates.length,
        rejectedCount: rejectedCandidates.length,
      },
    };
  }

  const scored = profiles.map((profile, index) => {
    let score = 0;
    const reasons: string[] = [];
    for (const candidate of accepted) {
      const collection =
        candidate.fieldId === "taskType" ? profile.tasks :
        candidate.fieldId === "environment" ? profile.environments :
        candidate.fieldId === "autonomy" ? profile.autonomy : profile.risk;
      if (!collection.includes(candidate.value)) continue;
      const weight = candidate.fieldId === "taskType" ? 6 : candidate.fieldId === "environment" ? 3 : 2;
      score += weight;
      reasons.push(valueLabels[candidate.value]);
    }
    for (const constraint of constraints) {
      const collection =
        constraint.fieldId === "taskType" ? profile.tasks :
        constraint.fieldId === "environment" ? profile.environments :
        constraint.fieldId === "autonomy" ? profile.autonomy : profile.risk;
      if (collection.includes(constraint.value)) score -= 5;
    }
    return { agentId: profile.id, score, reasons: [...new Set(reasons)].slice(0, 3), boundary: profile.boundary, index };
  });

  const recommendations = scored
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .slice(0, 3)
    .map(({ index: _index, ...item }) => item);

  return {
    ...base,
    candidates,
    rejectedCandidates,
    fallbackUsed,
    state: recommendations.length ? "recommended" : "needs_clarification",
    message: recommendations.length
      ? "推荐由任务、环境、自主程度和权限偏好的固定规则生成。"
      : "当前条件互相限制，建议减少一个限制或补充你最看重的结果。",
    recommendations,
    trace: {
      ruleVersion: RECOMMENDATION_RULE_VERSION,
      inputLength: text.length,
      acceptedFields: accepted.map((candidate) => candidate.fieldId),
      candidateCount: candidates.length,
      rejectedCount: rejectedCandidates.length,
    },
  };
}
