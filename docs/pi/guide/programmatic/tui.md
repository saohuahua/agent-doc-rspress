---
title: TUI 组件
description: 用 pi-tui 给扩展和自定义工具写终端界面
---

# TUI 组件

扩展和自定义工具可以渲染自己的终端界面。这套组件系统来自 `@earendil-works/pi-tui`。

这一篇讲清楚：组件的最小契约是什么、怎么把它挂到 Pi 上、以及三个最容易写错的地方（行宽、主题失效、Overlay 生命周期）。

## 1. 组件契约

所有组件都实现这个接口：

```typescript
interface Component {
  render(width: number): string[];
  handleInput?(data: string): void;
  wantsKeyRelease?: boolean;
  invalidate(): void;
}
```

| 方法 | 说明 |
|---|---|
| `render(width)` | 返回字符串数组（一行一个）。**每行不得超过 `width`** |
| `handleInput?(data)` | 组件获得焦点时接收键盘输入 |
| `wantsKeyRelease?` | 为 true 时接收按键释放事件（Kitty 协议），默认 false |
| `invalidate()` | 清除缓存的渲染状态；主题变化时被调用 |

:::warning 样式不跨行

TUI 会在**每一行渲染结果末尾**追加完整的 SGR reset 和 OSC 8 reset。

所以带样式的多行文本必须**逐行重新施加样式**，或者用 `wrapTextWithAnsi()` 让每一折行都保留样式。

:::

## 2. 挂到 Pi 上

无论是扩展还是自定义工具，入口都是 `ctx.ui.custom()`：

```typescript title="扩展里"
pi.on("session_start", async (_event, ctx) => {
  const result = await ctx.ui.custom<string | null>((tui, theme, keybindings, done) =>
    new MyComponent({
      theme,
      keybindings,
      onChange: () => tui.requestRender(),
      onSelect: (value) => done(value),
      onCancel: () => done(null),
    }),
  );
});
```

```typescript title="自定义工具里"
async execute(toolCallId, params, signal, onUpdate, ctx) {
  const result = await ctx.ui.custom<string | null>((tui, theme, keybindings, done) =>
    new MyComponent({
      theme,
      keybindings,
      onChange: () => tui.requestRender(),
      onSelect: (value) => done(value),
      onCancel: () => done(null),
    }),
  );
}
```

回调参数就四个：`tui`（请求重绘）、`theme`（配色）、`keybindings`（按键）、`done`（返回结果并关闭）。

## 3. 内置组件

```typescript
import { Text, Box, Container, Spacer, Markdown, Image } from "@earendil-works/pi-tui";
```

| 组件 | 用途 | 关键参数 |
|---|---|---|
| `Text` | 多行文本，自动折行 | `(content, paddingX=1, paddingY=1, bgFn?)` |
| `Box` | 带内边距和背景色的容器 | `(paddingX, paddingY, bgFn)` |
| `Container` | 纵向组合子组件 | `addChild` / `removeChild` |
| `Spacer` | 空白行 | `new Spacer(2)` |
| `Markdown` | 渲染 Markdown（带语法高亮） | `(text, paddingX, paddingY, theme)` |
| `Image` | 在支持的终端渲染图片 | `(base64, mimeType, theme, { maxWidthCells, maxHeightCells })` |

`Image` 支持的终端：Kitty、iTerm2、Ghostty、WezTerm、Warp。

:::tip 别重复造轮子

官方明确说：`SelectList`、`SettingsList`、`BorderedLoader` 覆盖了 **90%** 的场景。先看有没有现成的再动手写。

:::

## 4. 键盘输入

```typescript
import { matchesKey, Key } from "@earendil-works/pi-tui";

handleInput(data: string) {
  if (matchesKey(data, Key.up)) {
    this.selectedIndex--;
  } else if (matchesKey(data, Key.enter)) {
    this.onSelect?.(this.selectedIndex);
  } else if (matchesKey(data, Key.escape)) {
    this.onCancel?.();
  } else if (matchesKey(data, Key.ctrl("c"))) {
    // ...
  }
}
```

| 类别 | 写法 |
|---|---|
| 基础键 | `Key.enter`、`Key.escape`、`Key.tab`、`Key.space`、`Key.backspace`、`Key.delete`、`Key.home`、`Key.end` |
| 方向键 | `Key.up`、`Key.down`、`Key.left`、`Key.right` |
| 带修饰 | `Key.ctrl("c")`、`Key.shift("tab")`、`Key.alt("left")`、`Key.ctrlShift("p")` |
| 字符串形式 | `"enter"`、`"ctrl+c"`、`"shift+tab"`、`"ctrl+shift+p"` |

## 5. 行宽：最常见的崩坏来源

:::danger `render()` 的每一行都不能超过 `width`

超了会把整个界面撑歪。ANSI 转义序列**不占显示宽度**，所以不能用 `str.length` 判断。

:::

```typescript
import { visibleWidth, truncateToWidth, wrapTextWithAnsi } from "@earendil-works/pi-tui";

render(width: number): string[] {
  return [truncateToWidth(this.text, width)];
}
```

| 工具函数 | 作用 |
|---|---|
| `visibleWidth(str)` | 显示宽度（忽略 ANSI） |
| `truncateToWidth(str, width, ellipsis?)` | 截断，可带省略号 |
| `wrapTextWithAnsi(str, width)` | 保留 ANSI 的折行 |

## 6. 主题与失效：第二个大坑

`theme.fg(color, text)` 和 `theme.bg(color, text)` 生成的是**已经带 ANSI 码的字符串**。

如果你把它缓存起来，主题一换，缓存里还是旧颜色。

```typescript title="错误：主题不会更新"
class BadComponent extends Container {
  private content: Text;

  constructor(message: string, theme: Theme) {
    super();
    // 颜色被预先烤进字符串并存在子组件里
    this.content = new Text(theme.fg("accent", message), 1, 0);
    this.addChild(this.content);
  }
  // 没有覆写 invalidate：父类只清子组件的渲染缓存，
  // 清不掉已经烤好的内容
}
```

```typescript title="正确：invalidate 时重建" {17-20}
class GoodComponent extends Container {
  private message: string;
  private content: Text;

  constructor(message: string) {
    super();
    this.message = message;
    this.content = new Text("", 1, 0);
    this.addChild(this.content);
    this.updateDisplay();
  }

  private updateDisplay(): void {
    this.content.setText(theme.fg("accent", this.message));
  }

  override invalidate(): void {
    super.invalidate();   // 清子组件缓存
    this.updateDisplay(); // 用新主题重建
  }
}
```

内容复杂时用「重建」模式：`invalidate()` → `this.clear()` → 用当前主题重新 `addChild`。

**什么时候必须这么做：**

1. 预先烤入主题色（用了 `theme.fg()` / `theme.bg()` 存进子组件）
2. 语法高亮（`highlightCode()` 会应用基于主题的配色）
3. 复杂布局（构建了内嵌主题色的子组件树）

### 可用颜色

`theme.fg(color, text)`：

| 类别 | 颜色名 |
|---|---|
| 通用 | `text`、`accent`、`muted`、`dim`、`searchMatchText` |
| 状态 | `success`、`error`、`warning` |
| 边框 | `border`、`borderAccent`、`borderMuted` |
| 消息 | `userMessageText`、`customMessageText`、`customMessageLabel` |
| 工具 | `toolTitle`、`toolOutput` |
| Diff | `toolDiffAdded`、`toolDiffRemoved`、`toolDiffContext` |
| Markdown | `mdHeading`、`mdLink`、`mdLinkUrl`、`mdCode`、`mdCodeBlock`、`mdCodeBlockBorder`、`mdQuote`、`mdQuoteBorder`、`mdHr`、`mdListBullet` |

## 7. Overlay

Overlay 把组件渲染在现有内容**之上**，不清屏：

```typescript
const result = await ctx.ui.custom<string | null>(
  (tui, theme, keybindings, done) => new MyDialog({ onClose: done }),
  { overlay: true },
);
```

定位和尺寸用 `overlayOptions`：

```typescript title="侧边面板"
const result = await ctx.ui.custom<string | null>(
  (tui, theme, keybindings, done) => new SidePanel({ onClose: done }),
  {
    overlay: true,
    overlayOptions: {
      width: "50%",           // 数字或百分比字符串
      minWidth: 40,
      maxHeight: "80%",

      anchor: "right-center", // 9 个锚点：center / top-left / top-center ...
      offsetX: -2,
      offsetY: 0,

      // 或者用百分比/绝对定位
      row: "25%",
      col: 10,

      margin: 2,              // 或 { top, right, bottom, left }

      // 响应式：窄终端上隐藏
      visible: (termWidth, termHeight) => termWidth >= 80,
    },
    onHandle: (handle) => {
      // handle.focus()               获得焦点并置于最前
      // handle.unfocus()             交还输入权
      // handle.unfocus({ target })   把输入权交给指定组件（或 null）
      // handle.setHidden(true/false) 切换可见性
      // handle.hide()                永久移除
    },
  },
);
```

### 焦点规则

获得焦点的可见 overlay 会**跨越临时的非 overlay UI 保持输入权**。

如果 overlay 又打开了一个不带 `{ overlay: true }` 的 `ctx.ui.custom()`，那个替代 UI 在活跃期间接管输入；关掉之后，原来的 overlay 可以收回输入权。

### 生命周期：第三个大坑

:::danger Overlay 关闭后组件已被销毁

不要保留引用重复使用，**每次都要新建实例**。

```typescript title="错误：陈旧引用"
let menu: MenuComponent;
await ctx.ui.custom((_, __, ___, done) => {
  menu = new MenuComponent(done);
  return menu;
}, { overlay: true });
setActiveComponent(menu);  // 已被销毁
```

```typescript title="正确：重新调用即可再次显示"
const showMenu = () =>
  ctx.ui.custom((_, __, ___, done) => new MenuComponent(done), { overlay: true });

await showMenu();  // 第一次
await showMenu();  // "返回" 就是再调一次
```

:::

## 8. IME 支持（中文输入必看）

需要显示文本光标的组件应实现 `Focusable`：

```typescript
import { CURSOR_MARKER, type Component, type Focusable } from "@earendil-works/pi-tui";

class MyInput implements Component, Focusable {
  focused = false; // 由 TUI 在焦点变化时设置

  render(width: number): string[] {
    const marker = this.focused ? CURSOR_MARKER : "";
    return [`> ${beforeCursor}${marker}\x1b[7m${atCursor}\x1b[27m${afterCursor}`];
  }
}
```

TUI 的处理流程：

1. 把组件的 `focused` 设为 `true`
2. 扫描渲染输出里的 `CURSOR_MARKER`（一个零宽 APC 转义序列）
3. 把**硬件光标**定位到那个位置
4. 只有 `showHardwareCursor` 开启时才显示硬件光标

:::info 输入法候选框位置不对时

默认硬件光标是隐藏的：假光标照常渲染，同时为那些"用隐藏光标追踪候选框"的终端定位硬件光标。

**有些终端必须要可见的硬件光标才能正确定位候选框**。这时开启 `showHardwareCursor` 设置、调 `setShowHardwareCursor(true)`、或设 `PI_HARDWARE_CURSOR=1`。

内置的 `Editor` 和 `Input` 已经实现了这个接口。

:::

容器组件（对话框、选择器）如果内含 `Input` / `Editor` 子组件，**容器自己也必须实现 `Focusable` 并把焦点状态传给子组件**，否则硬件光标定位不到。

## 9. 五条硬规则

官方总结的 Key Rules：

1. **主题一定从回调参数取** — 不要直接 import theme，用 `ctx.ui.custom((tui, theme, keybindings, done) => ...)` 里的 `theme`
2. **`DynamicBorder` 的颜色参数一定要标类型** — 写 `(s: string) => theme.fg("accent", s)`，不要写 `(s) => ...`
3. **状态变更后调 `tui.requestRender()`** — 在 `handleInput` 里更新状态后必须调
4. **返回三方法对象** — 自定义组件需要 `{ render, invalidate, handleInput }`
5. **优先用现成组件** — `SelectList` / `SettingsList` / `BorderedLoader` 覆盖 90% 场景

## 10. 官方示例索引

Pi 仓库 `examples/extensions/` 下的对应示例：

| 场景 | 文件 |
|---|---|
| 选择 UI | `preset.ts`（SelectList + DynamicBorder） |
| 异步 + 取消 | `qna.ts`（BorderedLoader 包 LLM 调用） |
| 设置开关 | `tools.ts`（SettingsList 开关工具） |
| 状态指示 | `plan-mode/index.ts`（setStatus / setWidget） |
| 工作指示器 | `working-indicator.ts` |
| 自定义底栏 | `custom-footer.ts` |
| 自定义编辑器 | `modal-editor.ts`（Vim 式模式编辑） |
| 完整交互程序 | `snake.ts`（键盘输入 + 游戏循环） |
| 工具渲染 | `todo.ts`（renderCall / renderResult） |
| Overlay 全场景 | `overlay-qa-tests.ts`（锚点、边距、堆叠、响应式、动画） |

## 11. 本篇小结

| 主题 | 记住这一点 |
|---|---|
| 契约 | `render` / `invalidate` 必需，`handleInput` 按需 |
| 行宽 | 每行不得超过 `width`，用 `visibleWidth` 而不是 `.length` |
| 主题 | 预烤颜色必须在 `invalidate()` 里重建 |
| Overlay | 关闭即销毁，每次重新 new |
| 中文输入 | 实现 `Focusable` + `CURSOR_MARKER`，容器要透传焦点 |

:::info 官方文档

完整的组件 API、自定义组件完整实现、七种常见模式（选择对话框、异步取消、设置开关、状态指示、编辑器上下 widget、自定义底栏、自定义编辑器）见仓库 `packages/coding-agent/docs/tui.md`，共 942 行。

:::

## 下一步

→ [Windows 平台](../platform/windows) — Windows 下的差异与已知问题
