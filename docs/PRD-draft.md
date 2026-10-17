# LOST — PRD draft v0.1

## 目标

让教授在每页结束时看到困惑发生的位置和类型，让学生保留自己的困惑并获取有课堂上下文的复习帮助。演示目标：一位教授、两位学生，跨设备完成一份三页 PDF 的课堂闭环。

## 教授路径

登录 → 上传 PDF（建议演示限制 20MB/50 页，可调整）→ 创建课堂 → 显示 code 与指向 join URL 的 QR → Presenting。点击 Review 停留本页，显示 heatmap、快捷 Lost count、区域 count；点击区域查看分类数量。可切 clean layer。再点击 Next 更新 live slide 并回到 Presenting。无反馈也执行 review；旧页记录不删除。最后一页 Review 后 End Class，进入历史摘要。

## 学生路径

输入 code 或扫码 → 加入 → 默认跟随 live slide。手动翻页进入 detached，live 变化不覆盖浏览页；Back to Live 立即切回当前 live。I'm Lost 直接保存 slide-level signal，不虚构区域。拖拽有效矩形 → 多选分类 → 默认 Save for Later，或 Explain Now。请求失败可重试，成功状态必须等持久化确认。

Explain Now 也先保存信号，AI 失败不会丢失反馈。课后仅本人看到 saved items，可按页复习并生成 Personalized Study Guide（困惑概念、解释、练习问题、来源），不生成教授教学建议。

## 统计语义

- 快捷 Lost count 和 region count 分开显示；学生人数必须按成员去重后另标。
- 每个区域可有多个分类，分类总和可以超过区域数。
- 无区域的信号不进入空间热图。
- 坐标相对 PDF 页面内容框，排除工具栏和留白；缩放和屏幕大小不影响覆盖位置。
- 热度来自重叠数量。点选与整簇口径必须在 UI 标注。MVP 点选显示该点覆盖信号分类；P1 将相交矩形合并成连通 cluster，整簇去重 signal ID 统计。

## AI 与转录

服务端建立上下文：session/slide 的提取文本、选中区域、分类，以及当前页开始到请求时刻最近最多 120 秒已完成转录片段；限制总 token，不使用未来片段或其他课堂内容。记录来源页码和片段时间戳。无转录明确标注 slide-only。扫描 PDF 无文本时明确提示资料不足；视觉理解不作为 MVP 依赖。转录可关闭，不阻断反馈系统。

## 验收

1. 学生加入后看到同一 PDF 同一 live 页；无效 code、已结束课堂有明确错误。
2. 教授第一次 Next/Review 不切页，第二次才切；其他学生不能修改 live。
3. Detached 学生不被强制翻页，Back to Live 正确恢复。
4. 快捷 Lost 只影响 count；两个重叠矩形交集更深；分类多选计数正确。
5. 修改窗口大小后选区仍贴合页面；刷新后真实信号仍在。
6. 同一提交重试不重复计数；A 课堂不能读 B 课堂数据；学生看不到同伴的私有 saved/AI 内容。
7. 无麦克风权限、无转录服务仍可完成全部反馈闭环。
8. Explain Now 引用当前页和可用转录；AI 故障时已保存条目可复习。
9. 课后指南只基于本人保存条目，列出可追溯来源。

## 范围与降级

P0：PDF、课堂加入、同步、review、信号持久化、热图和统计、个人复习列表、最小 slide-only AI 解释及指南。P1：QR、转录、聚类优化、历史导出。QR 若来不及，用 code + join link 保留完整加入路径。转录和视觉理解不得阻塞 P0。

不做 LMS 集成、大学采购、自动教学决策、成绩评估、完整录音回放。
