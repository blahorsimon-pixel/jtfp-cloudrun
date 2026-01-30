# meta-planning（元技能）

## 什么时候用
当任务满足任一条件时启用本元技能（否则可跳过）：
- ≥3 个明确步骤
- 跨多文件/跨模块改动
- 需要查资料/对齐规范/多轮试错
- 预计会产生 >5 次工具调用（搜索、读代码、改代码、测试、修复）

## 核心规则（三文件工作流）
在开始写代码前，先创建一个任务文件夹（**不要把密钥/口令写进任何文件**）：

- 路径：`/root/.cursor/plans/YYYYMMDD-短标题/`
- 文件：
  - `task_plan.md`：目标、范围、阶段、待确认问题、风险/回滚、todo 勾选
  - `notes.md`：研究摘录、代码定位、决策理由、接口/数据结构、排查记录
  - `deliverable.md`：最终交付（变更点、验证方式、发布步骤、回滚方案）

执行循环：
- **每个关键决策前**回读 `task_plan.md`，确保不跑偏
- 发现与定位写入 `notes.md`（包含关键文件路径、关键结论、为什么这么做）
- 完成后写 `deliverable.md` 并在 `task_plan.md` 勾选完成

## 如何与现有技能协作（关键）
本元技能只管“规划/记录/交付”，不替代任何领域技能。

- 需要做 UI/前端体验：调用 `frontend-design`
- 需要做浏览器端验证：调用 `webapp-testing`
- 需要做文档/方案：调用 `doc-coauthoring`
- 其它能力：按 `AGENTS.md` 里的 skills 列表按需调用

（技能调用方式以你环境的 skills 系统为准，例如：`openskills read <skill-name>`）

## 模板
仓库内提供模板，可直接复制到任务文件夹：
- `meta-planning/templates/task_plan.md`
- `meta-planning/templates/notes.md`
- `meta-planning/templates/deliverable.md`

