# NowClipboard

现代剪贴板工具库 -- 零依赖，支持浏览器和 Node.js 双环境。

## 特性

- **现代 API 优先** -- 优先使用 `navigator.clipboard.writeText()`，自动降级到 `document.execCommand`
- **Promise 异步** -- 所有操作返回 Promise，支持 async/await
- **自动重试** -- 内置可配置的指数退避重试机制，支持超时控制
- **双环境支持** -- 浏览器 + Node.js（Windows `clip` / macOS `pbcopy` / Linux `xclip`/`xsel`）
- **读写双向** -- 支持写入（复制/剪切）和读取（粘贴）剪贴板
- **粘贴监听** -- 通过 `onPaste` 监听粘贴事件，自动解析文本、HTML、文件
- **权限检测** -- 通过 `queryPermission` 查询剪贴板读写权限状态
- **HTML 属性绑定** -- 通过 `data-nc-*` 属性声明式绑定复制行为
- **事件委托** -- 支持选择器字符串、Element、NodeList 三种触发方式
- **资源安全** -- 完善的 `destroy()` 方法防止内存泄漏
- **零依赖** -- 单文件，无任何外部依赖

## 文件说明

| 文件 | 说明 |
|------|------|
| `NowClipboard.js` | 完整版（带注释，便于阅读和调试） |
| `NowClipboard.min.js` | 压缩版（生产环境推荐） |

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
  timeout: 5000      // 超时 ms（默认 0，不超时）
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

### 6. 粘贴事件监听

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

### 7. 权限检测

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

### 8. Node.js 环境

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
| Windows | `clip` | `powershell Get-Clipboard` | 系统内置 |
| macOS | `pbcopy` | `pbpaste` | 系统内置 |
| Linux | `xclip` | `xclip -o` | 需安装：`sudo apt install xclip` |
| Linux (降级) | `xsel` | `xsel -o` | 备选：`sudo apt install xsel` |

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

### 实例方法

| 方法 | 说明 |
|------|------|
| `.on(event, handler)` | 注册事件监听 |
| `.once(event, handler)` | 注册一次性事件监听 |
| `.off(event, handler)` | 移除事件监听 |
| `.destroy()` | 销毁实例，移除所有事件监听和 DOM 绑定 |

### 静态方法

| 方法 | 返回值 | 说明 |
|------|--------|------|
| `NowClipboard.copy(text, [options])` | `Promise<string>` | 复制文本到剪贴板 |
| `NowClipboard.cut(element)` | `Promise<string>` | 剪切元素内容（仅浏览器） |
| `NowClipboard.read([options])` | `Promise<string>` | 读取剪贴板文本 |
| `NowClipboard.onPaste(target, callback)` | `{ destroy }` | 监听粘贴事件（仅浏览器） |
| `NowClipboard.queryPermission(name)` | `Promise<{ state }>` | 查询剪贴板权限（`'read'`/`'write'`） |
| `NowClipboard.checkSupport([actions])` | `boolean` | 检测环境是否支持剪贴板操作 |

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

## 降级策略

库会自动按以下顺序尝试最佳方案：

```
1. navigator.clipboard.writeText()    (HTTPS + 现代浏览器)
       |
       v 失败
2. document.execCommand('copy')       (HTTP + 旧浏览器)
       |
       v 失败
3. child_process (clip/pbcopy/xclip)  (Node.js 环境)
       |
       v 失败
4. 抛出错误，触发 'error' 事件
```

每层失败后自动重试（默认最多 2 次，指数退避），重试次数、延迟和超时均可配置。

## 支持的元素类型

| 元素 | 复制 | 剪切 |
|------|------|------|
| `<input>` | 支持 | 支持 |
| `<textarea>` | 支持 | 支持 |
| `<select>` | 支持 | -- |
| `contenteditable` 元素 | 支持 | 支持 |
| 普通元素（div, span 等） | 支持 | -- |

## 浏览器兼容性

| 浏览器 | 方式 |
|--------|------|
| Chrome 66+ | Clipboard API |
| Firefox 63+ | Clipboard API |
| Safari 13.1+ | Clipboard API |
| Edge 79+ | Clipboard API |
| IE 9+ / 旧版 Chrome | execCommand 降级 |

## 与 ClipboardJS 的区别

| 对比项 | ClipboardJS | NowClipboard.js |
|--------|-------|-----------|
| 复制方式 | 仅 `execCommand` | Clipboard API + execCommand 降级 |
| 读取剪贴板 | 不支持 | 支持（浏览器 + Node.js） |
| 粘贴监听 | 不支持 | 支持（onPaste + 自动解析） |
| 权限检测 | 不支持 | 支持（queryPermission） |
| 异步 | 同步 | Promise-based |
| 重试 | 无 | 可配置重试 + 指数退避 + 超时 |
| Node.js | 不支持 | 支持 (Win/Mac/Linux) |
| 代码 | 压缩混淆 | 可读、带注释 |
| 销毁 | 基础 | 完善（防内存泄漏） |

## 完整示例

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
