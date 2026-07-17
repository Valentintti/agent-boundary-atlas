"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type FormEvent,
} from "react";
import {
  agents,
  comparisonFields,
  VERIFIED_AT,
  type AgentProfile,
} from "./agents";
import {
  runRecommendation,
  type RecommendationResult,
} from "./recommendation";

type Goal = "all" | "code" | "office" | "launch";
type CategoryFilter = "all" | "coding" | "work";

const goals: Array<{ id: Goal; label: string; description: string }> = [
  { id: "all", label: "先看全貌", description: "跨类型理解边界" },
  { id: "code", label: "我要写代码", description: "仓库、终端与交付" },
  { id: "office", label: "我要做办公自动化", description: "文件、浏览器与长期任务" },
  { id: "launch", label: "我要从 0 到 1", description: "把想法变成可用产物" },
];

const boundaryLegend = [
  ["01", "任务", "它负责哪一类结果"],
  ["02", "环境", "工作发生在本机还是云端"],
  ["03", "工具", "它能读什么、调用什么"],
  ["04", "权限", "哪些动作必须经过你"],
  ["05", "持续", "能否记忆、后台和定时"],
];

const recommendationExamples = [
  "我要开发一个网站，希望在 IDE 里边做边审查",
  "我每周要整理本地 Excel 和报告，最好能定时执行",
  "我要查资料并自动生成一份带来源的竞品报告",
];

export default function Home() {
  const [activeGoal, setActiveGoal] = useState<Goal>("all");
  const [category, setCategory] = useState<CategoryFilter>("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [notice, setNotice] = useState("");
  const [shareState, setShareState] = useState("复制对比链接");
  const [taskQuestion, setTaskQuestion] = useState("");
  const [recommendation, setRecommendation] = useState<RecommendationResult | null>(null);
  const [ready, setReady] = useState(false);
  const compareRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const goal = params.get("goal") as Goal | null;
    const ids = (params.get("agents") ?? "")
      .split(",")
      .filter((id) => agents.some((agent) => agent.id === id))
      .slice(0, 3);

    if (goals.some((item) => item.id === goal)) setActiveGoal(goal ?? "all");
    if (ids.length) setSelected(ids);
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    const url = new URL(window.location.href);
    if (activeGoal === "all") url.searchParams.delete("goal");
    else url.searchParams.set("goal", activeGoal);
    if (selected.length) url.searchParams.set("agents", selected.join(","));
    else url.searchParams.delete("agents");
    window.history.replaceState({}, "", url);
  }, [activeGoal, selected, ready]);

  const filteredAgents = useMemo(() => {
    const query = search.trim().toLowerCase();
    return agents.filter((agent) => {
      const matchesGoal = activeGoal === "all" || agent.goals.includes(activeGoal);
      const matchesCategory = category === "all" || agent.category === category;
      const matchesSearch =
        !query ||
        [agent.name, agent.maker, agent.role, agent.oneLiner]
          .join(" ")
          .toLowerCase()
          .includes(query);
      return matchesGoal && matchesCategory && matchesSearch;
    });
  }, [activeGoal, category, search]);

  const selectedAgents = selected
    .map((id) => agents.find((agent) => agent.id === id))
    .filter((agent): agent is AgentProfile => Boolean(agent));

  function toggleAgent(id: string) {
    setNotice("");
    setSelected((current) => {
      if (current.includes(id)) return current.filter((item) => item !== id);
      if (current.length >= 3) {
        setNotice("一次最多比较 3 个 Agent。先移除一个再继续。");
        return current;
      }
      return [...current, id];
    });
  }

  function showComparison() {
    compareRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function copyShareLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setShareState("链接已复制");
      window.setTimeout(() => setShareState("复制对比链接"), 1800);
    } catch {
      setShareState("请复制地址栏链接");
    }
  }

  function recommendFor(text: string) {
    setTaskQuestion(text);
    setRecommendation(runRecommendation(text));
  }

  function submitRecommendation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setRecommendation(runRecommendation(taskQuestion));
  }

  return (
    <main>
      <header className="site-header">
        <a className="brand" href="#top" aria-label="Agent Boundary Atlas 首页">
          <span className="brand-mark">B</span>
          <span>
            <strong>Boundary Atlas</strong>
            <small>Agent 边界图谱</small>
          </span>
        </a>
        <nav aria-label="主导航">
          <a href="#recommend">推荐</a>
          <a href="#atlas">图谱</a>
          <a href="#compare">对比</a>
          <a href="#method">方法</a>
        </nav>
        <span className="header-note">独立研究 · 非官方排名</span>
      </header>

      <section className="hero" id="top">
        <div className="hero-copy">
          <p className="eyebrow">2026 · AI AGENT 选择指南</p>
          <h1>
            先看<span>边界</span>，<br />
            再选 Agent。
          </h1>
          <p className="hero-lead">
            不比谁最火。把任务、环境、工具、权限和持续性放到同一张桌上，
            看清它到底适不适合你。
          </p>
          <a className="primary-link" href="#recommend">
            描述你的任务 <span aria-hidden="true">↓</span>
          </a>
        </div>
        <div className="hero-number" aria-label="首批收录十个 Agent">
          <span>首批收录</span>
          <strong>10</strong>
          <p>5 个编程 Agent<br />5 个办公 / 通用 Agent</p>
          <i aria-hidden="true">✦</i>
        </div>
      </section>

      <section className="legend" id="method" aria-labelledby="legend-title">
        <div className="section-intro">
          <p className="eyebrow">BOUNDARY LENS</p>
          <h2 id="legend-title">一个 Agent，至少看五层边界</h2>
        </div>
        <div className="legend-grid">
          {boundaryLegend.map(([number, title, text]) => (
            <article key={number}>
              <span>{number}</span>
              <h3>{title}</h3>
              <p>{text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="recommender" id="recommend" aria-labelledby="recommend-title">
        <div className="recommender-copy">
          <p className="eyebrow">TASK → BOUNDARY → MATCH</p>
          <h2 id="recommend-title">说说你要做什么，先找一个合适起点。</h2>
          <p>
            推荐不会让模型直接选“赢家”。系统只识别任务、环境、自主程度和权限偏好，
            再用固定规则匹配这 10 个 Agent。
          </p>
          <div className="example-prompts" aria-label="示例问题">
            {recommendationExamples.map((example) => (
              <button key={example} type="button" onClick={() => recommendFor(example)}>
                {example}
              </button>
            ))}
          </div>
        </div>

        <div className="recommender-panel">
          <form onSubmit={submitRecommendation}>
            <label htmlFor="task-question">你想交付什么结果？</label>
            <textarea
              id="task-question"
              value={taskQuestion}
              maxLength={500}
              onChange={(event) => setTaskQuestion(event.target.value)}
              placeholder="例如：我要做一个网站，希望 AI 能在 IDE 里写代码，但每一步都让我审查……"
            />
            <div className="question-actions">
              <small>{taskQuestion.length} / 500 · 不保存你的提问</small>
              <button type="submit">推荐 Agent →</button>
            </div>
          </form>

          {recommendation && (
            <div className={`recommendation-output ${recommendation.state}`} aria-live="polite">
              {recommendation.state === "recommended" ? (
                <>
                  <div className="recommendation-summary">
                    <span>已完成边界匹配</span>
                    <p>{recommendation.message}</p>
                  </div>
                  <div className="recommendation-list">
                    {recommendation.recommendations.map((item, index) => {
                      const agent = agents.find((candidate) => candidate.id === item.agentId);
                      if (!agent) return null;
                      return (
                        <article key={item.agentId} className={index === 0 ? "primary-match" : ""}>
                          <div className="match-rank">{index === 0 ? "首选" : `备选 ${index}`}</div>
                          <div className="match-title">
                            <span style={{ background: agent.color }}>{agent.mark}</span>
                            <div><strong>{agent.name}</strong><small>{agent.role}</small></div>
                          </div>
                          <p className="match-reasons">
                            {item.reasons.length ? `匹配：${item.reasons.join("、")}` : "与核心任务类型匹配"}
                          </p>
                          <p className="match-boundary">边界提醒：{item.boundary}</p>
                          <button type="button" onClick={() => toggleAgent(agent.id)}>
                            {selected.includes(agent.id) ? "已加入对比 ✓" : "+ 加入对比"}
                          </button>
                        </article>
                      );
                    })}
                  </div>
                </>
              ) : (
                <div className="clarification">
                  <strong>{recommendation.state === "rejected" ? "这段描述暂时无法处理" : "还需要一点信息"}</strong>
                  <p>{recommendation.message}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      <section className="atlas" id="atlas" aria-labelledby="atlas-title">
        <div className="atlas-heading">
          <div>
            <p className="eyebrow">CHOOSE YOUR CONTEXT</p>
            <h2 id="atlas-title">你现在想让 Agent 做什么？</h2>
          </div>
          <p>优势和劣势只有放进具体场景才有意义。</p>
        </div>

        <div className="goal-tabs" role="group" aria-label="选择使用目标">
          {goals.map((goal) => (
            <button
              className={activeGoal === goal.id ? "active" : ""}
              key={goal.id}
              type="button"
              aria-pressed={activeGoal === goal.id}
              onClick={() => setActiveGoal(goal.id)}
            >
              <strong>{goal.label}</strong>
              <span>{goal.description}</span>
            </button>
          ))}
        </div>

        <div className="filter-row">
          <div className="category-filter" role="group" aria-label="Agent 类型筛选">
            {[
              ["all", "全部"],
              ["coding", "编程 Agent"],
              ["work", "办公 / 通用"],
            ].map(([id, label]) => (
              <button
                key={id}
                type="button"
                className={category === id ? "active" : ""}
                aria-pressed={category === id}
                onClick={() => setCategory(id as CategoryFilter)}
              >
                {label}
              </button>
            ))}
          </div>
          <label className="search-field">
            <span className="sr-only">搜索 Agent</span>
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="搜索名称、公司或角色"
            />
          </label>
          <span className="result-count">{filteredAgents.length} / 10</span>
        </div>

        {notice && <p className="notice" role="status">{notice}</p>}

        <div className="agent-grid">
          {filteredAgents.map((agent, index) => {
            const isSelected = selected.includes(agent.id);
            return (
              <article
                className={`agent-card ${isSelected ? "selected" : ""}`}
                key={agent.id}
                style={{ "--agent-color": agent.color } as CSSProperties}
              >
                <div className="card-topline">
                  <span className="card-index">{String(index + 1).padStart(2, "0")}</span>
                  <span className="category-pill">{agent.categoryLabel}</span>
                </div>
                <div className="agent-title-row">
                  <span className="agent-mark" aria-hidden="true">{agent.mark}</span>
                  <div>
                    <h3>{agent.name}</h3>
                    <p>{agent.maker}</p>
                  </div>
                </div>
                <p className="agent-role">{agent.role}</p>
                <p className="agent-summary">{agent.oneLiner}</p>
                <p className="agent-intro">{agent.intro}</p>

                <dl className="card-boundaries">
                  <div>
                    <dt>运行</dt>
                    <dd>{agent.environment}</dd>
                  </div>
                  <div>
                    <dt>权限</dt>
                    <dd>{agent.permission}</dd>
                  </div>
                </dl>

                <details>
                  <summary>展开优势与边界代价</summary>
                  <div className="pros-cons">
                    <div>
                      <h4>适合你的理由</h4>
                      <ul>{agent.strengths.map((item) => <li key={item}>{item}</li>)}</ul>
                    </div>
                    <div>
                      <h4>需要接受的代价</h4>
                      <ul>{agent.limits.map((item) => <li key={item}>{item}</li>)}</ul>
                    </div>
                  </div>
                </details>

                <div className="card-actions">
                  <button
                    className={isSelected ? "compare-toggle selected" : "compare-toggle"}
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() => toggleAgent(agent.id)}
                  >
                    {isSelected ? "已加入对比 ✓" : "+ 加入对比"}
                  </button>
                  <a href={agent.officialUrl} target="_blank" rel="noreferrer">
                    官方来源 ↗
                  </a>
                </div>
              </article>
            );
          })}
        </div>

        {!filteredAgents.length && (
          <div className="empty-state">
            <strong>没有匹配结果</strong>
            <p>换一个目标、类型或搜索词试试。</p>
          </div>
        )}
      </section>

      <section className="comparison" id="compare" ref={compareRef} aria-labelledby="compare-title">
        <div className="comparison-heading">
          <div>
            <p className="eyebrow">SIDE BY SIDE</p>
            <h2 id="compare-title">把边界摆在一起看</h2>
          </div>
          <div className="comparison-actions">
            <button type="button" onClick={copyShareLink}>{shareState}</button>
            {selected.length > 0 && (
              <button className="quiet-button" type="button" onClick={() => setSelected([])}>
                清空
              </button>
            )}
          </div>
        </div>

        {selectedAgents.length < 2 ? (
          <div className="comparison-placeholder">
            <span>{selectedAgents.length}/3</span>
            <div>
              <strong>至少选择 2 个 Agent</strong>
              <p>你可以做同类对比，也可以跨类型看清它们为何不能简单互换。</p>
            </div>
          </div>
        ) : (
          <div className="comparison-scroll" tabIndex={0} aria-label="Agent 边界对比表">
            <div
              className="comparison-table"
              style={{ "--compare-count": selectedAgents.length } as CSSProperties}
            >
              <div className="comparison-corner">
                <span>比较维度</span>
                <small>没有综合总分</small>
              </div>
              {selectedAgents.map((agent) => (
                <div className="comparison-agent-head" key={agent.id}>
                  <span className="mini-mark" style={{ background: agent.color }}>{agent.mark}</span>
                  <div>
                    <strong>{agent.name}</strong>
                    <small>{agent.role}</small>
                  </div>
                  <button type="button" onClick={() => toggleAgent(agent.id)} aria-label={`从对比中移除 ${agent.name}`}>
                    ×
                  </button>
                </div>
              ))}

              {comparisonFields.flatMap((field) => [
                <div className="comparison-label" key={`${field.key}-label`}>
                  <strong>{field.label}</strong>
                  <small>{field.hint}</small>
                </div>,
                ...selectedAgents.map((agent) => (
                  <div className="comparison-cell" key={`${field.key}-${agent.id}`}>
                    {String(agent[field.key])}
                  </div>
                )),
              ])}

              <div className="comparison-label verdict-label">
                <strong>优势 / 代价</strong>
                <small>与当前目标一起阅读</small>
              </div>
              {selectedAgents.map((agent) => (
                <div className="comparison-cell verdict" key={`verdict-${agent.id}`}>
                  <div>
                    <span>+</span>
                    <p>{agent.strengths.join(" · ")}</p>
                  </div>
                  <div>
                    <span>−</span>
                    <p>{agent.limits.join(" · ")}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      <section className="source-note">
        <div>
          <p className="eyebrow">SOURCE POLICY</p>
          <h2>事实来自官方，判断说明条件。</h2>
        </div>
        <p>
          当前版本只采用官方产品页、官方文档或官方帮助中心。没有公开写清的权限和数据边界，
          直接标记为“官方未完整说明”，不使用二手文章补齐。
        </p>
        <span>最后核验 · {VERIFIED_AT}</span>
      </section>

      <footer>
        <div className="brand footer-brand">
          <span className="brand-mark">B</span>
          <span><strong>Boundary Atlas</strong><small>Agent 边界图谱</small></span>
        </div>
        <p>适合不代表最好，能力更大也意味着权限与风险面更大。</p>
        <span>V2 · 10 Agents · 每周复核</span>
      </footer>

      {selectedAgents.length > 0 && (
        <aside className="compare-dock" aria-label="已选择的 Agent">
          <div className="dock-agents">
            {selectedAgents.map((agent) => (
              <button key={agent.id} type="button" onClick={() => toggleAgent(agent.id)}>
                <span style={{ background: agent.color }}>{agent.mark}</span>
                {agent.name}
                <i aria-hidden="true">×</i>
              </button>
            ))}
            {Array.from({ length: 3 - selectedAgents.length }).map((_, index) => (
              <span className="empty-slot" key={index}>+</span>
            ))}
          </div>
          <button className="dock-action" type="button" onClick={showComparison} disabled={selectedAgents.length < 2}>
            {selectedAgents.length < 2 ? "再选一个" : `对比 ${selectedAgents.length} 个 Agent`}
          </button>
        </aside>
      )}
    </main>
  );
}
