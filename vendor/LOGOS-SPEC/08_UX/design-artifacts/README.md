# UI 设计稿落点说明

这个目录用于存放后续由 Gemini、Figma、手工线框或其他设计工具产出的 UI/UX 设计稿。之所以单独建立这一级目录，是因为 `08_UX/` 上层文件负责说明信息架构、用户流和界面边界，而这里负责沉淀具体设计轮次的产物；只有把“规范性说明”和“设计轮次输出”分开，后续 coding agent 才不会把讨论稿误当成最终界面规范。

## 当前已有产物

- `ui-round-1-wireframes.md`：当前主工作台 round-1 结构说明与面板映射
- `assets/ui-round-1-reference-dark-workbench.jpg`：视觉气质与信息密度参考图
- `assets/ui-round-1-sketch-layout.png`：当前认可的结构草图

当前这批 round-1 产物用于收口桌面端工作台的结构、阅读重心和状态面板分工。它们可以包含较高完成度的视觉参考，但仍然只是设计轮次档案，不代表 LOGOS 已经进入最终品牌视觉冻结阶段。

建议把设计稿按轮次和职责拆开，而不要把所有内容继续塞进一篇长文。一个比较稳的命名方式是：

- `ui-round-1-workbench.md`：主工作台结构方案
- `ui-round-1-wireframes.md`：低到中保真线框与面板布局
- `ui-round-1-screen-spec.md`：关键页面与组件职责说明
- `assets/`：如果有截图、导出图或标注图，统一放在这个子目录

如果后续 UI 方案已经成熟，需要把稳定结论回写到上层规范，那么应优先更新 `08_UX/information-architecture.md`、`08_UX/key-user-flows.md` 和 `08_UX/screen-inventory.md`；这个目录里的文件则保留为设计轮次档案。
