# NowClipboard

[中文文档](./README.md) | English

Modern clipboard utility library -- zero dependencies, supports both browser and Node.js environments.

## Features

- **Modern API First** -- Prioritizes `navigator.clipboard.writeText()`, auto-fallback to `document.execCommand`
- **Promise-based** -- All operations return Promises, supports async/await
- **Auto Retry** -- Built-in configurable exponential backoff retry with timeout control and AbortSignal cancellation
- **Dual Environment** -- Browser + Node.js (Windows PowerShell / macOS `pbcopy` / Linux `xclip`/`xsel`)
- **Read & Write** -- Supports writing (copy/cut) and reading (paste) clipboard
- **Rich Content Read** -- `readRich()` reads clipboard text, HTML, and images
- **Paste Listener** -- Listen to paste events via `onPaste`, auto-parses text, HTML, and files
- **Change Listener** -- `onChange` polls clipboard for content changes
- **Permission Detection** -- Query clipboard read/write permission status via `queryPermission`
- **HTML Attribute Binding** -- Declarative copy behavior via `data-nc-*` attributes
- **Event Delegation** -- Supports CSS selector strings, Element, and NodeList as triggers
- **Resource Safety** -- Comprehensive `destroy()` method prevents memory leaks; calling methods after destroy throws errors
- **Image Copy** -- Supports Blob, File, HTMLImageElement, HTMLCanvasElement, URL, and data: URLs
- **Rich Text Copy** -- Copy HTML + plain text simultaneously, auto-fallback to execCommand
- **iOS Safari Compatible** -- Special fallback handling for mobile Safari
- **data URL Optimization** -- data: URLs are decoded directly to Blob, no fetch network request needed
- **TypeScript** -- Built-in complete `.d.ts` type definitions
- **ESM Support** -- ESM module version available, supports `import` syntax and tree-shaking
- **Zero Dependencies** -- Single file, no external dependencies

## Files

| File | Description |
|------|-------------|
| `NowClipboard.js` | Full version (with comments, for reading and debugging) |
| `NowClipboard.min.js` | Minified version (recommended for production) |
| `NowClipboard.esm.mjs` | ESM module version (supports `import` syntax) |
| `NowClipboard.d.ts` | TypeScript type definition file |
| `demo.html` | Interactive demo page |

## Installation

```bash
npm install nowclipboard --save
```

## Quick Start

### Browser

```html
<!-- Development -->
<script src="NowClipboard.js"></script>

<!-- Production (recommended) -->
<script src="NowClipboard.min.js"></script>
```

### Node.js

```js
var NowClipboard = require('nowclipboard');
```

### AMD

```js
require(['NowClipboard'], function (NowClipboard) {
  // ...
});
```

### ESM

```js
// Default import
import NowClipboard from 'nowclipboard';

// Named imports (tree-shakeable)
import { copy, read, readRich, copyImage, copyRich, onChange } from 'nowclipboard';
```

## Usage

### 1. HTML Attribute Binding (Declarative)

Use `data-nc-*` attributes to specify copy behavior, no extra JS needed:

```html
<!-- Copy specified text -->
<button class="btn" data-nc-text="Text to copy">Copy Text</button>

<!-- Copy target element's content -->
<input id="source" value="Input content">
<button class="btn" data-nc-target="#source">Copy Input</button>

<!-- Cut target element's content -->
<textarea id="content">Editable content</textarea>
<button class="btn" data-nc-target="#content" data-nc-action="cut">Cut</button>
```

```html
<script src="NowClipboard.js"></script>
<script>
  var clipboard = new NowClipboard('.btn');

  clipboard.on('success', function (e) {
    console.log('Copied:', e.text);
    e.clearSelection();
  });

  clipboard.on('error', function (e) {
    console.error('Copy failed:', e.error);
  });
</script>
```

### 2. Programmatic Configuration

Control copy behavior dynamically via functions:

```js
var clipboard = new NowClipboard('.btn', {
  // Custom action type
  action: function (trigger) {
    return trigger.getAttribute('data-action') || 'copy';
  },

  // Custom target element
  target: function (trigger) {
    var id = trigger.getAttribute('data-target');
    return document.getElementById(id);
  },

  // Custom copy text
  text: function (trigger) {
    return 'Current time: ' + new Date().toLocaleString();
  },

  // Container element (for fallback temporary element mounting)
  container: document.body,

  // Retry configuration
  retries: 3,        // Max retries (default: 2)
  retryDelay: 200,   // Base delay in ms (default: 100, exponential backoff)
  timeout: 5000,     // Timeout in ms (default: 0, no timeout)

  // AbortSignal to cancel operations
  signal: abortController.signal
});
```

### 3. Static Methods (Direct Call)

Copy text without instantiation:

```js
// Copy text
NowClipboard.copy('Hello World')
  .then(function (text) {
    console.log('Copied:', text);
  })
  .catch(function (err) {
    console.error('Failed:', err.message);
  });

// Cancel with AbortSignal
var controller = new AbortController();
NowClipboard.copy('Hello World', { signal: controller.signal });

// Abort after 1 second
setTimeout(function () { controller.abort(); }, 1000);

// async/await
async function doCopy() {
  try {
    var text = await NowClipboard.copy('Hello World');
    console.log('Copied:', text);
  } catch (err) {
    console.error('Failed:', err.message);
  }
}
```

### 4. Static Cut

```js
var textarea = document.querySelector('#myTextarea');

NowClipboard.cut(textarea).then(function (text) {
  console.log('Cut:', text);
});

// With retry configuration
NowClipboard.cut(textarea, { retries: 3, timeout: 5000 }).then(function (text) {
  console.log('Cut:', text);
});
```

### 5. Read Clipboard

```js
// Browser (requires HTTPS + user permission)
NowClipboard.read().then(function (text) {
  console.log('Clipboard content:', text);
});

// With options
NowClipboard.read({ retries: 3, timeout: 3000 }).then(function (text) {
  console.log('Read success:', text);
});
```

### 6. Read Rich Clipboard Content

Read plain text, HTML, and images from the clipboard. Requires HTTPS + modern browser with `clipboard.read()` API support.

```js
NowClipboard.readRich().then(function (result) {
  console.log('Plain text:', result.text);
  console.log('HTML:', result.html);
  console.log('Image count:', result.images.length);
});

// With retry and timeout configuration
NowClipboard.readRich({ retries: 3, timeout: 5000 });
```

### 7. Paste Event Listener

```js
// Listen to paste events on the entire page
var listener = NowClipboard.onPaste(null, function (data) {
  console.log('Text:', data.text);
  console.log('HTML:', data.html);
  console.log('Files:', data.files);
  // data.originalEvent is the original paste event
});

// Listen on a specific selector (event delegation)
var listener2 = NowClipboard.onPaste('.paste-area', function (data) {
  console.log('Pasted to target area:', data.text);
});

// Destroy listener
listener.destroy();
```

### 8. Clipboard Change Listener

Poll clipboard for content changes, trigger callback when content changes.

```js
var watcher = NowClipboard.onChange(function (data) {
  console.log('Clipboard changed:', data.text);
}, 1000); // Polling interval 1000ms (default)

// Destroy watcher
watcher.destroy();
```

> ⚠️ `onChange` uses polling to read the clipboard. In browsers, the page must be focused and have read permission. Frequent polling may trigger permission prompts in some browsers.

### 9. Permission Detection

```js
// Check read permission
NowClipboard.queryPermission('read').then(function (result) {
  console.log('Read permission:', result.state); // 'granted', 'denied', or 'prompt'
});

// Check write permission
NowClipboard.queryPermission('write').then(function (result) {
  console.log('Write permission:', result.state);
});
```

### 10. Copy Image

Requires HTTPS + modern browser (ClipboardItem API support).

```js
// Copy image from URL
NowClipboard.copyImage('https://example.com/photo.png')
  .then(function (blob) {
    console.log('Image copied, size:', blob.size);
  });

// Copy data: URL (no network request, decoded directly to Blob)
NowClipboard.copyImage('data:image/png;base64,...');

// Copy from Canvas
var canvas = document.querySelector('#myCanvas');
NowClipboard.copyImage(canvas);

// Copy from img element
var img = document.querySelector('#myImage');
NowClipboard.copyImage(img);

// Copy any Blob
var blob = new Blob([data], { type: 'image/png' });
NowClipboard.copyBlob(blob);
```

### 11. Copy Rich Text

Copy HTML and plain text simultaneously, preserving formatting on paste.

```js
NowClipboard.copyRich({
  text: 'Plain text content',
  html: '<b>Bold</b> and <em>italic</em> rich text'
}).then(function (result) {
  console.log('Copied:', result.text, result.html);
});

// With AbortSignal
var controller = new AbortController();
NowClipboard.copyRich({
  text: 'Plain text',
  html: '<b>Rich text</b>',
  signal: controller.signal
});
```

Rich text copy via HTML attributes:

```html
<div id="rich-content">
  <h3>Title</h3>
  <p>This is <strong>bold</strong> content</p>
</div>
<button class="btn" data-nc-target="#rich-content" data-nc-html="true">
  Copy Rich Text
</button>
```

### 12. Node.js Environment

```js
var NowClipboard = require('./NowClipboard.js');

NowClipboard.copy('Content from server').then(function (text) {
  console.log('Written to system clipboard:', text);
}).catch(function (err) {
  console.error('Failed:', err.message);
});

// Read system clipboard
NowClipboard.read().then(function (text) {
  console.log('Clipboard content:', text);
});
```

**Node.js system command dependencies:**

| OS | Write Command | Read Command | Note |
|----|---------------|--------------|------|
| Windows | `powershell -EncodedCommand` | `powershell -EncodedCommand` | Uses Base64 encoding to pass text, avoiding Unicode encoding issues |
| macOS | `pbcopy` | `pbpaste` | Built-in |
| Linux | `xclip` | `xclip -o` | Install: `sudo apt install xclip` |
| Linux (fallback) | `xsel` | `xsel -o` | Alternative: `sudo apt install xsel` |

## API Reference

### Constructor

```js
new NowClipboard(trigger, [options])
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `trigger` | `string \| Element \| NodeList` | CSS selector, DOM element, or element collection |
| `options.action` | `Function` | `(trigger) => 'copy' \| 'cut'` |
| `options.target` | `Function` | `(trigger) => Element` |
| `options.text` | `Function` | `(trigger) => string` |
| `options.container` | `Element` | Container element, defaults to `document.body` |
| `options.retries` | `number` | Max retry count, default `2` |
| `options.retryDelay` | `number` | Base retry delay in ms, default `100` (exponential backoff) |
| `options.timeout` | `number` | Timeout in ms, default `0` (no timeout) |
| `options.signal` | `AbortSignal \| null` | Signal to cancel operations |

### Instance Methods

| Method | Description |
|--------|-------------|
| `.on(event, handler)` | Register event listener (throws after destroy) |
| `.once(event, handler)` | Register one-time event listener (throws after destroy) |
| `.off(event, handler)` | Remove event listener (throws after destroy) |
| `.destroy()` | Destroy instance, remove all event listeners and DOM bindings |

### Static Methods

| Method | Returns | Description |
|--------|---------|-------------|
| `NowClipboard.copy(text, [options])` | `Promise<string>` | Copy text to clipboard |
| `NowClipboard.cut(element, [options])` | `Promise<string>` | Cut element content (browser only) |
| `NowClipboard.read([options])` | `Promise<string>` | Read clipboard text |
| `NowClipboard.readRich([options])` | `Promise<{text, html, images}>` | Read rich clipboard content (text+HTML+images, browser only) |
| `NowClipboard.copyImage(source, [options])` | `Promise<Blob>` | Copy image (Blob/File/Img/Canvas/URL/data: URL) |
| `NowClipboard.copyBlob(blob, [mimeType], [options])` | `Promise<Blob>` | Copy any Blob to clipboard |
| `NowClipboard.copyRich(options)` | `Promise<{text, html}>` | Copy rich text (HTML + plain text) |
| `NowClipboard.onPaste(target, callback)` | `{ destroy }` | Listen to paste events (browser only) |
| `NowClipboard.onChange(callback, [interval])` | `{ destroy }` | Listen to clipboard changes (browser only, polling) |
| `NowClipboard.queryPermission(name)` | `Promise<{ state }>` | Query clipboard permission (`'read'`/`'write'`) |
| `NowClipboard.checkSupport([actions])` | `boolean` | Check if clipboard operations are supported |

### RetryOptions

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `retries` | `number` | `2` | Max retry count |
| `retryDelay` | `number` | `100` | Base retry delay in ms (exponential backoff) |
| `timeout` | `number` | `0` | Timeout in ms (0 = no timeout) |
| `signal` | `AbortSignal \| null` | `null` | Signal to cancel operations |

### Events

#### `success` Event

Fired when a copy/cut operation succeeds.

```js
clipboard.on('success', function (e) {
  e.action;          // 'copy' or 'cut'
  e.text;            // The copied text content
  e.trigger;         // The DOM element that triggered the action
  e.clearSelection(); // Clear the page selection
});
```

#### `error` Event

Fired when an operation fails.

```js
clipboard.on('error', function (e) {
  e.action;          // 'copy' or 'cut'
  e.trigger;         // The DOM element that triggered the action
  e.error;           // Error object with failure reason
  e.clearSelection(); // Clear the page selection
});
```

### HTML Attributes

| Attribute | Description | Example |
|-----------|-------------|---------|
| `data-nc-text` | Specify text to copy | `data-nc-text="Copy me"` |
| `data-nc-target` | CSS selector for the target element | `data-nc-target="#input1"` |
| `data-nc-action` | Action type: `copy` (default) or `cut` | `data-nc-action="cut"` |
| `data-nc-html` | Enable rich text copy mode | `data-nc-html="true"` |

## Fallback Strategy

The library automatically tries the best available method in order:

```
1. navigator.clipboard.writeText()    (HTTPS + modern browsers)
       |
       v fails
2. document.execCommand('copy')       (HTTP + legacy browsers)
       |
       v fails
3. child_process (PowerShell/pbcopy/xclip)  (Node.js environment)
       |
       v fails
4. Throws error, fires 'error' event
```

Each layer retries automatically on failure (default: up to 2 retries, exponential backoff). Retry count, delay, and timeout are all configurable. Supports cancellation via `AbortSignal`.

## Supported Element Types

| Element | Copy | Cut |
|---------|------|-----|
| `<input>` | Yes | Yes |
| `<textarea>` | Yes | Yes |
| `<select>` | Yes | -- |
| `contenteditable` elements | Yes | Yes |
| Regular elements (div, span, etc.) | Yes | -- |

## Browser Compatibility

NowClipboard prioritizes the modern [Clipboard API](https://developer.mozilla.org/en-US/docs/Web/API/Clipboard_API) and automatically falls back to [execCommand](https://developer.mozilla.org/en-US/docs/Web/API/Document/execCommand) for legacy browsers.

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
      <td align="center" colspan="5"><sub>Clipboard API (modern)</sub></td>
      <td align="center"><sub>execCommand (fallback)</sub></td>
    </tr>
  </tbody>
</table>

> 💡 For legacy browser support, NowClipboard automatically falls back to `execCommand`. Simply show a tooltip like `Copied!` on `success` or `Press Ctrl+C to copy` on `error`, since the text is already selected.

## Comparison with ClipboardJS

| Feature | ClipboardJS | NowClipboard.js |
|---------|-------------|-----------------|
| Copy Method | `execCommand` only | Clipboard API + execCommand fallback |
| Image Copy | Not supported | Supported (Blob/File/Img/Canvas/URL/data: URL) |
| Rich Text Copy | Not supported | Supported (HTML + plain text) |
| Read Clipboard | Not supported | Supported (browser + Node.js) |
| Rich Content Read | Not supported | Supported (readRich: text+HTML+images) |
| Paste Listener | Not supported | Supported (onPaste + auto-parse) |
| Change Listener | Not supported | Supported (onChange polling) |
| Permission Check | Not supported | Supported (queryPermission) |
| Async | Synchronous | Promise-based |
| Retry | None | Configurable retry + exponential backoff + timeout + AbortSignal |
| Node.js | Not supported | Supported (Win/Mac/Linux) |
| TypeScript | No type definitions | Built-in `.d.ts` type definitions |
| ESM | Not supported | Supported (ESM + UMD dual format) |
| iOS Safari | Not handled | Auto-fallback handling |
| Source Code | Minified/obfuscated | Readable, with comments |
| Destroy | Basic | Comprehensive (prevents memory leaks + post-destroy protection) |

## Full Example

### Interactive Demo

The project includes an interactive demo page `demo.html` for trying out all features:

```bash
# Start a local server (recommended, Clipboard API requires HTTP/HTTPS)
npx serve .
# Then visit http://localhost:3000/demo.html
```

> ⚠️ Avoid opening via `file://` protocol directly. Browsers won't persist clipboard read permissions for local files, causing repeated permission prompts.

### Code Example

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>NowClipboard Demo</title>
</head>
<body>
  <input id="source" value="Content to copy" style="width: 300px;">
  <button class="copy-btn" data-nc-target="#source">Copy Input</button>
  <button class="copy-btn" data-nc-text="Copy this text directly">Copy Text</button>
  <p id="result"></p>

  <script src="NowClipboard.js"></script>
  <script>
    var clipboard = new NowClipboard('.copy-btn');
    var result = document.getElementById('result');

    clipboard.on('success', function (e) {
      result.textContent = 'Copied: ' + e.text;
      e.clearSelection();
    });

    clipboard.on('error', function (e) {
      result.textContent = 'Copy failed: ' + e.error.message;
    });
  </script>
</body>
</html>
```

## License

MIT
