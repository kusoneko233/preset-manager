# Codex 风格 UI 与 AI 抽屉实现计划

> **给后续执行者看的要求：** 按任务清单逐项实现和验证。每个阶段完成后再进入下一阶段，不要把视觉、交互、构建和发布混在一起处理。

**目标：** 将预设管理器重构成更简洁利落的 Codex 式工作台，并把 AI 助手限制在预设工作区内，以“底部输入胶囊”和“展开抽屉”两种状态呈现。

**架构：** 保持现有 Vue 组件结构和 Pinia 状态管理。主要修改 `App.vue` 的布局、几个主组件的视觉层级，以及 `AiAssistant.vue` 的展示方式，不改预设数据结构。

**技术栈：** Vue 3 单文件组件、Pinia、现有 Font Awesome 图标、`pnpm build`，酒馆助手通过 `http://localhost:5500/dist/preset-manager/index.js` 实时加载。

---

### 任务 1：视觉基础

**涉及文件：**
- 修改：`src/preset-manager/App.vue`
- 修改：`src/preset-manager/components/SplitHandle.vue`
- 修改：`src/preset-manager/components/TitleBar.vue`

- [ ] 将暗色主题从接近纯黑调整为更柔和的炭黑层级。
- [ ] 降低边框存在感，移除不必要的盒子感。
- [ ] 将分割线改成细线，同时保留足够大的隐形拖拽热区。
- [ ] 降低标题栏高度和视觉重量，让按钮组更安静。
- [ ] 保留现有主题切换、UI 设置、撤销、重做、历史、全屏和关闭行为。

### 任务 2：预设工作区布局

**涉及文件：**
- 修改：`src/preset-manager/App.vue`
- 修改：`src/preset-manager/components/PresetPanel.vue`

- [ ] 让 AI 助手只存在于 `.preset-workspace` 内，不延伸到左侧栏底部。
- [ ] 将预设选择器从大型胶囊按钮改成更紧凑的标题/路径行。
- [ ] 减少主预设面板与第二预设面板之间的割裂感。
- [ ] 保留第二预设面板展开按钮、宽度拖拽和现有拖拽插入行为。

### 任务 3：预设条目列表重构

**涉及文件：**
- 修改：`src/preset-manager/components/PromptItem.vue`
- 修改：`src/preset-manager/components/PresetPanel.vue`

- [ ] 将预设条目从小卡片改成更适合扫描的列表行。
- [ ] 使用细分隔线区分条目，避免大量厚边框。
- [ ] 保留悬停、展开、禁用、占位、收藏、编辑、删除、放大、启用/禁用和拖拽状态。
- [ ] 保留现有 UI 比例设置，其中标准模式的预设条目比例仍以 `106%` 为基准。
- [ ] 展开条目时显示内容和操作按钮，但普通列表状态不要显得臃肿。

### 任务 4：AI 助手抽屉

**涉及文件：**
- 修改：`src/preset-manager/components/AiAssistant.vue`
- 必要时小改：`src/preset-manager/stores/ai.ts`

- [ ] 默认状态为预设工作区底部的紧凑输入胶囊。
- [ ] 展开状态为轻量抽屉，使用背景层级和顶部细线，而不是厚重卡片。
- [ ] 输入栏固定在底部，拖动抽屉高度时不能被挤没。
- [ ] 保留抽屉高度拖拽，并限制到可用范围。
- [ ] 保留 AI 设置、独立窗口、关闭、发送消息、加载指示和现有上下文生成逻辑。
- [ ] 独立 AI 小窗的完整拖动和吸附优化先暂缓，避免影响当前稳定行为。

### 任务 5：左侧栏细节

**涉及文件：**
- 修改：`src/preset-manager/components/LeftSidebar.vue`
- 如果局部间距冲突再修改：`src/preset-manager/components/WorkbenchPanel.vue`
- 如果局部间距冲突再修改：`src/preset-manager/components/FavoritesPanel.vue`

- [ ] 保留 Codex 风格的蓝黑光影，但让渐变更自然。
- [ ] 能靠背景层级区分的地方，不再使用明显硬分割线。
- [ ] 将折叠按钮改成更贴边、更安静的样式。
- [ ] 保留工作台和收藏夹之间的高度拖拽。

### 任务 6：验证与发布

**涉及文件：**
- 修改：`README.md`
- 构建产物：`dist/preset-manager/index.js`
- 构建产物：`dist/preset-manager/index.js.map`

- [ ] 执行 `pnpm build`。
- [ ] 执行 `git diff --check`。
- [ ] 在 SillyTavern 中用以下脚本验证：

```js
import 'http://localhost:5500/dist/preset-manager/index.js'
```

- [ ] 测试暗色模式和亮色模式。
- [ ] 测试左/右分割线拖拽、第二预设面板开关、AI 抽屉高度拖拽、AI 发送输入、预设条目展开/编辑/删除/收藏/启用禁用、预设条目拖拽排序。
- [ ] 更新 README 版本记录。
- [ ] 如果整体重构稳定落地，则提交并打 `v0.5.0` 标签。

---

## 执行顺序

1. 先改视觉基础，因为后续所有组件都会继承主题变量。
2. 再改预设工作区和预设条目，因为这是最常用的主界面。
3. 再改 AI 抽屉，因为它依赖最终的工作区留白和层级。
4. 再打磨左侧栏、标题栏和分割线，因为它们属于全局细节。
5. 最后构建、可视化验证、更新日志、提交和打标签。

## 暂缓事项

- 完整重做独立 AI 小窗。
- AI 小窗靠边吸附细节。
- 历史备份导出、搜索和批量清理。
- 第二预设面板的高级对比、复制和迁移流程。
- 键盘排序和批量移动预设条目。
