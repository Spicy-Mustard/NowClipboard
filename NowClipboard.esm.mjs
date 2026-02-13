/**
 * NowClipboard (ESM)
 * 现代剪贴板工具库 - 基于 Clipboard API + execCommand 降级 + Node.js 适配
 * 零依赖，支持浏览器和 Node.js 环境
 */
'use strict';

  // ========================================
  // 1. 工具函数 & 环境检测
  // ========================================

  var _isBrowser = typeof window !== 'undefined' && typeof document !== 'undefined';
  var _isNode = typeof process !== 'undefined' && process.versions != null && process.versions.node != null;

  function _isString(val) {
    return typeof val === 'string' || val instanceof String;
  }

  function _isFunction(val) {
    return typeof val === 'function';
  }

  function _isElement(val) {
    return val != null && typeof val === 'object' && val.nodeType === 1;
  }

  function _isNodeList(val) {
    var s = Object.prototype.toString.call(val);
    return val != null && (s === '[object NodeList]' || s === '[object HTMLCollection]') &&
      'length' in val && (val.length === 0 || _isElement(val[0]));
  }

  /**
   * 检测现代 Clipboard API 是否可用
   */
  function isClipboardAPIAvailable() {
    return _isBrowser &&
      typeof navigator !== 'undefined' &&
      navigator.clipboard != null &&
      typeof navigator.clipboard.writeText === 'function';
  }

  /**
   * 检测 ClipboardItem API 是否可用（用于图片/富文本复制）
   */
  function isClipboardItemSupported() {
    return _isBrowser &&
      typeof navigator !== 'undefined' &&
      navigator.clipboard != null &&
      typeof navigator.clipboard.write === 'function' &&
      typeof ClipboardItem === 'function';
  }

  /**
   * 检测 execCommand 是否支持指定操作
   */
  function isExecCommandSupported(action) {
    if (!_isBrowser) return false;
    try {
      return !!document.queryCommandSupported && document.queryCommandSupported(action);
    } catch (e) {
      return false;
    }
  }

  // ========================================
  // 2. EventEmitter - 事件发射器
  // ========================================

  function EventEmitter() {
    this._events = {};
  }

  EventEmitter.prototype.on = function (event, fn, ctx) {
    if (!_isString(event) || !_isFunction(fn)) return this;
    var events = this._events[event] || (this._events[event] = []);
    events.push({ fn: fn, ctx: ctx, once: false });
    return this;
  };

  EventEmitter.prototype.once = function (event, fn, ctx) {
    if (!_isString(event) || !_isFunction(fn)) return this;
    var events = this._events[event] || (this._events[event] = []);
    events.push({ fn: fn, ctx: ctx, once: true });
    return this;
  };

  EventEmitter.prototype.off = function (event, fn) {
    if (!_isString(event)) return this;
    var events = this._events[event];
    if (!events) return this;
    if (!fn) {
      delete this._events[event];
      return this;
    }
    var remaining = [];
    for (var i = 0; i < events.length; i++) {
      if (events[i].fn !== fn) {
        remaining.push(events[i]);
      }
    }
    if (remaining.length) {
      this._events[event] = remaining;
    } else {
      delete this._events[event];
    }
    return this;
  };

  EventEmitter.prototype.emit = function (event) {
    var events = this._events[event];
    if (!events || events.length === 0) return this;
    var args = [];
    for (var i = 1; i < arguments.length; i++) {
      args.push(arguments[i]);
    }
    // 复制一份，防止回调中修改数组
    var listeners = events.slice();
    var toRemove = [];
    for (var j = 0; j < listeners.length; j++) {
      listeners[j].fn.apply(listeners[j].ctx, args);
      if (listeners[j].once) {
        toRemove.push(listeners[j]);
      }
    }
    // 移除一次性监听器
    if (toRemove.length) {
      var remaining = [];
      for (var k = 0; k < events.length; k++) {
        if (toRemove.indexOf(events[k]) === -1) {
          remaining.push(events[k]);
        }
      }
      if (remaining.length) {
        this._events[event] = remaining;
      } else {
        delete this._events[event];
      }
    }
    return this;
  };

  EventEmitter.prototype.removeAllListeners = function () {
    this._events = {};
    return this;
  };

  // ========================================
  // 3. 选择器引擎 - 文本选取
  // ========================================

  /**
   * 选中元素中的文本并返回其内容
   */
  function selectText(element) {
    var text = '';
    var nodeName = element.nodeName;

    if (nodeName === 'SELECT') {
      element.focus();
      text = element.value;
    } else if (nodeName === 'INPUT' || nodeName === 'TEXTAREA') {
      var isReadOnly = element.hasAttribute('readonly');
      if (!isReadOnly) {
        element.setAttribute('readonly', '');
      }
      element.select();
      try {
        element.setSelectionRange(0, element.value.length);
      } catch (e) {
        // 某些 input type 不支持 setSelectionRange
      }
      if (!isReadOnly) {
        element.removeAttribute('readonly');
      }
      text = element.value;
    } else {
      if (element.hasAttribute('contenteditable')) {
        element.focus();
      }
      var selection = window.getSelection();
      var range = document.createRange();
      range.selectNodeContents(element);
      selection.removeAllRanges();
      selection.addRange(range);
      text = selection.toString();
    }

    return text;
  }

  /**
   * 创建屏幕外隐藏 textarea 用于降级复制
   */
  function createOffscreenArea(text) {
    var el = document.createElement('textarea');
    el.style.fontSize = '12pt';
    el.style.border = '0';
    el.style.padding = '0';
    el.style.margin = '0';
    el.style.position = 'absolute';
    el.style.opacity = '0';

    var isRTL = document.documentElement.getAttribute('dir') === 'rtl';
    el.style[isRTL ? 'right' : 'left'] = '-9999px';

    var yPos = window.pageYOffset || document.documentElement.scrollTop;
    el.style.top = yPos + 'px';

    el.setAttribute('readonly', '');
    el.value = text;
    return el;
  }

  /**
   * 清除当前页面选区
   */
  function clearSelection() {
    try {
      if (window.getSelection) {
        var sel = window.getSelection();
        if (sel.removeAllRanges) {
          sel.removeAllRanges();
        } else if (sel.empty) {
          sel.empty();
        }
      }
    } catch (e) {
      // 忽略
    }
  }

  // ========================================
  // 4. 剪贴板操作核心
  // ========================================

  /**
   * 使用现代 Clipboard API 复制文本
   */
  function modernCopy(text) {
    return navigator.clipboard.writeText(text).then(function () {
      return text;
    });
  }

  /**
   * 使用 execCommand 降级复制文本
   */
  function legacyCopy(text, container) {
    var fakeEl = createOffscreenArea(text);
    var containerEl = container || document.body;
    containerEl.appendChild(fakeEl);

    selectText(fakeEl);

    var succeeded = false;
    try {
      succeeded = document.execCommand('copy');
    } catch (e) {
      succeeded = false;
    }

    fakeEl.remove();
    clearSelection();

    if (succeeded) {
      return resolvedPromise(text);
    }
    return rejectedPromise(new Error('execCommand copy failed'));
  }

  /**
   * 使用 execCommand 降级复制元素中的文本
   */
  function legacyCopyFromElement(element, container) {
    var text = selectText(element);
    var succeeded = false;
    try {
      succeeded = document.execCommand('copy');
    } catch (e) {
      succeeded = false;
    }

    if (succeeded) {
      return resolvedPromise(text);
    }
    // 降级：通过临时元素复制
    return legacyCopy(text, container);
  }

  /**
   * 剪切元素中的内容
   */
  function performCut(element) {
    var text = selectText(element);
    var succeeded = false;
    try {
      succeeded = document.execCommand('cut');
    } catch (e) {
      succeeded = false;
    }

    if (succeeded) {
      return resolvedPromise(text);
    }

    // 降级：先复制再手动清空
    return copyText(text).then(function (copiedText) {
      // 清空可编辑元素内容
      var nodeName = element.nodeName;
      if (nodeName === 'INPUT' || nodeName === 'TEXTAREA') {
        element.value = '';
      } else if (element.hasAttribute('contenteditable')) {
        element.innerHTML = '';
      }
      return copiedText;
    });
  }

  /**
   * 统一的复制入口：自动选择最佳方式，支持重试
   */
  function copyText(text, options) {
    var opts = options || {};
    var container = opts.container || (_isBrowser ? document.body : null);

    return retryOperation(function () {
      // 优先使用现代 API
      if (isClipboardAPIAvailable()) {
        return modernCopy(text).catch(function () {
          // 现代 API 失败，降级到 execCommand
          if (_isBrowser) {
            return legacyCopy(text, container);
          }
          return rejectedPromise(new Error('Clipboard API failed and no fallback available'));
        });
      }

      // 降级方案
      if (_isBrowser) {
        return legacyCopy(text, container);
      }

      // Node.js 环境
      if (_isNode) {
        return nodeClipboardCopy(text);
      }

      return rejectedPromise(new Error('No clipboard method available in this environment'));
    }, opts);
  }

  /**
   * 从元素中复制文本
   */
  function copyFromElement(element, options) {
    var opts = options || {};
    var container = opts.container || document.body;

    return retryOperation(function () {
      // 先获取文本
      var text = selectText(element);

      if (isClipboardAPIAvailable()) {
        return modernCopy(text).catch(function () {
          clearSelection();
          return legacyCopyFromElement(element, container);
        });
      }

      return legacyCopyFromElement(element, container);
    }, opts);
  }

  /**
   * 使用现代 Clipboard API 读取剪贴板文本
   * @returns {Promise<string>}
   */
  function modernRead() {
    return navigator.clipboard.readText();
  }

  /**
   * 统一的读取入口：自动选择最佳方式，支持重试
   * @param {Object} [options] - 配置项（retries/retryDelay/timeout）
   * @returns {Promise<string>}
   */
  function readText(options) {
    var opts = options || {};

    return retryOperation(function () {
      // 浏览器：使用现代 Clipboard API
      if (_isBrowser && typeof navigator !== 'undefined' &&
          navigator.clipboard != null &&
          typeof navigator.clipboard.readText === 'function') {
        return modernRead();
      }

      // Node.js 环境
      if (_isNode) {
        return nodeClipboardRead();
      }

      return rejectedPromise(new Error('Clipboard read not supported in this environment'));
    }, opts);
  }

  // ========================================
  // 4.1 图片/Blob 复制
  // ========================================

  /**
   * 将各种图片源转换为 Blob
   * @param {Blob|File|HTMLImageElement|HTMLCanvasElement|string} source
   * @returns {Promise<Blob>}
   */
  function fetchImageBlob(source) {
    // Blob 或 File 直接返回
    if (source instanceof Blob) {
      return resolvedPromise(source);
    }

    // HTMLCanvasElement
    if (typeof HTMLCanvasElement !== 'undefined' && source instanceof HTMLCanvasElement) {
      return new Promise(function (resolve, reject) {
        try {
          source.toBlob(function (blob) {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Canvas toBlob returned null'));
            }
          }, 'image/png');
        } catch (e) {
          reject(new Error('Canvas toBlob failed: ' + e.message));
        }
      });
    }

    // HTMLImageElement
    if (typeof HTMLImageElement !== 'undefined' && source instanceof HTMLImageElement) {
      var src = source.src;
      if (!src) {
        return rejectedPromise(new Error('Image element has no src'));
      }
      return fetch(src).then(function (response) {
        if (!response.ok) {
          throw new Error('Failed to fetch image: ' + response.status);
        }
        return response.blob();
      }).catch(function (err) {
        return rejectedPromise(new Error('Failed to fetch image (CORS?): ' + err.message));
      });
    }

    // URL 字符串
    if (_isString(source)) {
      return fetch(source).then(function (response) {
        if (!response.ok) {
          throw new Error('Failed to fetch image: ' + response.status);
        }
        return response.blob();
      }).catch(function (err) {
        return rejectedPromise(new Error('Failed to fetch image URL (CORS?): ' + err.message));
      });
    }

    return rejectedPromise(new TypeError('Unsupported image source type'));
  }

  /**
   * 通过 ClipboardItem 复制 Blob 到剪贴板
   * @param {Blob} blob
   * @param {string} mimeType
   * @returns {Promise<Blob>}
   */
  function copyImageBlob(blob, mimeType) {
    var type = mimeType || blob.type || 'image/png';
    var itemData = {};
    itemData[type] = blob;
    var item = new ClipboardItem(itemData);
    return navigator.clipboard.write([item]).then(function () {
      return blob;
    });
  }

  /**
   * 复制图片统一入口（支持重试）
   * @param {Blob|File|HTMLImageElement|HTMLCanvasElement|string} source
   * @param {Object} [options] - 重试配置
   * @returns {Promise<Blob>}
   */
  function copyImage(source, options) {
    return fetchImageBlob(source).then(function (blob) {
      return retryOperation(function () {
        return copyImageBlob(blob, blob.type);
      }, options);
    });
  }

  // ========================================
  // 4.2 富文本复制（HTML + 纯文本）
  // ========================================

  /**
   * 使用 ClipboardItem 复制富文本（现代方式）
   * @param {string} text - 纯文本
   * @param {string} html - HTML 内容
   * @returns {Promise<{text: string, html: string}>}
   */
  function copyRichTextModern(text, html) {
    var textBlob = new Blob([text], { type: 'text/plain' });
    var htmlBlob = new Blob([html], { type: 'text/html' });
    var item = new ClipboardItem({
      'text/plain': textBlob,
      'text/html': htmlBlob
    });
    return navigator.clipboard.write([item]).then(function () {
      return { text: text, html: html };
    });
  }

  /**
   * 使用 execCommand 降级复制富文本
   * @param {string} text - 纯文本
   * @param {string} html - HTML 内容
   * @param {Element} [container]
   * @returns {Promise<{text: string, html: string}>}
   */
  function copyRichTextLegacy(text, html, container) {
    var el = document.createElement('div');
    el.style.position = 'absolute';
    el.style.opacity = '0';
    el.style.pointerEvents = 'none';

    var isRTL = document.documentElement.getAttribute('dir') === 'rtl';
    el.style[isRTL ? 'right' : 'left'] = '-9999px';

    var yPos = window.pageYOffset || document.documentElement.scrollTop;
    el.style.top = yPos + 'px';

    el.innerHTML = html;

    var containerEl = container || document.body;
    containerEl.appendChild(el);

    var selection = window.getSelection();
    var range = document.createRange();
    range.selectNodeContents(el);
    selection.removeAllRanges();
    selection.addRange(range);

    var succeeded = false;
    try {
      succeeded = document.execCommand('copy');
    } catch (e) {
      succeeded = false;
    }

    el.remove();
    clearSelection();

    if (succeeded) {
      return resolvedPromise({ text: text, html: html });
    }
    return rejectedPromise(new Error('execCommand copy failed for rich text'));
  }

  /**
   * 复制富文本统一入口（支持重试）
   * @param {Object} options - { text, html, container?, retries?, retryDelay?, timeout? }
   * @returns {Promise<{text: string, html: string}>}
   */
  function copyRichText(options) {
    var text = options.text;
    var html = options.html;
    var container = options.container || (_isBrowser ? document.body : null);

    return retryOperation(function () {
      if (isClipboardItemSupported()) {
        return copyRichTextModern(text, html).catch(function () {
          return copyRichTextLegacy(text, html, container);
        });
      }
      return copyRichTextLegacy(text, html, container);
    }, options);
  }

  /**
   * 解析重试配置，合并默认值
   * @param {Object|number} [options] - 配置对象或重试次数
   * @returns {{ retries: number, retryDelay: number, timeout: number }}
   */
  function parseRetryConfig(options) {
    if (typeof options === 'number') {
      return { retries: options, retryDelay: 100, timeout: 0 };
    }
    var opts = options || {};
    return {
      retries: opts.retries != null ? opts.retries : 2,
      retryDelay: opts.retryDelay != null ? opts.retryDelay : 100,
      timeout: opts.timeout != null ? opts.timeout : 0
    };
  }

  /**
   * 为 Promise 添加超时限制
   * @param {Promise} promise - 原始 Promise
   * @param {number} ms - 超时毫秒数，<=0 不限制
   * @returns {Promise}
   */
  function withTimeout(promise, ms) {
    if (!ms || ms <= 0) return promise;
    return new Promise(function (resolve, reject) {
      var timer = setTimeout(function () {
        reject(new Error('Operation timed out after ' + ms + 'ms'));
      }, ms);
      promise.then(function (val) {
        clearTimeout(timer);
        resolve(val);
      }, function (err) {
        clearTimeout(timer);
        reject(err);
      });
    });
  }

  /**
   * 重试机制（指数退避），支持配置化重试次数、延迟和超时
   * @param {Function} fn - 返回 Promise 的操作函数
   * @param {Object|number} config - 配置对象或最大重试次数（向后兼容）
   */
  function retryOperation(fn, config) {
    var cfg = parseRetryConfig(config);
    var attempt = 0;

    function tryOnce() {
      return fn().catch(function (err) {
        attempt++;
        if (attempt > cfg.retries) {
          return rejectedPromise(err);
        }
        var delay = Math.pow(2, attempt - 1) * cfg.retryDelay;
        return new Promise(function (resolve) {
          setTimeout(resolve, delay);
        }).then(tryOnce);
      });
    }

    return withTimeout(tryOnce(), cfg.timeout);
  }

  // ========================================
  // 5. Node.js 适配器
  // ========================================

  /**
   * Node.js 环境下复制文本到系统剪贴板
   */
  function nodeClipboardCopy(text) {
    if (!_isNode) {
      return rejectedPromise(new Error('Not running in Node.js environment'));
    }

    return new Promise(function (resolve, reject) {
      var platform = process.platform;
      var cmd, args;

      if (platform === 'win32') {
        cmd = 'clip';
        args = [];
      } else if (platform === 'darwin') {
        cmd = 'pbcopy';
        args = [];
      } else {
        // Linux: 尝试 xclip
        cmd = 'xclip';
        args = ['-selection', 'clipboard'];
      }

      try {
        var spawn = require('child_process').spawn;
        var proc = spawn(cmd, args, { stdio: ['pipe', 'ignore', 'ignore'] });
        var finished = false;

        proc.on('error', function (err) {
          if (!finished) {
            finished = true;
            if (platform !== 'win32' && platform !== 'darwin') {
              // Linux 降级尝试 xsel
              nodeClipboardCopyFallback(text).then(resolve, reject);
            } else {
              reject(new Error('Clipboard command failed: ' + cmd + ' - ' + err.message));
            }
          }
        });

        proc.on('close', function (code) {
          if (!finished) {
            finished = true;
            if (code === 0) {
              resolve(text);
            } else {
              reject(new Error('Clipboard command exited with code: ' + code));
            }
          }
        });

        proc.stdin.write(text);
        proc.stdin.end();
      } catch (e) {
        reject(new Error('Failed to spawn clipboard process: ' + e.message));
      }
    });
  }

  /**
   * Linux 降级方案：使用 xsel
   */
  function nodeClipboardCopyFallback(text) {
    return new Promise(function (resolve, reject) {
      try {
        var spawn = require('child_process').spawn;
        var proc = spawn('xsel', ['--clipboard', '--input'], { stdio: ['pipe', 'ignore', 'ignore'] });
        var finished = false;

        proc.on('error', function (err) {
          if (!finished) {
            finished = true;
            reject(new Error('No clipboard command available. Install xclip or xsel. ' + err.message));
          }
        });

        proc.on('close', function (code) {
          if (!finished) {
            finished = true;
            if (code === 0) {
              resolve(text);
            } else {
              reject(new Error('xsel exited with code: ' + code));
            }
          }
        });

        proc.stdin.write(text);
        proc.stdin.end();
      } catch (e) {
        reject(new Error('Failed to spawn xsel: ' + e.message));
      }
    });
  }

  /**
   * Node.js 环境下从系统剪贴板读取文本
   * @returns {Promise<string>}
   */
  function nodeClipboardRead() {
    if (!_isNode) {
      return rejectedPromise(new Error('Not running in Node.js environment'));
    }

    return new Promise(function (resolve, reject) {
      var platform = process.platform;
      var cmd, args;

      if (platform === 'win32') {
        cmd = 'powershell';
        args = ['-command', 'Get-Clipboard'];
      } else if (platform === 'darwin') {
        cmd = 'pbpaste';
        args = [];
      } else {
        // Linux: 尝试 xclip
        cmd = 'xclip';
        args = ['-selection', 'clipboard', '-o'];
      }

      try {
        var spawn = require('child_process').spawn;
        var proc = spawn(cmd, args, { stdio: ['ignore', 'pipe', 'ignore'] });
        var output = '';
        var finished = false;

        proc.stdout.on('data', function (chunk) {
          output += chunk.toString();
        });

        proc.on('error', function (err) {
          if (!finished) {
            finished = true;
            if (platform !== 'win32' && platform !== 'darwin') {
              // Linux 降级尝试 xsel
              nodeClipboardReadFallback().then(resolve, reject);
            } else {
              reject(new Error('Clipboard read command failed: ' + cmd + ' - ' + err.message));
            }
          }
        });

        proc.on('close', function (code) {
          if (!finished) {
            finished = true;
            if (code === 0) {
              // Windows PowerShell 输出可能带尾部换行
              resolve(platform === 'win32' ? output.replace(/\r?\n$/, '') : output);
            } else {
              reject(new Error('Clipboard read command exited with code: ' + code));
            }
          }
        });
      } catch (e) {
        reject(new Error('Failed to spawn clipboard read process: ' + e.message));
      }
    });
  }

  /**
   * Linux 读取降级方案：使用 xsel
   * @returns {Promise<string>}
   */
  function nodeClipboardReadFallback() {
    return new Promise(function (resolve, reject) {
      try {
        var spawn = require('child_process').spawn;
        var proc = spawn('xsel', ['--clipboard', '--output'], { stdio: ['ignore', 'pipe', 'ignore'] });
        var output = '';
        var finished = false;

        proc.stdout.on('data', function (chunk) {
          output += chunk.toString();
        });

        proc.on('error', function (err) {
          if (!finished) {
            finished = true;
            reject(new Error('No clipboard read command available. Install xclip or xsel. ' + err.message));
          }
        });

        proc.on('close', function (code) {
          if (!finished) {
            finished = true;
            if (code === 0) {
              resolve(output);
            } else {
              reject(new Error('xsel read exited with code: ' + code));
            }
          }
        });
      } catch (e) {
        reject(new Error('Failed to spawn xsel for read: ' + e.message));
      }
    });
  }

  // ========================================
  // 6. Promise 辅助（兼容旧环境）
  // ========================================

  function resolvedPromise(val) {
    return Promise.resolve(val);
  }

  function rejectedPromise(err) {
    return Promise.reject(err);
  }

  /**
   * 查询剪贴板权限状态
   * @param {string} permissionName - 权限名称（'clipboard-read' 或 'clipboard-write'）
   * @returns {Promise<{ state: string }>}
   */
  function queryClipboardPermission(permissionName) {
    if (!_isBrowser || typeof navigator === 'undefined' || !navigator.permissions ||
        !_isFunction(navigator.permissions.query)) {
      return resolvedPromise({ state: 'prompt' });
    }
    try {
      return navigator.permissions.query({ name: permissionName }).then(function (result) {
        return { state: result.state };
      }).catch(function () {
        return { state: 'prompt' };
      });
    } catch (e) {
      return resolvedPromise({ state: 'prompt' });
    }
  }

  // ========================================
  // 7. DOM 属性绑定 & 事件委托
  // ========================================

  /**
   * 获取元素的 data-nc-* 属性值
   */
  function getAttr(name, element) {
    var attr = 'data-nc-' + name;
    if (element.hasAttribute(attr)) {
      return element.getAttribute(attr);
    }
    return undefined;
  }

  /**
   * 查找最近的匹配选择器的祖先元素（含自身）
   */
  function closest(element, selector) {
    if (element.closest) {
      return element.closest(selector);
    }
    // 降级方案
    var el = element;
    while (el && el.nodeType === 1) {
      if (matches(el, selector)) return el;
      el = el.parentNode;
    }
    return null;
  }

  function matches(el, selector) {
    var fn = el.matches || el.matchesSelector || el.msMatchesSelector ||
      el.mozMatchesSelector || el.webkitMatchesSelector || el.oMatchesSelector;
    return fn ? fn.call(el, selector) : false;
  }

  /**
   * 事件委托 - 在容器上监听事件，委托给匹配选择器的子元素
   */
  function delegateEvent(container, selector, eventType, handler) {
    function listener(e) {
      var target = closest(e.target, selector);
      if (target) {
        e.delegateTarget = target;
        handler.call(target, e);
      }
    }

    container.addEventListener(eventType, listener, false);

    return {
      destroy: function () {
        container.removeEventListener(eventType, listener, false);
      }
    };
  }

  /**
   * 绑定事件监听 - 支持选择器字符串、Element、NodeList
   */
  function bindListener(target, eventType, handler) {
    if (_isString(target)) {
      // 选择器 → 事件委托
      return delegateEvent(document.body, target, eventType, handler);
    }

    if (_isElement(target)) {
      target.addEventListener(eventType, handler, false);
      return {
        destroy: function () {
          target.removeEventListener(eventType, handler, false);
        }
      };
    }

    if (_isNodeList(target)) {
      var destroyers = [];
      for (var i = 0; i < target.length; i++) {
        (function (el) {
          el.addEventListener(eventType, handler, false);
          destroyers.push(function () {
            el.removeEventListener(eventType, handler, false);
          });
        })(target[i]);
      }
      return {
        destroy: function () {
          for (var j = 0; j < destroyers.length; j++) {
            destroyers[j]();
          }
        }
      };
    }

    throw new TypeError('First argument must be a String selector, HTMLElement, or NodeList');
  }

  /**
   * 从 paste 事件的 clipboardData 中提取数据
   * @param {DataTransfer} clipboardData - 事件的 clipboardData 对象
   * @returns {{ text: string, html: string, files: File[] }}
   */
  function parsePasteData(clipboardData) {
    var result = { text: '', html: '', files: [] };
    if (!clipboardData) return result;

    try { result.text = clipboardData.getData('text/plain') || ''; } catch (e) { /* 忽略 */ }
    try { result.html = clipboardData.getData('text/html') || ''; } catch (e) { /* 忽略 */ }
    try {
      if (clipboardData.files && clipboardData.files.length > 0) {
        result.files = Array.prototype.slice.call(clipboardData.files);
      }
    } catch (e) { /* 忽略 */ }

    return result;
  }

  /**
   * 绑定粘贴事件监听
   * @param {string|Element|null} target - 选择器、元素或 null（默认 document）
   * @param {Function} callback - 回调函数，接收 { text, html, files, originalEvent }
   * @returns {{ destroy: Function }}
   */
  function bindPasteListener(target, callback) {
    if (!_isFunction(callback)) {
      throw new TypeError('Callback must be a function');
    }

    function pasteHandler(e) {
      var delegateEl = e.delegateTarget || e.currentTarget || e.target;
      var data = parsePasteData(e.clipboardData);
      data.originalEvent = e;
      data.trigger = delegateEl;
      callback(data);
    }

    // null / undefined → document
    if (target == null) {
      document.addEventListener('paste', pasteHandler, false);
      return {
        destroy: function () {
          document.removeEventListener('paste', pasteHandler, false);
        }
      };
    }

    // 选择器字符串 → 事件委托
    if (_isString(target)) {
      return delegateEvent(document.body, target, 'paste', pasteHandler);
    }

    // Element
    if (_isElement(target)) {
      target.addEventListener('paste', pasteHandler, false);
      return {
        destroy: function () {
          target.removeEventListener('paste', pasteHandler, false);
        }
      };
    }

    throw new TypeError('Target must be a String selector, HTMLElement, or null');
  }

  // ========================================
  // 8. NowClipboard 主类
  // ========================================

  /**
   * NowClipboard 构造函数
   * @param {string|Element|NodeList} trigger - 触发元素或选择器
   * @param {Object} [options] - 配置项
   * @param {Function|string} [options.action] - 操作类型（copy/cut）
   * @param {Function} [options.target] - 获取目标元素的函数
   * @param {Function|string} [options.text] - 获取复制文本的函数或字符串
   * @param {Element} [options.container] - 容器元素（默认 document.body）
   */
  function NowClipboard(trigger, options) {
    if (!(this instanceof NowClipboard)) {
      return new NowClipboard(trigger, options);
    }

    EventEmitter.call(this);
    this._destroyed = false;
    this._listener = null;

    this.resolveOptions(options || {});

    if (_isBrowser && trigger) {
      this.listenClick(trigger);
    }
  }

  // 继承 EventEmitter
  NowClipboard.prototype = Object.create(EventEmitter.prototype);
  NowClipboard.prototype.constructor = NowClipboard;

  /**
   * 解析配置项
   */
  NowClipboard.prototype.resolveOptions = function (opts) {
    this.action = _isFunction(opts.action) ? opts.action : this.defaultAction;
    this.target = _isFunction(opts.target) ? opts.target : this.defaultTarget;
    this.text = _isFunction(opts.text) ? opts.text : this.defaultText;
    this.container = _isElement(opts.container) ? opts.container : (_isBrowser ? document.body : null);
    this.retries = opts.retries != null ? opts.retries : 2;
    this.retryDelay = opts.retryDelay != null ? opts.retryDelay : 100;
    this.timeout = opts.timeout != null ? opts.timeout : 0;
  };

  /**
   * 绑定点击事件
   */
  NowClipboard.prototype.listenClick = function (trigger) {
    var self = this;
    this._listener = bindListener(trigger, 'click', function (e) {
      self.onClick(e);
    });
  };

  /**
   * 点击事件处理
   */
  NowClipboard.prototype.onClick = function (e) {
    var trigger = e.delegateTarget || e.currentTarget;
    var actionName = this.action(trigger) || 'copy';
    var targetEl = this.target(trigger);
    var text = this.text(trigger);
    var self = this;

    // 验证操作类型
    if (actionName !== 'copy' && actionName !== 'cut') {
      self.emit('error', {
        action: actionName,
        trigger: trigger,
        error: new Error('Invalid action "' + actionName + '", use "copy" or "cut"'),
        clearSelection: clearSelection
      });
      return;
    }

    // 确定操作
    var operationPromise;

    // 检查是否为富文本复制模式 (data-nc-html="true")
    var isRichCopy = getAttr('html', trigger) === 'true';

    if (text) {
      // 有指定文本，直接复制
      operationPromise = copyText(text, { container: self.container, retries: self.retries, retryDelay: self.retryDelay, timeout: self.timeout });
    } else if (targetEl) {
      if (actionName === 'cut') {
        // 验证剪切操作的元素
        if (targetEl.hasAttribute('readonly') || targetEl.hasAttribute('disabled')) {
          self.emit('error', {
            action: actionName,
            trigger: trigger,
            error: new Error('Cannot cut from elements with "readonly" or "disabled" attributes'),
            clearSelection: clearSelection
          });
          return;
        }
        operationPromise = performCut(targetEl);
      } else if (isRichCopy) {
        // 富文本复制：同时复制 HTML 和纯文本
        var richHtml = targetEl.innerHTML;
        var richText = targetEl.textContent || targetEl.innerText || '';
        operationPromise = copyRichText({
          text: richText,
          html: richHtml,
          container: self.container,
          retries: self.retries,
          retryDelay: self.retryDelay,
          timeout: self.timeout
        }).then(function (result) {
          return result.text;
        });
      } else {
        // 检查 disabled 属性
        if (targetEl.hasAttribute('disabled')) {
          self.emit('error', {
            action: actionName,
            trigger: trigger,
            error: new Error('Cannot copy from elements with "disabled" attribute, use "readonly" instead'),
            clearSelection: clearSelection
          });
          return;
        }
        operationPromise = copyFromElement(targetEl, { container: self.container, retries: self.retries, retryDelay: self.retryDelay, timeout: self.timeout });
      }
    } else {
      self.emit('error', {
        action: actionName,
        trigger: trigger,
        error: new Error('No text or target specified'),
        clearSelection: clearSelection
      });
      return;
    }

    operationPromise.then(function (copiedText) {
      self.emit('success', {
        action: actionName,
        text: copiedText,
        trigger: trigger,
        clearSelection: clearSelection
      });
    }).catch(function (err) {
      self.emit('error', {
        action: actionName,
        trigger: trigger,
        error: err,
        clearSelection: clearSelection
      });
    });
  };

  /**
   * 默认操作：从 data-nc-action 属性获取
   */
  NowClipboard.prototype.defaultAction = function (trigger) {
    return getAttr('action', trigger) || 'copy';
  };

  /**
   * 默认目标：从 data-nc-target 属性获取
   */
  NowClipboard.prototype.defaultTarget = function (trigger) {
    var selector = getAttr('target', trigger);
    if (selector) {
      return document.querySelector(selector);
    }
    return undefined;
  };

  /**
   * 默认文本：从 data-nc-text 属性获取
   */
  NowClipboard.prototype.defaultText = function (trigger) {
    return getAttr('text', trigger);
  };

  /**
   * 销毁实例，清理所有资源
   */
  NowClipboard.prototype.destroy = function () {
    if (this._destroyed) return;
    this._destroyed = true;

    if (this._listener) {
      this._listener.destroy();
      this._listener = null;
    }

    this.removeAllListeners();
    this.action = null;
    this.target = null;
    this.text = null;
    this.container = null;
  };

  // ========================================
  // 9. 静态方法
  // ========================================

  /**
   * 静态复制方法 - 直接复制文本
   * @param {string} text - 要复制的文本
   * @param {Object} [options] - 配置项
   * @returns {Promise<string>}
   */
  NowClipboard.copy = function (text, options) {
    if (!_isString(text)) {
      return rejectedPromise(new TypeError('NowClipboard.copy() expects a string argument'));
    }
    return copyText(text, options);
  };

  /**
   * 静态剪切方法 - 剪切元素内容
   * @param {Element} element - 目标元素
   * @returns {Promise<string>}
   */
  NowClipboard.cut = function (element) {
    if (!_isBrowser) {
      return rejectedPromise(new Error('NowClipboard.cut() is only available in browser environment'));
    }
    if (!_isElement(element)) {
      return rejectedPromise(new TypeError('NowClipboard.cut() expects an HTMLElement argument'));
    }
    return performCut(element);
  };

  /**
   * 静态读取方法 - 读取剪贴板文本
   * @param {Object} [options] - 配置项（retries/retryDelay/timeout）
   * @returns {Promise<string>}
   */
  NowClipboard.read = function (options) {
    return readText(options);
  };

  /**
   * 检测当前环境是否支持剪贴板操作
   * @param {string|string[]} [actions] - 要检测的操作（默认 ['copy', 'cut']）
   * @returns {boolean}
   */
  NowClipboard.checkSupport = function (actions) {
    if (_isNode) return true; // Node.js 通过系统命令支持

    if (!_isBrowser) return false;

    // 现代 Clipboard API 可用
    if (isClipboardAPIAvailable()) return true;

    // 检测 execCommand 支持
    var actionList = actions || ['copy', 'cut'];
    if (_isString(actionList)) actionList = [actionList];

    var supported = true;
    for (var i = 0; i < actionList.length; i++) {
      supported = supported && isExecCommandSupported(actionList[i]);
    }
    return supported;
  };

  /**
   * 查询剪贴板权限状态
   * @param {string} name - 权限名称：'read' 或 'write'
   * @returns {Promise<{ state: string }>} state: 'granted'|'denied'|'prompt'
   */
  NowClipboard.queryPermission = function (name) {
    if (name !== 'read' && name !== 'write') {
      return rejectedPromise(new TypeError('queryPermission() expects "read" or "write"'));
    }
    if (_isNode) {
      return resolvedPromise({ state: 'granted' });
    }
    return queryClipboardPermission('clipboard-' + name);
  };

  /**
   * 静态粘贴监听方法 - 监听粘贴事件
   * @param {string|Element|null} target - 选择器、元素或 null（默认 document）
   * @param {Function} callback - 回调函数，接收 { text, html, files, originalEvent, trigger }
   * @returns {{ destroy: Function }}
   */
  NowClipboard.onPaste = function (target, callback) {
    if (!_isBrowser) {
      throw new Error('NowClipboard.onPaste() is only available in browser environment');
    }
    return bindPasteListener(target, callback);
  };

  /**
   * 复制图片到剪贴板（仅浏览器，需要 HTTPS + 现代浏览器）
   * @param {Blob|File|HTMLImageElement|HTMLCanvasElement|string} source - 图片源
   * @param {Object} [options] - 重试配置
   * @returns {Promise<Blob>}
   */
  NowClipboard.copyImage = function (source, options) {
    if (!_isBrowser) {
      return rejectedPromise(new Error('NowClipboard.copyImage() is only available in browser environment'));
    }
    if (!isClipboardItemSupported()) {
      return rejectedPromise(new Error('ClipboardItem API not supported. Requires HTTPS and a modern browser'));
    }
    return copyImage(source, options);
  };

  /**
   * 复制任意 Blob 到剪贴板（仅浏览器）
   * @param {Blob} blob - Blob 数据
   * @param {string} [mimeType] - MIME 类型，默认使用 blob.type
   * @param {Object} [options] - 重试配置
   * @returns {Promise<Blob>}
   */
  NowClipboard.copyBlob = function (blob, mimeType, options) {
    if (!_isBrowser) {
      return rejectedPromise(new Error('NowClipboard.copyBlob() is only available in browser environment'));
    }
    if (!isClipboardItemSupported()) {
      return rejectedPromise(new Error('ClipboardItem API not supported. Requires HTTPS and a modern browser'));
    }
    if (!(blob instanceof Blob)) {
      return rejectedPromise(new TypeError('NowClipboard.copyBlob() expects a Blob argument'));
    }
    var type = mimeType || blob.type;
    return retryOperation(function () {
      return copyImageBlob(blob, type);
    }, options);
  };

  /**
   * 复制富文本（HTML + 纯文本）到剪贴板（仅浏览器）
   * @param {Object} options - { text: string, html: string, container?, retries?, retryDelay?, timeout? }
   * @returns {Promise<{text: string, html: string}>}
   */
  NowClipboard.copyRich = function (options) {
    if (!options || !_isString(options.text) || !_isString(options.html)) {
      return rejectedPromise(new TypeError('NowClipboard.copyRich() requires { text: string, html: string }'));
    }
    if (!_isBrowser) {
      return rejectedPromise(new Error('NowClipboard.copyRich() is only available in browser environment'));
    }
    return copyRichText(options);
  };

// ========================================
// ESM 导出
// ========================================

var _copy = NowClipboard.copy;
var _cut = NowClipboard.cut;
var _read = NowClipboard.read;
var _checkSupport = NowClipboard.checkSupport;
var _queryPermission = NowClipboard.queryPermission;
var _onPaste = NowClipboard.onPaste;
var _copyImage = NowClipboard.copyImage;
var _copyBlob = NowClipboard.copyBlob;
var _copyRich = NowClipboard.copyRich;

export default NowClipboard;
export {
  _copy as copy,
  _cut as cut,
  _read as read,
  _checkSupport as checkSupport,
  _queryPermission as queryPermission,
  _onPaste as onPaste,
  _copyImage as copyImage,
  _copyBlob as copyBlob,
  _copyRich as copyRich
};
