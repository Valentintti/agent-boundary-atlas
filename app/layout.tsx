import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Agent Boundary Atlas｜AI Agent 边界图谱",
  description:
    "用任务、环境、工具、权限和持续性五层边界，对比 10 款主流 AI Agent。",
  openGraph: {
    title: "Agent Boundary Atlas｜先看边界，再选 Agent",
    description:
      "Claude Code、Codex、Cursor、Manus、扣子、WorkBuddy、Qoder、DuMate、Kimi Work、Trae 边界对比。",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
