已按计划实现（且未改动计划文件）
新增元技能条目：已在 AGENTS.md 里新增 meta-planning（不改任何现有 skill）。
三文件模板已落地：已新增
meta-planning/templates/task_plan.md
meta-planning/templates/notes.md
meta-planning/templates/deliverable.md
默认工作流规则已固化：meta-planning/DEFAULT_WORKFLOW.md
元技能说明（如何用、何时触发、如何与现有技能协作）：meta-planning/SKILL.md
你接下来怎么用（复杂任务触发时）
创建任务目录：/root/.cursor/plans/YYYYMMDD-短标题/
复制模板三文件：从 meta-planning/templates/ 拷到该目录
执行中：先按 meta-planning 记录/回读，再按需调用 AGENTS.md 里的领域技能完成具体实现

使用方式：（如果你的环境支持 skills 命令）：在对话框要求我执行

openskills read meta-planning

我会先加载元技能说明，再按说明落盘到 /root/.cursor/plans/...。
