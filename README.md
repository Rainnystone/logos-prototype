# LOGOS — Linguistic Oriented Game Orchestration Studio

## 项目简介

LOGOS 是一个 AI 驱动的叙事编排引擎 (narrative orchestration engine)，面向交互式小说 (interactive fiction) 场景。引擎以 Beat 为最小生成单位，通过 Phase/Scene 层级管理叙事节奏，将 LLM 生成、状态管理、审计校验等环节编排为可控的闭环流程。代码层面保持题材无关 (genre-agnostic) 和故事无关 (story-agnostic)，所有叙事内容均通过 story-packages 加载。

## 技术栈

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript (strict mode)
- **Testing**: Vitest
- **Schema Validation**: Zod
- **Story Package Format**: YAML

## 关联仓库

| 仓库 | 地址 | 职责 |
|------|------|------|
| **LOGOS** (本仓库) | https://github.com/lishtys/LOGOS | 引擎实现代码 |
| **LOGOS-Design** | https://github.com/Rainnystone/LOGOS-Design | 设计规格文档（权威依据） |

> 规格与实现如有矛盾，以 `LOGOS-Design/LOGOS-SPEC` 为准（除非有 ADR 明确覆盖）。
> 切换工作电脑时，需将两个仓库 clone 到同级目录下：
> ```
> GitHub/
> ├── LOGOS/              ← 本仓库
> └── LOGOS-Design/       ← 设计仓库
>     └── LOGOS-SPEC/     ← 规格目录
> ```

## 快速开始

```bash
# 1. Clone 仓库
git clone <repo-url> LOGOS
cd LOGOS

# 2. 安装依赖
npm install

# 3. 配置环境变量
cp .env.example .env.local
# 编辑 .env.local，填入 API Key

# 4. 启动开发服务器
npm run dev
```

开发服务器默认运行在 `http://localhost:3000`。

## 目录结构

```
LOGOS/
├── src/
│   ├── app/              # Next.js App Router 页面
│   ├── engine/           # 核心引擎
│   │   ├── orchestrator.ts
│   │   ├── modules/      # 各功能模块
│   │   └── api-adapter/  # LLM API 适配层
│   ├── types/            # TypeScript 类型定义
│   └── loader/           # Story package 加载器
├── story-packages/       # 叙事内容包（YAML）
├── tests/                # 测试文件
├── execution-plans/      # 分阶段执行计划
├── docs/                 # 项目文档
│   └── claude-code-guide/  # Claude Code 团队协作指南
└── .claude/              # Claude Code 配置
```

## 开发流程

1. **查阅 execution-plans/** — 确认当前阶段的任务分解
2. **启动 Ralph (Claude Code)** — 按 PROMPT.md 指令执行实现
3. **TDD 开发** — 先写测试 (RED) → 实现 (GREEN) → 重构 (IMPROVE)
4. **提交 PR** — branch 命名: `feature/XX-phase-name`
5. **Code Review** — 人工审阅后合并到 develop

详细的 Claude Code 协作指南请参阅: [docs/claude-code-guide/](./docs/claude-code-guide/)

## 相关命令

```bash
npm run dev          # 启动开发服务器
npm run build        # 生产构建
npm run lint         # ESLint 检查
npm run test         # 运行测试
npm run test:coverage  # 测试覆盖率报告
npm run type-check   # TypeScript 类型检查
```

## License

Private — All rights reserved.
