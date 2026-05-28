# NowClipboard

中文 | [English](./README.en.md)

现代剪贴板工具库 -- 零依赖，支持浏览器和 Node.js 双环境。

## 特性

- **现代 API 优先** -- 优先使用 `navigator.clipboard.writeText()`，自动降级到 `document.execCommand`
- **Promise 异步** -- 所有操作返回 Promise，支持 async/await
- **自动重试** -- 内置可配置的指数退避重试机制，支持超时控制和 AbortSignal 取消
- **双环境支持** -- 浏览器 + Node.js（Windows PowerShell / macOS `pbcopy` / Linux `xclip`/`xsel`）
- **读写双向** -- 支持写入（复制/剪切）和读取（粘贴）剪贴板
- **富内容读取** -- `readRich()` 读取剪贴板中的文本、HTML 和图片
- **粘贴监听** -- 通过 `onPaste` 监听粘贴事件，自动解析文本、HTML、文件
- **变更监听** -- 通过 `onChange` 轮询监听剪贴板内容变化
- **权限检测** -- 通过 `queryPermission` 查询剪贴板读写权限状态
- **HTML 属性绑定** -- 通过 `data-nc-*` 属性声明式绑定复制行为
- **事件委托** -- 支持选择器字符串、Element、NodeList 三种触发方式
- **资源安全** -- 完善的 `destroy()` 方法防止内存泄漏，destroy 后调用方法会抛错
- **图片复制** -- 支持 Blob、File、HTMLImageElement、HTMLCanvasElement、URL 等多种图片源
- **富文本复制** -- 同时复制 HTML + 纯文本，自动降级到 execCommand
- **Node.js 写入** -- `write()` / `writeImage()` 在 Node.js 中写入文本和图片到系统剪贴板
- **多格式写入** -- `writeFormats()` 一次写入多种 MIME 类型
- **剪贴板历史** -- `History` 类自动记录剪贴板变更，支持搜索和持久化
- **跨标签页同步** -- `onSync()` 基于 BroadcastChannel 自动同步复制操作
- **iOS Safari 适配** -- 针对移动端 Safari 的特殊降级处理
- **data URL 优化** -- data: URL 直接解码为 Blob，不走 fetch 网络请求
- **TypeScript** -- 内置完整的 `.d.ts` 类型定义
- **ESM 支持** -- 提供 ESM 模块版本，支持 `import` 语法和 Tree-shaking
- **零依赖** -- 单文件，无任何外部依赖

## 文件说明

| 文件 | 说明 |
|------|------|
| `NowClipboard.js` | 完整版（带注释，便于阅读和调试） |
| `NowClipboard.min.js` | 压缩版（生产环境推荐） |
| `NowClipboard.esm.mjs` | ESM 模块版本（支持 `import` 语法） |
| `NowClipboard.d.ts` | TypeScript 类型定义文件 |
| `demo.html` | 交互式演示页面 |

## 安装

```bash
npm install nowclipboard --save
```

## 快速开始

### 浏览器引入

```html
<!-- 开发环境 -->
<script src="NowClipboard.js"></script>

<!-- 生产环境（推荐） -->
<script src="NowClipboard.min.js"></script>
```

### Node.js 引入

```js
var NowClipboard = require('nowclipboard');
```

### AMD 引入

```js
require(['NowClipboard'], function (NowClipboard) {
  // ...
});
```

### ESM 引入

```js
// 默认导入
import NowClipboard from 'nowclipboard';

// 命名导入（按需引入）
import { copy, read, readRich, copyImage, copyRich, onChange, write, writeImage, writeFormats, onSync, History } from 'nowclipboard';
```

## 使用方式

### 1. HTML 属性绑定（声明式）

通过 `data-nc-*` 属性指定复制行为，无需写额外 JS 逻辑：

```html
<!-- 复制指定文本 -->
<button class="btn" data-nc-text="要复制的内容">复制文本</button>

<!-- 复制目标元素的内容 -->
<input id="source" value="输入框内容">
<button class="btn" data-nc-target="#source">复制输入框</button>

<!-- 剪切目标元素的内容 -->
<textarea id="content">可编辑内容</textarea>
<button class="btn" data-nc-target="#content" data-nc-action="cut">剪切</button>
```

```html
<script src="NowClipboard.js"></script>
<script>
  var clipboard = new NowClipboard('.btn');

  clipboard.on('success', function (e) {
    console.log('复制成功:', e.text);
    e.clearSelection();
  });

  clipboard.on('error', function (e) {
    console.error('复制失败:', e.error);
  });
</script>
```

### 2. 配置项初始化（编程式）

通过函数动态控制复制行为：

```js
var clipboard = new NowClipboard('.btn', {
  // 自定义操作类型
  action: function (trigger) {
    return trigger.getAttribute('data-action') || 'copy';
  },

  // 自定义目标元素
  target: function (trigger) {
    var id = trigger.getAttribute('data-target');
    return document.getElementById(id);
  },

  // 自定义复制文本
  text: function (trigger) {
    return '当前时间: ' + new Date().toLocaleString();
  },

  // 容器元素（用于降级方案中的临时元素挂载）
  container: document.body,

  // 重试配置
  retries: 3,        // 最大重试次数（默认 2）
  retryDelay: 200,   // 基础延迟 ms（默认 100，指数退避）
  timeout: 5000,     // 超时 ms（默认 0，不超时）

  // AbortSignal 取消操作
  signal: abortController.signal
});
```

### 3. 静态方法（直接调用）

不需要实例化，直接复制文本：

```js
// 复制文本
NowClipboard.copy('Hello World')
  .then(function (text) {
    console.log('已复制:', text);
  })
  .catch(function (err) {
    console.error('失败:', err.message);
  });

// 使用 AbortSignal 取消操作
var controller = new AbortController();
NowClipboard.copy('Hello World', { signal: controller.signal });

// 1 秒后取消
setTimeout(function () { controller.abort(); }, 1000);

// async/await 写法
async function doCopy() {
  try {
    var text = await NowClipboard.copy('Hello World');
    console.log('已复制:', text);
  } catch (err) {
    console.error('失败:', err.message);
  }
}
```

### 4. 静态剪切

```js
var textarea = document.querySelector('#myTextarea');

NowClipboard.cut(textarea).then(function (text) {
  console.log('已剪切:', text);
});

// 带重试配置
NowClipboard.cut(textarea, { retries: 3, timeout: 5000 }).then(function (text) {
  console.log('已剪切:', text);
});
```

### 5. 读取剪贴板

```js
// 浏览器（需要 HTTPS + 用户授权）
NowClipboard.read().then(function (text) {
  console.log('剪贴板内容:', text);
});

// 带配置
NowClipboard.read({ retries: 3, timeout: 3000 }).then(function (text) {
  console.log('读取成功:', text);
});
```

### 6. 读取剪贴板富内容

读取剪贴板中的纯文本、HTML 和图片。需要 HTTPS + 支持 `clipboard.read()` API 的现代浏览器。

```js
NowClipboard.readRich().then(function (result) {
  console.log('纯文本:', result.text);
  console.log('HTML:', result.html);
  console.log('图片数量:', result.images.length);
});

// 带重试和超时配置
NowClipboard.readRich({ retries: 3, timeout: 5000 });
```

### 7. 粘贴事件监听

```js
// 监听整个页面的粘贴事件
var listener = NowClipboard.onPaste(null, function (data) {
  console.log('文本:', data.text);
  console.log('HTML:', data.html);
  console.log('文件:', data.files);
  // data.originalEvent 为原始 paste 事件
});

// 监听指定选择器（事件委托）
var listener2 = NowClipboard.onPaste('.paste-area', function (data) {
  console.log('粘贴到目标区域:', data.text);
});

// 销毁监听
listener.destroy();
```

### 8. 剪贴板变更监听

轮询检测剪贴板内容变化，当内容改变时触发回调。

```js
var watcher = NowClipboard.onChange(function (data) {
  console.log('剪贴板内容变更:', data.text);
}, 1000); // 轮询间隔 1000ms（默认）

// 销毁监听
watcher.destroy();
```

> ⚠️ `onChange` 使用轮询方式读取剪贴板，浏览器中需要页面获焦且有读取权限。频繁轮询可能在某些浏览器触发权限弹窗。

### 9. 权限检测

```js
// 检测读取权限
NowClipboard.queryPermission('read').then(function (result) {
  console.log('读取权限:', result.state); // 'granted', 'denied', 或 'prompt'
});

// 检测写入权限
NowClipboard.queryPermission('write').then(function (result) {
  console.log('写入权限:', result.state);
});
```

### 10. 复制图片

需要 HTTPS + 现代浏览器（支持 ClipboardItem API）。

```js
// 复制图片 URL
NowClipboard.copyImage('https://example.com/photo.png')
  .then(function (blob) {
    console.log('图片已复制，大小:', blob.size);
  });

// 复制 data: URL（不走网络请求，直接解码为 Blob）
NowClipboard.copyImage('data:image/png;base64,...');

// 复制 Canvas 画布
var canvas = document.querySelector('#myCanvas');
NowClipboard.copyImage(canvas);

// 复制 img 元素
var img = document.querySelector('#myImage');
NowClipboard.copyImage(img);

// 复制任意 Blob
var blob = new Blob([data], { type: 'image/png' });
NowClipboard.copyBlob(blob);
```

### 11. 复制富文本

同时复制 HTML 和纯文本，粘贴时保留格式。

```js
NowClipboard.copyRich({
  text: '纯文本内容',
  html: '<b>加粗</b>的 <em>富文本</em> 内容'
}).then(function (result) {
  console.log('已复制:', result.text, result.html);
});

// 支持 AbortSignal
var controller = new AbortController();
NowClipboard.copyRich({
  text: '纯文本',
  html: '<b>富文本</b>',
  signal: controller.signal
});
```

通过 HTML 属性绑定富文本复制：

```html
<div id="rich-content">
  <h3>标题</h3>
  <p>这是 <strong>加粗</strong> 的内容</p>
</div>
<button class="btn" data-nc-target="#rich-content" data-nc-html="true">
  复制富文本
</button>
```

### 12. Node.js 环境

```js
var NowClipboard = require('./NowClipboard.js');

NowClipboard.copy('从服务端复制的内容').then(function (text) {
  console.log('已写入系统剪贴板:', text);
}).catch(function (err) {
  console.error('失败:', err.message);
});

// 读取系统剪贴板
NowClipboard.read().then(function (text) {
  console.log('剪贴板内容:', text);
});
```

**Node.js 系统命令依赖：**

| 操作系统 | 写入命令 | 读取命令 | 备注 |
|---------|---------|---------|------|
| Windows | `powershell -EncodedCommand` | `powershell -EncodedCommand` | 使用 Base64 编码传递文本，避免 Unicode 编码问题 |
| macOS | `pbcopy` | `pbpaste` | 系统内置 |
| Linux | `xclip` | `xclip -o` | 需安装：`sudo apt install xclip` |
| Linux (降级) | `xsel` | `xsel -o` | 备选：`sudo apt install xsel` |

### 13. 写入文本（write）

`write()` 是 `copy()` 的别名，在浏览器和 Node.js 中均可使用。语义上更强调"写入"操作。

```js
// 浏览器和 Node.js 通用
NowClipboard.write('写入剪贴板的文本').then(function (text) {
  console.log('已写入:', text);
});
```

### 14. 写入图片（writeImage）

在浏览器和 Node.js 中均可写入图片到系统剪贴板。

```js
// 浏览器：与 copyImage 相同
NowClipboard.writeImage('https://example.com/photo.png')
  .then(function (blob) { console.log('图片已写入:', blob.size); });

// 浏览器：Canvas / img 元素
NowClipboard.writeImage(document.querySelector('#myCanvas'));

// Node.js：从 Buffer 写入
var fs = require('fs');
var imgBuffer = fs.readFileSync('/path/to/image.png');
NowClipboard.writeImage(imgBuffer).then(function () {
  console.log('图片已写入系统剪贴板');
});

// Node.js：从文件路径写入
NowClipboard.writeImage('/path/to/image.png').then(function () {
  console.log('图片已写入');
});
```

**Node.js writeImage 系统命令：**

| 操作系统 | 命令 | 备注 |
|---------|------|------|
| Windows | PowerShell `Clipboard.SetImage()` | 通过 Base64 传递图片数据 |
| macOS | `pbcopy` | 支持 PNG 格式 |
| Linux | `xclip -t image/png` | 需安装 xclip |

### 15. 多格式写入（writeFormats）

一次写入多种 MIME 格式到剪贴板。需要 HTTPS + 现代浏览器（支持 ClipboardItem API）。

```js
// 同时写入纯文本和 HTML
NowClipboard.writeFormats({
  'text/plain': 'Hello World',
  'text/html': '<b>Hello</b> World'
}).then(function (formats) {
  console.log('已写入格式:', Object.keys(formats));
});

// 写入文本 + 图片
NowClipboard.writeFormats({
  'text/plain': '图片描述',
  'image/png': imageBlob
});

// 自定义 MIME 类型
NowClipboard.writeFormats({
  'text/csv': 'name,age\nAlice,30',
  'application/json': '{"name":"Alice","age":30}'
});
```

### 16. 剪贴板历史（History）

自动记录剪贴板内容变更，支持搜索和持久化存储。

```js
// 创建历史实例
var history = new NowClipboard.History({
  maxSize: 50,           // 最大条目数（默认 50）
  storage: 'localStorage', // 存储方式：'memory' | 'localStorage' | 'sessionStorage'
  storageKey: 'my_history', // 存储键名（默认 'nowclipboard_history'）
  pollInterval: 1000     // 轮询间隔 ms（默认 1000）
});

// 开始监听
history.start();

// 获取所有历史
history.list(); // [{ text: '...', timestamp: 1234567890, type: 'text' }, ...]

// 搜索历史
history.search('关键词'); // 返回匹配的条目

// 获取最近一条
history.latest(); // { text: '...', timestamp: ..., type: 'text' }

// 当前条目数
history.size(); // 5

// 清空历史
history.clear();

// 停止监听（保留历史数据）
history.stop();

// 销毁实例（清空历史 + 停止监听）
history.destroy();
```

> ⚠️ `History` 使用 `onChange` 轮询监听剪贴板，仅浏览器环境可用。`localStorage` / `sessionStorage` 持久化需要页面在 HTTP/HTTPS 下访问。

### 17. 跨标签页同步（onSync）

基于 [BroadcastChannel API](https://developer.mozilla.org/en-US/docs/Web/API/BroadcastChannel)，同一来源下的多个标签页自动同步剪贴板操作。

```js
// 启动同步（默认自动同步 copy/cut 操作）
var sync = NowClipboard.onSync({
  channel: 'nowclipboard', // BroadcastChannel 名称（默认 'nowclipboard'）
  autoSync: true           // 自动同步 copy/cut（默认 true）
});

// 监听其他标签页的复制操作
sync.addListener(function (data) {
  console.log('其他标签页复制了:', data.type, data.text);
  // data.type: 'copy' | 'cut' | 自定义
  // data.text: 复制的文本
  // data.timestamp: 时间戳
});

// 广播自定义消息
sync.broadcast({ type: 'custom', message: 'Hello from Tab A' });

// 移除监听
sync.removeListener(myCallback);

// 销毁同步实例（恢复原始 copy/cut 方法）
sync.destroy();
```

> ⚠️ `onSync` 仅在浏览器环境且支持 BroadcastChannel 的浏览器中可用（Chrome 54+、Firefox 38+、Safari 15.4+）。不支持时会静默返回空操作对象。

## API 参考

### 构造函数

```js
new NowClipboard(trigger, [options])
```

| 参数 | 类型 | 说明 |
|------|------|------|
| `trigger` | `string \| Element \| NodeList` | CSS 选择器、DOM 元素或元素集合 |
| `options.action` | `Function` | `(trigger) => 'copy' \| 'cut'` |
| `options.target` | `Function` | `(trigger) => Element` |
| `options.text` | `Function` | `(trigger) => string` |
| `options.container` | `Element` | 容器元素，默认 `document.body` |
| `options.retries` | `number` | 最大重试次数，默认 `2` |
| `options.retryDelay` | `number` | 基础重试延迟 ms，默认 `100`（指数退避） |
| `options.timeout` | `number` | 超时 ms，默认 `0`（不超时） |
| `options.signal` | `AbortSignal \| null` | 取消操作的信号 |

### 实例方法

| 方法 | 说明 |
|------|------|
| `.on(event, handler)` | 注册事件监听（destroy 后调用会抛错） |
| `.once(event, handler)` | 注册一次性事件监听（destroy 后调用会抛错） |
| `.off(event, handler)` | 移除事件监听（destroy 后调用会抛错） |
| `.destroy()` | 销毁实例，移除所有事件监听和 DOM 绑定 |

### 静态方法

| 方法 | 返回值 | 说明 |
|------|--------|------|
| `NowClipboard.copy(text, [options])` | `Promise<string>` | 复制文本到剪贴板 |
| `NowClipboard.write(text, [options])` | `Promise<string>` | 写入文本到剪贴板（copy 的别名） |
| `NowClipboard.cut(element, [options])` | `Promise<string>` | 剪切元素内容（仅浏览器） |
| `NowClipboard.read([options])` | `Promise<string>` | 读取剪贴板文本 |
| `NowClipboard.readRich([options])` | `Promise<{text, html, images}>` | 读取剪贴板富内容（文本+HTML+图片，仅浏览器） |
| `NowClipboard.writeImage(source, [options])` | `Promise<Blob>` | 写入图片到剪贴板（浏览器 + Node.js） |
| `NowClipboard.writeFormats(formats, [options])` | `Promise<FormatsMap>` | 一次写入多种 MIME 格式（仅浏览器） |
| `NowClipboard.copyImage(source, [options])` | `Promise<Blob>` | 复制图片（支持 Blob/File/Img/Canvas/URL） |
| `NowClipboard.copyBlob(blob, [mimeType], [options])` | `Promise<Blob>` | 复制任意 Blob 到剪贴板 |
| `NowClipboard.copyRich(options)` | `Promise<{text, html}>` | 复制富文本（HTML + 纯文本） |
| `NowClipboard.onPaste(target, callback)` | `{ destroy }` | 监听粘贴事件（仅浏览器） |
| `NowClipboard.onChange(callback, [interval])` | `{ destroy }` | 监听剪贴板变更（仅浏览器，轮询方式） |
| `NowClipboard.onSync([options])` | `SyncInstance` | 跨标签页同步（仅浏览器，BroadcastChannel） |
| `NowClipboard.queryPermission(name)` | `Promise<{ state }>` | 查询剪贴板权限（`'read'`/`'write'`） |
| `NowClipboard.checkSupport([actions])` | `boolean` | 检测环境是否支持剪贴板操作 |
| `NowClipboard.History` | `ClipboardHistory` | 剪贴板历史类 |

### RetryOptions 配置

| 选项 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `retries` | `number` | `2` | 最大重试次数 |
| `retryDelay` | `number` | `100` | 基础重试延迟 ms（指数退避） |
| `timeout` | `number` | `0` | 超时 ms（0 = 不超时） |
| `signal` | `AbortSignal \| null` | `null` | 取消操作的信号 |

### 事件

#### `success` 事件

复制/剪切操作成功时触发。

```js
clipboard.on('success', function (e) {
  e.action;          // 'copy' 或 'cut'
  e.text;            // 复制的文本内容
  e.trigger;         // 触发操作的 DOM 元素
  e.clearSelection(); // 清除页面选区
});
```

#### `error` 事件

操作失败时触发。

```js
clipboard.on('error', function (e) {
  e.action;          // 'copy' 或 'cut'
  e.trigger;         // 触发操作的 DOM 元素
  e.error;           // Error 对象，包含失败原因
  e.clearSelection(); // 清除页面选区
});
```

### HTML 属性

| 属性 | 说明 | 示例 |
|------|------|------|
| `data-nc-text` | 指定要复制的文本 | `data-nc-text="复制我"` |
| `data-nc-target` | 指定目标元素的 CSS 选择器 | `data-nc-target="#input1"` |
| `data-nc-action` | 操作类型：`copy`（默认）或 `cut` | `data-nc-action="cut"` |
| `data-nc-html` | 启用富文本复制模式 | `data-nc-html="true"` |

## 降级策略

库会自动按以下顺序尝试最佳方案：

```
1. navigator.clipboard.writeText()    (HTTPS + 现代浏览器)
       |
       v 失败
2. document.execCommand('copy')       (HTTP + 旧浏览器)
       |
       v 失败
3. child_process (PowerShell/pbcopy/xclip)  (Node.js 环境)
       |
       v 失败
4. 抛出错误，触发 'error' 事件
```

每层失败后自动重试（默认最多 2 次，指数退避），重试次数、延迟、超时均可配置。支持通过 `AbortSignal` 取消正在进行的操作。

## 支持的元素类型

| 元素 | 复制 | 剪切 |
|------|------|------|
| `<input>` | 支持 | 支持 |
| `<textarea>` | 支持 | 支持 |
| `<select>` | 支持 | -- |
| `contenteditable` 元素 | 支持 | 支持 |
| 普通元素（div, span 等） | 支持 | -- |

## 浏览器兼容性

NowClipboard 优先使用现代 [Clipboard API](https://developer.mozilla.org/en-US/docs/Web/API/Clipboard_API)，并自动降级到 [execCommand](https://developer.mozilla.org/en-US/docs/Web/API/Document/execCommand) 以支持旧版浏览器。

<table>
  <thead>
    <tr>
      <td align="center" width="120">
        <img src="https://raw.githubusercontent.com/alrra/browser-logos/main/src/chrome/chrome_64x64.png" width="48"><br>
        <b>Chrome</b>
      </td>
      <td align="center" width="120">
        <img src="https://raw.githubusercontent.com/alrra/browser-logos/main/src/edge/edge_64x64.png" width="48"><br>
        <b>Edge</b>
      </td>
      <td align="center" width="120">
        <img src="https://raw.githubusercontent.com/alrra/browser-logos/main/src/firefox/firefox_64x64.png" width="48"><br>
        <b>Firefox</b>
      </td>
      <td align="center" width="120">
        <img src="https://raw.githubusercontent.com/alrra/browser-logos/main/src/safari/safari_64x64.png" width="48"><br>
        <b>Safari</b>
      </td>
      <td align="center" width="120">
        <img src="https://raw.githubusercontent.com/alrra/browser-logos/main/src/opera/opera_64x64.png" width="48"><br>
        <b>Opera</b>
      </td>
      <td align="center" width="120">
        <img src="https://raw.githubusercontent.com/alrra/browser-logos/main/src/archive/internet-explorer_9-11/internet-explorer_9-11_64x64.png" width="48"><br>
        <b>IE</b>
      </td>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td align="center">66+ ✅</td>
      <td align="center">79+ ✅</td>
      <td align="center">63+ ✅</td>
      <td align="center">13.1+ ✅</td>
      <td align="center">53+ ✅</td>
      <td align="center">9+ ✅</td>
    </tr>
    <tr>
      <td align="center" colspan="5"><sub>Clipboard API（现代方案）</sub></td>
      <td align="center"><sub>execCommand（降级）</sub></td>
    </tr>
  </tbody>
</table>

> 💡 如果需要支持旧版浏览器，NowClipboard 会自动降级到 `execCommand` 方案。你只需在 `error` 事件中提示用户手动 `Ctrl+C` 即可。

## 与 ClipboardJS 的区别

| 对比项 | ClipboardJS | NowClipboard.js |
|--------|-------|-----------|
| 复制方式 | 仅 `execCommand` | Clipboard API + execCommand 降级 |
| 图片复制 | 不支持 | 支持（Blob/File/Img/Canvas/URL/data: URL） |
| 富文本复制 | 不支持 | 支持（HTML + 纯文本同时复制） |
| 读取剪贴板 | 不支持 | 支持（浏览器 + Node.js） |
| 富内容读取 | 不支持 | 支持（readRich：文本+HTML+图片） |
| 粘贴监听 | 不支持 | 支持（onPaste + 自动解析） |
| 变更监听 | 不支持 | 支持（onChange 轮询检测） |
| 多格式写入 | 不支持 | 支持（writeFormats 一次写入多种 MIME） |
| Node.js 写入图片 | 不支持 | 支持（writeImage Buffer/文件路径） |
| 剪贴板历史 | 不支持 | 支持（History 类 + 搜索 + 持久化） |
| 跨标签页同步 | 不支持 | 支持（onSync BroadcastChannel） |
| 权限检测 | 不支持 | 支持（queryPermission） |
| 异步 | 同步 | Promise-based |
| 重试 | 无 | 可配置重试 + 指数退避 + 超时 + AbortSignal |
| Node.js | 不支持 | 支持 (Win/Mac/Linux) |
| TypeScript | 无类型定义 | 内置 `.d.ts` 类型定义 |
| ESM | 不支持 | 支持（ESM + UMD 双格式） |
| iOS Safari | 未适配 | 自动降级适配 |
| 代码 | 压缩混淆 | 可读、带注释 |
| 销毁 | 基础 | 完善（防内存泄漏 + destroy 后保护） |

## 完整示例

### 交互式演示

项目包含一个交互式演示页面 `demo.html`，可在线体验所有功能：

```bash
# 启动本地服务器（推荐，剪贴板 API 需要 HTTP/HTTPS 环境）
npx serve .
# 然后访问 http://localhost:3000/demo.html
```

> ⚠️ 不推荐直接用 `file://` 协议打开，浏览器不会为本地文件持久化剪贴板读取权限，会导致反复弹出授权弹窗。

### 代码示例

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <title>NowClipboard Demo</title>
</head>
<body>
  <input id="source" value="这是要复制的内容" style="width: 300px;">
  <button class="copy-btn" data-nc-target="#source">复制输入框</button>
  <button class="copy-btn" data-nc-text="直接复制这段文字">复制文本</button>
  <p id="result"></p>

  <script src="NowClipboard.js"></script>
  <script>
    var clipboard = new NowClipboard('.copy-btn');
    var result = document.getElementById('result');

    clipboard.on('success', function (e) {
      result.textContent = '复制成功: ' + e.text;
      e.clearSelection();
    });

    clipboard.on('error', function (e) {
      result.textContent = '复制失败: ' + e.error.message;
    });
  </script>
</body>
</html>
```

## 许可证

MIT
