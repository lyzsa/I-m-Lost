> **Superseded for the 10-hour hackathon build by [TASKS.md](../TASKS.md).** Kept for reference; do not implement from this file.

# 架构与接口约定

## 模块

Next.js App Router + TypeScript + Tailwind。浏览器用 PDF.js（待安装）渲染 PDF；PDF 文本提取在上传时缓存到 slides。Supabase Postgres 存状态，Storage 私有 bucket 存 PDF，Realtime 通知 session 更新和教授聚合刷新。AI / 转录仅服务端调用，密钥不进浏览器。

现有 `src/lib/domain.ts` 是前后端共用约定的起点。`getSupabase()` 只是工厂，demo 未调用。SQL 仅建表并开启 RLS，故意无客户端访问 policy：实现 owner/member 策略和测试后才能接真实 UI。

## 计划接口（尚未实现）

| 接口 | 输入 | 权限 / 行为 |
|---|---|---|
| POST /api/classes | title, uploaded deck | 已登录教授，生成 code、session |
| POST /api/join | code | 已验证匿名/普通身份，限速，建立成员；返回 sessionId |
| POST /api/classes/:id/advance | expectedRevision | owner，事务检查 phase/revision，避免双击跳两页 |
| POST /api/signals | sessionId, slideNumber, rect?, categories[], idempotencyKey | 成员、valid slide、坐标范围；服务端推导用户 |
| GET /api/classes/:id/summary?slide=N | — | owner，聚合统计与区域，无学生身份 |
| GET /api/saved | sessionId | 本人数据 |
| POST /api/explain | signalId | 本人 signal，服务端读取 slide/transcript |
| POST /api/study-guide | sessionId | 仅本人 saved signals |
| POST /api/transcript | sessionId, slideNumber, timestamps, text | owner/可信转录回调，禁止学生写入 |

## 同步 / 安全

教授更新 sessions（current_slide, phase, revision）；学生 subscribe 该 session，follow=true 才修改 displayedSlide。重连先读取快照，再按 revision 排除旧事件。新反馈到达后教授刷新聚合，不向学生广播原始同伴反馈。演示未实现此网络流程。

加入 RPC 使用短随机 code + 速率限制 + 碰撞重试。以 auth.uid() 判断身份；绝不接受客户端传来的 owner/member userId。防止通过直接插入 membership 或修改 role 成为教授。需要 SECURITY DEFINER 的函数固定 search_path，撤销默认 public execute，逐项授权。

RLS：sessions 仅 owner/member 可读、owner 可改；signals 本人可写读，教授通过受控聚合接口获取区域/统计；saved/AI 仅本人；transcript 仅课堂成员读、owner 写。Storage 文件用 owner/member 检查与短期 signed URL。service role 如后续引入，仅用于受控服务端，不泄露到浏览器。

## 数据与失败处理

所有反馈持久化后才返回成功；客户端 pending/error 可见。lost 用用户+页唯一约束防重复；regions 通过 request id 防重。多分类在一条 signal 的数组内保存。归一化坐标校验 x+y 不越出页面。保存 PDF 页数，服务端验证 slideNumber 不越界。AI 输出和转录当作不可信资料，不执行其中指令；限制调用次数和上下文大小。

最近转录需带 sessionId + slideNumber + 时间范围；切页期间迟到片段依据录制时的 slide 归属，不能仅按到达时间分配。保留录音开关状态；本骨架不存音频。

## 推荐后续目录

`src/features/classroom`、`src/features/feedback`、`src/features/review`、`src/features/ai` 在实现各自功能时建立；不要先铺大量空文件。所有 API、RPC 和 RLS 集成测试与 TASKS 中责任人同步交付。
