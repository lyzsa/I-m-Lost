# Verification

实际执行结果由交付前更新。核心测试覆盖 review 顺序、页面边界、空间交集、多选分类及无区域信号排除。

手工验证建议：打开 /demo，快速 Lost → 框选→多选→保存→再框一个重叠区域→点击交集→Clean→Review→Next→Browse→Back to Live。demo 不承诺跨设备、刷新持久化、PDF、聚类或 AI。

交付验证：Node 22.21.0，安装完成并生成 lockfile；typecheck、2 项核心测试、Next.js 生产构建通过。浏览器确认 /demo 可加载；窄屏检查后缩小 slide 内文布局。未执行 Supabase migration、真实 PDF、AI、转录或跨设备端到端测试。
