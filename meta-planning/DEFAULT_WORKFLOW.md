# 默认工作流规则（配合 meta-planning 元技能）

## 触发条件（什么时候必须启用）
满足任一条件即启用：
- ≥3 步任务
- 跨多文件/多模块
- 需要查资料/对齐规范/多轮试错
- 预计会产生 >5 次工具调用

## 启用步骤（开始写代码前）
1. 在 `/root/.cursor/plans/` 下创建任务目录：`YYYYMMDD-短标题/`
2. 从仓库模板复制三文件到任务目录：
   - `meta-planning/templates/task_plan.md` -> `task_plan.md`
   - `meta-planning/templates/notes.md` -> `notes.md`
   - `meta-planning/templates/deliverable.md` -> `deliverable.md`
3. 填好 `task_plan.md`（至少包含 Goal/Scope/Open Questions/Risks/Rollback/Phases/Todos）

## 执行规则（写代码过程中）
- **决策前回读**：每次做关键取舍/改变方向前，先回读 `task_plan.md` 再行动
- **发现写 notes**：代码定位、接口差异、坑点、排查路径、最终结论都写入 `notes.md`
- **按需调用领域技能**：当进入具体实现时，再调用 `AGENTS.md` 中的领域技能（例如 UI 用 `frontend-design`，测试用 `webapp-testing`）
- **敏感信息禁入**：任何密钥/口令/私钥/未脱敏 token 不允许写入 plan/notes/deliverable

## 收尾规则（完成后）
1. `deliverable.md` 必须写清：变更点、验证方式、发布步骤、回滚方案
2. 将 `task_plan.md` 的 Todos/Phases 勾选完成

