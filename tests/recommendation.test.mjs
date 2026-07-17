import assert from "node:assert/strict";
import test from "node:test";

import {
  ruleProvider,
  runRecommendation,
  validateCandidate,
} from "../app/recommendation.ts";

test("recommends an IDE coding agent for website development", () => {
  const result = runRecommendation("我要开发一个网站，希望在 IDE 里写代码并审查改动");
  assert.equal(result.state, "recommended");
  assert.equal(result.recommendations[0].agentId, "codex");
  assert.ok(result.recommendations[0].reasons.includes("代码开发"));
});

test("recommends a desktop work agent for scheduled office work", () => {
  const result = runRecommendation("我每周要整理本地 Excel 和报告，最好定时执行");
  assert.equal(result.state, "recommended");
  assert.equal(result.recommendations[0].agentId, "workbuddy");
  assert.ok(result.recommendations[0].reasons.includes("办公产物"));
});

test("uses negated environment evidence as a constraint", () => {
  const result = runRecommendation("我要写代码，不想用终端，希望在 IDE 里完成");
  const terminal = result.candidates.find((candidate) => candidate.value === "terminal");
  assert.equal(terminal?.status, "negated");
  assert.equal(result.recommendations[0].agentId, "cursor");
});

test("asks for clarification when no current task is grounded", () => {
  assert.equal(runRecommendation("我想提高效率").state, "needs_clarification");
  assert.equal(runRecommendation("以前做过写代码，现在没想好").state, "needs_clarification");
});

test("rejects extra fields and ungrounded evidence", () => {
  const input = "我要写代码";
  const extra = {
    ...ruleProvider.extract(input)[0],
    winner: "codex",
  };
  assert.equal(validateCandidate(extra, input).valid, false);
  assert.equal(
    validateCandidate(
      { fieldId: "taskType", value: "code", confidence: 0.9, evidence: "并不存在", status: "asserted" },
      input,
    ).valid,
    false,
  );
});

test("falls back to deterministic rules when a provider fails", () => {
  const result = runRecommendation("我要写代码", {
    extract() {
      throw new Error("provider timeout");
    },
  });
  assert.equal(result.fallbackUsed, true);
  assert.equal(result.state, "recommended");
});

test("rejects overlong input without changing recommendation state", () => {
  const result = runRecommendation("写代码".repeat(200));
  assert.equal(result.state, "rejected");
  assert.deepEqual(result.recommendations, []);
});
