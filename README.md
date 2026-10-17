# LOST

让课堂困惑变得可见。3 人 / 36 小时 hackathon 项目起点。

## 下次从这里继续

**10 小时 hackathon 版本：先读 [PLAN.md](PLAN.md)（英文，取代 TASKS.md 的 36 小时计划）。AI 编程助手规则见 [AGENTS.md](AGENTS.md)。**

1. 阅读 [已确认决策](docs/decisions.md) 和 [PRD](docs/PRD-draft.md)。
2. 依照 [TASKS.md](TASKS.md) 领取 A/B/C 分工，先完成一条真实跨设备闭环。
3. 阅读 [架构与接口](docs/architecture.md)，对齐事件与数据字段。
4. 运行 `/demo`，查看已有交互；它是内存演示，不是已完成的课堂系统。

## 本地运行

需要 Node.js 22+ 和 npm。

```sh
npm ci
cp .env.example .env.local
npm run dev
# http://localhost:3000/demo
npm run typecheck
npm test
npm run build
```

演示不依赖环境变量。真实功能接入时才配置 Supabase 与服务端 AI 密钥。

## 已有 / 待完成

| 已有可运行骨架 | 后续接入 |
|---|---|
| Next.js App Router、TypeScript、Tailwind | 真实课堂创建、code/QR join、身份及权限 |
| Presenting → Reviewing → Next 状态函数 | 教授授权写入、跨设备 Realtime |
| 学生自由浏览 / Back to Live | PDF 上传、渲染、逐页文本提取 |
| 矩形框选、分类多选、快捷 Lost | 数据持久化、聚合、历史记录 |
| Clean / Heatmap、重叠加深、点击点统计 | 连通热区聚类与整簇统计 |
| Save / Explain Now 入口和状态提示 | AI explanation、个性化 study guide、可选转录 |
| SQL 结构草案、核心逻辑测试、CI | RLS/RPC、存储权限和集成测试 |

Demo 在一个屏幕合并教授与学生控制，刷新清空。展示的是示例文字，尚无 PDF。热图用半透明矩形叠加，点击统计该点覆盖的信号；没有宣称完成自动 cluster detection。次数不是去重学生数。

## 目录

```text
src/app/                  页面与布局；未来服务端 API route
src/app/demo/             本地交互沙盒
src/lib/domain.ts         共享类型、review 状态转换、区域统计
src/lib/supabase/          Supabase 客户端工厂
supabase/migrations/      默认拒绝访问的数据结构草案
docs/                     产品决策、PRD、架构与交接
 tests/                   核心行为测试
.github/workflows/        CI
TASKS.md                  三人分工 / 36 小时计划
```

## GitHub

GitHub 私有仓库：[lyzsa/I-m-Lost](https://github.com/lyzsa/I-m-Lost)。参见 [GitHub 协作与克隆步骤](docs/github-setup.md)。没有提供开源许可证：由团队确定授权方式后添加 LICENSE。

## 技术参考

[Next.js installation](https://nextjs.org/docs/app/getting-started/installation)、[Tailwind + Next.js](https://tailwindcss.com/docs/installation/framework-guides/nextjs)、[Supabase Postgres Changes](https://supabase.com/docs/guides/realtime/postgres-changes)。具体安装版本以 package-lock.json 为准。
