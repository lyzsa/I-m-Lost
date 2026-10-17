# GitHub 协作与继续开发

私有仓库：https://github.com/lyzsa/I-m-Lost

用户填写的名称为 “I'm Lost”，GitHub 将地址规范化为 `I-m-Lost`。默认分支为 `main`。项目骨架包含 README、PRD、决策、TASKS、CI 与本地 demo。

## 新电脑 / 队友启动

```sh
git clone https://github.com/lyzsa/I-m-Lost.git
cd I-m-Lost
npm ci
cp .env.example .env.local
npm run dev
```

克隆私有仓库需要 GitHub 授权和仓库访问权。不要将 token 写进 URL 或代码。演示不需要真实密钥；接入 Supabase/AI 时再配置本地环境。

## 开发与保存

已有克隆先执行 `git pull --ff-only`，然后创建 `codex/classroom`、`codex/feedback` 或 `codex/context` 功能分支。每个分支对应 TASKS.md 的责任范围，提交后发 PR 到 main。

仓库所有者可在 Settings → Collaborators 邀请两名队友。已有 CI，分支保护按团队需要在 GitHub 设置。尚未替团队选择开源许可证，也没有添加队友。

任务以 TASKS.md 为准；后续可按其中编号创建 issues。产品决策在 docs/decisions.md，下次开发入口在 docs/CONTINUE.md。
