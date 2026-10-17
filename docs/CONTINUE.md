> **Superseded for the 10-hour hackathon build by [PLAN.md](../PLAN.md).** Kept for reference; do not implement from this file.

# 给下一次开发的入口

可直接把以下内容发给开发助手：

> 请继续 LOST 项目。先读 README.md、docs/decisions.md、docs/PRD-draft.md、docs/architecture.md 和 TASKS.md。不要重新讨论商业模式。当前是本地交互 scaffold，真实 Supabase/PDF/AI 尚未接通。优先做 P0 的两设备课堂闭环，按 A/B/C 分工接口实现。保留 Presenting → Reviewing → Next，区分 quick Lost count 和 region heatmap，保持分类多选与 Back to Live。AI 必须服务端调用，默认 Save for Later。先检查 GitHub remote 和已有实现再修改，勿把 demo 当成真实服务。

## 首次启动建议

1. `npm ci` 后运行检查和 /demo。
2. 团队选择一个 Supabase 项目，将 .env.example 复制为 .env.local，填入公开客户端配置。
3. 三人共同审核 schema，先补 RLS / join RPC / advance RPC 和权限测试。
4. 选择 TASKS 的 A1、B1、C1 并行分工，由用户自行分配成员；6h 内合并一条闭环。
5. GitHub 仓库为 https://github.com/lyzsa/I-m-Lost，按 docs/github-setup.md 克隆并邀请队友。

所有用户确认和实现默认值在 decisions.md 分开记录。之后有变更时更新这个文件和 TASKS，而不是只留在聊天里。
