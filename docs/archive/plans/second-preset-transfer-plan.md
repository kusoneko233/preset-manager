# 第二预设面板增强实现计划

> **给后续执行者看的要求：** 按任务逐项实现。每完成一个阶段先构建或运行对应验证，再进入下一阶段。

**目标：** 让第二预设面板从“只用于查看”升级为“跨预设整理工具”，支持跨面板复制、迁移和重复提示。

**架构：** 跨预设操作仍由 `PresetPanel.vue` 触发，最终通过 `manager.ts` 写入 SillyTavern 预设。重复关系判断放在独立工具 `promptRelations.ts` 中，避免散落在组件内。

**技术栈：** Vue 3、Pinia、现有历史记录系统、`pnpm build`、轻量 `ts-node` 测试脚本。

---

### 任务 1：重复关系判断

**涉及文件：**
- 新增：`src/preset-manager/utils/promptRelations.ts`
- 新增：`src/preset-manager/utils/promptRelations.test.ts`

- [x] 提供 `getPromptRelation()` 判断目标面板中是否已有同 ID、同内容或同名条目。
- [x] 提供 `getPromptRelationLabel()` 输出中文标签。
- [x] 用轻量测试脚本覆盖同 ID、同内容、同名和无重复四种情况。

验证命令：

```bash
pnpm exec ts-node src\preset-manager\utils\promptRelations.test.ts
```

### 任务 2：条目行展示跨面板信息和操作

**涉及文件：**
- 修改：`src/preset-manager/components/PromptItem.vue`
- 修改：`src/preset-manager/components/PresetPanel.vue`

- [ ] `PromptItem` 接收重复关系标签和跨面板目标名称。
- [ ] 普通行状态展示“同名 / 同内容 / 已存在”小标签。
- [ ] 展开行后显示“复制到另一侧”和“迁移到另一侧”按钮。
- [ ] 如果另一侧未打开或未选择预设，不显示跨面板操作。

### 任务 3：跨面板复制和迁移

**涉及文件：**
- 修改：`src/preset-manager/components/PresetPanel.vue`
- 修改：`src/preset-manager/stores/manager.ts`

- [ ] 增加根据当前面板计算另一侧面板的工具函数。
- [ ] 复制：将当前条目复制到另一侧预设末尾。
- [ ] 迁移：复制到另一侧后，从当前预设删除。
- [ ] 复制和迁移都接入历史记录。
- [ ] 当目标侧已有同 ID、同内容或同名条目时，弹出确认提示，避免误操作。

### 任务 4：验证与发布

**涉及文件：**
- 修改：`README.md`
- 构建产物：`dist/preset-manager/index.js`
- 构建产物：`dist/preset-manager/index.js.map`

- [ ] 执行关系判断测试。
- [ ] 执行 `pnpm build`。
- [ ] 执行 `git diff --check`。
- [ ] 在酒馆里验证第二预设面板打开后，跨面板复制、迁移、重复提示、撤销/重做是否正常。
- [ ] 更新 README 的 `v0.2.2` 版本记录。
- [ ] 提交、打 `v0.2.2` 标签并推送。
