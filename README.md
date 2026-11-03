# Pi Better Realtime Thinking

在 Pi 原生工作状态行显示紧凑的实时思考预览：

```text
⠹ Thinking (10s): Checking the current implementation…
```

沿用 Pi 的旋转指示符，通过公开的 `message_update` 事件与 `ctx.ui.setWorkingMessage()` 更新文字。不 hook 或修改内部组件，不改变消息、模型上下文、工具集或 Thinking level。

## 安装

要求 Pi 1.4.0+、Node.js 22.18+（推荐 24）。无额外运行依赖。

```sh
pi install /absolute/path/to/pi-better-realtime-thinking
```

默认收起原生 Thinking 块：在 Pi 的 `/settings` 中开启隐藏 Thinking，或者运行以下一次性配置：

```sh
cd /absolute/path/to/pi-better-realtime-thinking
PI_NODE_MODULES=/path/to/pi/runtime/node_modules npm run configure
```

配置脚本使用 Pi 的 SettingsManager 将全局 `hideThinkingBlock` 设为 true，保留其他配置。项目配置可能覆盖全局值。安装／配置后运行 `/reload` 或重启 Pi。

插件不会在每轮运行时强制折叠，因此你仍然可以用原生点击交互（需要鼠标模式支持）或 Ctrl+T 调整显示。

## 行为

- 收到 `thinking_start` 时开始计时，无文本时显示 `Thinking (Ns)…`。
- 有正文或摘要／标题时，把收到的文本转换成单行预览；长文本始终显示最新尾部，新 token 到达时立即顶掉前面的文字；不播放跑马灯动画。使用终端列宽截取，支持中文和 emoji。
- 预览只保留最新约 4,096 个 UTF-16 代码单元，完整 Thinking 仍由 Pi 原生块保存。预览不调用其他模型生成摘要，也不会产生额外 API 费用。
- OpenAI 等提供商返回的可见摘要／标题，只要 Pi 将其转换为 Thinking 流事件，就与正文一样处理；不尝试读取隐藏的推理。如果提供商连 Thinking 事件都不发送，保留原生工作状态，不虚构思考进度。
- 时间从当前 Thinking 阶段第一个事件开始，非服务端推理耗时；阶段结束就恢复原生工作文字。之后再开始 Thinking 时重新计时。
- 生成答案、执行工具、消息结束、取消、会话切换、重载／退出时清理计时器和预览。仅影响交互 TUI，print/RPC 不输出预览。
- 不修改原生 spinner 设置，也不接管原生块的点击事件。实时行本身不可点击，不留下历史预览。
- 其他插件如果同时调用 `setWorkingMessage`，最后一次更新会生效；建议只启用一个工作状态行定制插件。

## 验证

```sh
npm test
PI_NODE_MODULES=/path/to/pi/runtime/node_modules npm test
```

第二条还检查真实 Pi 扩展加载器、流事件生命周期、原生文本渲染宽度、中文／emoji，以及隔离目录里的配置写入。测试不使用真实模型，不产生 API 费用。

官方接口参考：[扩展文档](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/extensions.md)、[工作指示符示例](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/examples/extensions/working-indicator.ts)。

Git 提交沿用 `type: describe` 格式。

## 独立性与插件协作

本仓库不导入或嵌套其他插件；Pi 提供扩展 SDK，无需执行 npm install。`pi-ro-rw-mode`（footer）、`pi-light-subagent`（任务概览）和 `pi-deepseek-web-feature`（联网工具）均为可选的独立安装，与本插件没有直接调用关系。子代理禁用扩展，因此不会加载本插件。`PiProviderManager` 不是依赖。

卸载：`pi remove /absolute/path/to/pi-better-realtime-thinking`，再 `/reload`。卸载不会撤销一次性配置脚本设置的 `hideThinkingBlock`；可在 Pi `/settings` 中自行调整。本包保留 `private: true`，尚未发布到 npm，上传 GitHub 时请保留完整仓库（包括 `src/` 和 `scripts/`）。

## 仓库结构

- `index.ts`：订阅 Pi 流事件，管理工作行和清理生命周期。
- `src/preview.ts`：有界文本尾部与实时预览计时逻辑。
- `scripts/configure.mjs`：可选的一次性全局折叠设置。
- `test/`：纯预览逻辑、真实 Pi 加载器及隔离配置检查。

目录和包名使用中划线；事件、环境变量及 Pi 配置字段使用各自接口规定的拼写。
