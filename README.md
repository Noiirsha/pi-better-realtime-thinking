# Pi Better Realtime Thinking

在 Pi 原生工作状态行显示紧凑的实时思考预览：

```text
⠹ Thinking (10s): Checking the current implementation…
```

沿用 Pi 的旋转指示符，通过公开的 `message_update` 事件与 `ctx.ui.setWorkingMessage()` 更新文字。不 hook 或修改内部组件，不改变消息、模型上下文、工具集或 Thinking level。

## 安装

要求 Pi 1.4.0+、Node.js 22.18+（推荐 24）。无额外运行依赖。

```sh
pi install /Users/noiirsha/workspace/pi_agent_plugins/pi_better_realtime_thinking
```

默认收起原生 Thinking 块：在 Pi 的 `/settings` 中开启隐藏 Thinking，或者运行以下一次性配置：

```sh
cd /Users/noiirsha/workspace/pi_agent_plugins/pi_better_realtime_thinking
PI_NODE_MODULES=/Users/noiirsha/.pi/agent/install/releases/1.4.0/node_modules npm run configure
```

配置脚本使用 Pi 的 SettingsManager 将全局 `hideThinkingBlock` 设为 true，保留其他配置。项目配置可能覆盖全局值。安装／配置后运行 `/reload` 或重启 Pi。

插件不会在每轮运行时强制折叠，因此你仍然可以用原生点击交互（需要鼠标模式支持）或 Ctrl+T 调整显示。

## 行为

- 收到 `thinking_start` 时开始计时，无文本时显示 `Thinking (Ns)…`。
- 有正文或摘要／标题时，把收到的文本转换成单行预览；长文本每 200ms 横向滚动一列，起点停留约一秒。使用终端列宽截取，支持中文和 emoji。
- 预览只保留最新约 4,096 个 UTF-16 代码单元，完整 Thinking 仍由 Pi 原生块保存。预览不调用其他模型生成摘要，也不会产生额外 API 费用。
- OpenAI 等提供商返回的可见摘要／标题，只要 Pi 将其转换为 Thinking 流事件，就与正文一样处理；不尝试读取隐藏的推理。如果提供商连 Thinking 事件都不发送，保留原生工作状态，不虚构思考进度。
- 时间从当前 Thinking 阶段第一个事件开始，非服务端推理耗时；阶段结束就恢复原生工作文字。之后再开始 Thinking 时重新计时。
- 生成答案、执行工具、消息结束、取消、会话切换、重载／退出时清理计时器和预览。仅影响交互 TUI，print/RPC 不输出预览。
- 不修改原生 spinner 设置，也不接管原生块的点击事件。实时行本身不可点击，不留下历史预览。
- 其他插件如果同时调用 `setWorkingMessage`，最后一次更新会生效；建议只启用一个工作状态行定制插件。

## 验证

```sh
npm test
PI_NODE_MODULES=/Users/noiirsha/.pi/agent/install/releases/1.4.0/node_modules npm test
```

第二条还检查真实 Pi 扩展加载器、流事件生命周期、原生文本渲染宽度、中文／emoji，以及隔离目录里的配置写入。测试不使用真实模型，不产生 API 费用。

官方接口参考：[扩展文档](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/extensions.md)、[工作指示符示例](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/examples/extensions/working-indicator.ts)。

Git 提交沿用 `type: describe` 格式。
