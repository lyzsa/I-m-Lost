# 36 小时执行清单

标记：已完成指本骨架；未勾选均需后续开发。A/B/C 为占位队员名，各人垂直负责一条路径。

## 分工

| 人员 | 负责 | 首次交付 |
|---|---|---|
| A — Classroom | 教授 Auth、上传/PDF viewer、创建/join、同步与 review | 12h 两设备同步 |
| B — Feedback | 区域框选、信号存取、热图/统计、saved list、相关 RLS | 12h 保存后教授可见 |
| C — Context & integration | DB/RPC 基础与权限协作、AI 解释/指南、部署、可选转录 | 18h slide-only AI 闭环 |

A/B 不等 C 完成：先基于 architecture 接口使用 mock adapter，6h 前一起冻结字段。合并负责人轮值；每 4h 合并可运行主线。开发分支 `codex/classroom` / `codex/feedback` / `codex/context`。

## 时段

- 0–3h：三人读决策；确定成员/owner schema；部署空项目；准备三页 PDF 和两学生账号。
- 3–10h：A 上传+join；B 反馈+归一化覆盖层；C migration/RLS/RPC+AI上下文接口。
- 10–18h：跨设备同步与持久化；review 状态事务；slide-only explanation + saved list。
- 18–24h：personalized guide；历史页；端到端闭环和权限验证。
- 24–28h：QR、转录、整簇统计按余量加入；核心未通过则放弃这些扩展。
- 28–32h：冻结功能，重连/双击/缩放/错误状态；部署演练。
- 32–36h：仅修阻塞 bug；准备录屏和离线演示备份，三人演讲彩排。

## 已完成骨架

- [x] Next.js/TypeScript/Tailwind 页面与 demo
- [x] 共享 domain types、review 状态转换与空间统计测试
- [x] PRD、决策、接口约定、SQL 草案、环境示例与 CI

## P0 可直接转成 GitHub issues

- [ ] A1：教授 Auth + 私有 PDF 上传/渲染/文本提取；验收：三页 PDF 所见与文本页码一致
- [ ] C1：实现 RLS、受控 join/advance RPC、Storage policy；验收：两课堂越权测试通过
- [ ] A2：创建课堂和 code join；验收：无效 code/结束课堂错误明确
- [ ] A3：Realtime + detached/Back to Live + review 事务；验收：两设备、双击与重连不跳页
- [ ] B1：signals API/幂等 + I'm Lost + region 多选；验收：刷新保留、重试不翻倍
- [ ] B2：PDF 覆盖层与教授统计；验收：缩放对齐、无区域不发热、重叠加深
- [ ] B3：历史页和个人 saved items；验收：只能读本人保存内容
- [ ] C2：服务端 slide-only Explain Now；验收：引用来源、失败不丢 signal
- [ ] C3：个人 Study Guide；验收：仅本人条目、按页列来源和练习
- [ ] ALL：部署 + 两学生完整验收，完成 PRD 的九项标准

## P1（可砍）

- [ ] A：QR 指向 join URL
- [ ] B：相交矩形连通 cluster + 整簇分类去重
- [ ] C：显式录音开关、实时转录、最近片段来源时间戳

## 完成规则

每个任务交付代码、最短复现/验收步骤和已知限制。没有连接真实服务时标注 demo/mock，不把按钮存在当功能完成。CI 通过后再合并。28h 后不加新功能。
