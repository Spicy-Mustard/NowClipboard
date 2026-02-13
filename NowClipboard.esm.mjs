/**
 * NowClipboard v1.1.2
 * Modern clipboard utility library - Clipboard API + execCommand fallback + Node.js adapter
 * Zero dependencies, supports both browser and Node.js environments
 * 
 * Licensed MIT © Spicy-Mustard
 */
'use strict';

  // ========================================
  // 1. Utility Functions & Environment Detection
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
   * Check if modern Clipboard API is available
   */
  function isClipboardAPIAvailable() {
    return _isBrowser &&
      typeof navigator !== 'undefined' &&
      navigator.clipboard != null &&
      typeof navigator.clipboard.writeText === 'function';
  }

  /**
   * Check if ClipboardItem API is available (for image/rich text copy)
   */
  function isClipboardItemSupported() {
    return _isBrowser &&
      typeof navigator !== 'undefined' &&
      navigator.clipboard != null &&
      typeof navigator.clipboard.write === 'function' &&
      typeof ClipboardItem === 'function';
  }

  /**
   * Check if execCommand supports the specified action
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
  // 2. EventEmitter
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
    // Clone to prevent modification during callbacks
    var listeners = events.slice();
    var toRemove = [];
    for (var j = 0; j < listeners.length; j++) {
      listeners[j].fn.apply(listeners[j].ctx, args);
      if (listeners[j].once) {
        toRemove.push(listeners[j]);
      }
    }
    // Remove one-time listeners
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
  // 3. Selection Engine - Text Selection
  // ========================================

  /**
   * Select text in element and return its content
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
        // Some input types don't support setSelectionRange
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
   * Create offscreen hidden textarea for fallback copy
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
   * Clear current page selection
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
      // ignore
    }
  }

  // ========================================
  // 4. Clipboard Operations Core
  // ========================================

  /**
   * Copy text using modern Clipboard API
   */
  function modernCopy(text) {
    return navigator.clipboard.writeText(text).then(function () {
      return text;
    });
  }

  /**
   * Copy text using execCommand fallback
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
   * Copy text from element using execCommand fallback
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
    // Fallback: copy via temporary element
    return legacyCopy(text, container);
  }

  /**
   * Cut content from element
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

    // Fallback: copy first, then clear manually
    return copyText(text).then(function (copiedText) {
      // Clear editable element content
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
   * Unified copy entry: auto-selects best method with retry support
   */
  function copyText(text, options) {
    var opts = options || {};
    var container = opts.container || (_isBrowser ? document.body : null);

    return retryOperation(function () {
      // Prefer modern API
      if (isClipboardAPIAvailable()) {
        return modernCopy(text).catch(function () {
          // Modern API failed, fallback to execCommand
          if (_isBrowser) {
            return legacyCopy(text, container);
          }
          return rejectedPromise(new Error('Clipboard API failed and no fallback available'));
        });
      }

      // Fallback
      if (_isBrowser) {
        return legacyCopy(text, container);
      }

      // Node.js environment
      if (_isNode) {
        return nodeClipboardCopy(text);
      }

      return rejectedPromise(new Error('No clipboard method available in this environment'));
    }, opts);
  }

  /**
   * Copy text from element
   */
  function copyFromElement(element, options) {
    var opts = options || {};
    var container = opts.container || document.body;

    return retryOperation(function () {
      // Get text first
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
   * Read clipboard text using modern Clipboard API
   * @returns {Promise<string>}
   */
  function modernRead() {
    return navigator.clipboard.readText();
  }

  /**
   * Unified read entry: auto-selects best method with retry support
   * @param {Object} [options] - Options (retries/retryDelay/timeout)
   * @returns {Promise<string>}
   */
  function readText(options) {
    var opts = options || {};

    return retryOperation(function () {
      // Browser: use modern Clipboard API
      if (_isBrowser && typeof navigator !== 'undefined' &&
          navigator.clipboard != null &&
          typeof navigator.clipboard.readText === 'function') {
        return modernRead();
      }

      // Node.js environment
      if (_isNode) {
        return nodeClipboardRead();
      }

      return rejectedPromise(new Error('Clipboard read not supported in this environment'));
    }, opts);
  }

  // ========================================
  // 4.1 Image/Blob Copy
  // ========================================

  /**
   * Convert various image sources to Blob
   * @param {Blob|File|HTMLImageElement|HTMLCanvasElement|string} source
   * @returns {Promise<Blob>}
   */
  function fetchImageBlob(source) {
    // Blob or File: return directly
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

    // URL string
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
   * Copy Blob to clipboard via ClipboardItem
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
   * Unified image copy entry (with retry support)
   * @param {Blob|File|HTMLImageElement|HTMLCanvasElement|string} source
   * @param {Object} [options] - Retry options
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
  // 4.2 Rich Text Copy (HTML + Plain Text)
  // ========================================

  /**
   * Copy rich text using ClipboardItem (modern method)
   * @param {string} text - Plain text
   * @param {string} html - HTML content
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
   * Copy rich text using execCommand fallback
   * @param {string} text - Plain text
   * @param {string} html - HTML content
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
   * Unified rich text copy entry (with retry support)
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
   * Parse retry config, merge with defaults
   * @param {Object|number} [options] - Config object or retry count
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
   * Add timeout to Promise
   * @param {Promise} promise - Original Promise
   * @param {number} ms - Timeout in ms, <=0 means no limit
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
   * Retry mechanism (exponential backoff) with configurable retries, delay and timeout
   * @param {Function} fn - Function that returns a Promise
   * @param {Object|number} config - Config object or max retries (backward compatible)
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
  // 5. Node.js Adapter
  // ========================================

  /**
   * Copy text to system clipboard in Node.js environment
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
        // Linux: try xclip
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
              // Linux: fallback to xsel
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
   * Linux fallback: use xsel
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
   * Read text from system clipboard in Node.js environment
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
        // Linux: try xclip
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
              // Linux: fallback to xsel
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
              // Windows PowerShell output may have trailing newline
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
   * Linux read fallback: use xsel
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
  // 6. Promise Helpers
  // ========================================

  function resolvedPromise(val) {
    return Promise.resolve(val);
  }

  function rejectedPromise(err) {
    return Promise.reject(err);
  }

  /**
   * Query clipboard permission status
   * @param {string} permissionName - Permission name ('clipboard-read' or 'clipboard-write')
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
  // 7. DOM Attribute Binding & Event Delegation
  // ========================================

  /**
   * Get element's data-nc-* attribute value
   */
  function getAttr(name, element) {
    var attr = 'data-nc-' + name;
    if (element.hasAttribute(attr)) {
      return element.getAttribute(attr);
    }
    return undefined;
  }

  /**
   * Find closest ancestor matching selector (including self)
   */
  function closest(element, selector) {
    if (element.closest) {
      return element.closest(selector);
    }
    // Fallback
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
   * Event delegation - listen on container, delegate to matching child elements
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
   * Bind event listener - supports selector string, Element, NodeList
   */
  function bindListener(target, eventType, handler) {
    if (_isString(target)) {
      // Selector -> event delegation
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
   * Extract data from paste event's clipboardData
   * @param {DataTransfer} clipboardData - Event's clipboardData object
   * @returns {{ text: string, html: string, files: File[] }}
   */
  function parsePasteData(clipboardData) {
    var result = { text: '', html: '', files: [] };
    if (!clipboardData) return result;

    try { result.text = clipboardData.getData('text/plain') || ''; } catch (e) { /* ignore */ }
    try { result.html = clipboardData.getData('text/html') || ''; } catch (e) { /* ignore */ }
    try {
      if (clipboardData.files && clipboardData.files.length > 0) {
        result.files = Array.prototype.slice.call(clipboardData.files);
      }
    } catch (e) { /* ignore */ }

    return result;
  }

  /**
   * Bind paste event listener
   * @param {string|Element|null} target - Selector, element, or null (defaults to document)
   * @param {Function} callback - Callback, receives { text, html, files, originalEvent }
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

    // null / undefined -> document
    if (target == null) {
      document.addEventListener('paste', pasteHandler, false);
      return {
        destroy: function () {
          document.removeEventListener('paste', pasteHandler, false);
        }
      };
    }

    // Selector string -> event delegation
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
  // 8. NowClipboard Main Class
  // ========================================

  /**
   * NowClipboard constructor
   * @param {string|Element|NodeList} trigger - Trigger element or selector
   * @param {Object} [options] - Options
   * @param {Function|string} [options.action] - Action type (copy/cut)
   * @param {Function} [options.target] - Function to get target element
   * @param {Function|string} [options.text] - Function or string to get copy text
   * @param {Element} [options.container] - Container element (defaults to document.body)
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

  // Inherit EventEmitter
  NowClipboard.prototype = Object.create(EventEmitter.prototype);
  NowClipboard.prototype.constructor = NowClipboard;

  /**
   * Resolve options
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
   * Bind click event
   */
  NowClipboard.prototype.listenClick = function (trigger) {
    var self = this;
    this._listener = bindListener(trigger, 'click', function (e) {
      self.onClick(e);
    });
  };

  /**
   * Click event handler
   */
  NowClipboard.prototype.onClick = function (e) {
    var trigger = e.delegateTarget || e.currentTarget;
    var actionName = this.action(trigger) || 'copy';
    var targetEl = this.target(trigger);
    var text = this.text(trigger);
    var self = this;

    // Validate action type
    if (actionName !== 'copy' && actionName !== 'cut') {
      self.emit('error', {
        action: actionName,
        trigger: trigger,
        error: new Error('Invalid action "' + actionName + '", use "copy" or "cut"'),
        clearSelection: clearSelection
      });
      return;
    }

    // Determine operation
    var operationPromise;

    // Check if rich text copy mode (data-nc-html="true")
    var isRichCopy = getAttr('html', trigger) === 'true';

    if (text) {
      // Text specified, copy directly
      operationPromise = copyText(text, { container: self.container, retries: self.retries, retryDelay: self.retryDelay, timeout: self.timeout });
    } else if (targetEl) {
      if (actionName === 'cut') {
        // Validate element for cut operation
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
        // Rich text copy: copy HTML and plain text simultaneously
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
        // Check disabled attribute
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
   * Default action: get from data-nc-action attribute
   */
  NowClipboard.prototype.defaultAction = function (trigger) {
    return getAttr('action', trigger) || 'copy';
  };

  /**
   * Default target: get from data-nc-target attribute
   */
  NowClipboard.prototype.defaultTarget = function (trigger) {
    var selector = getAttr('target', trigger);
    if (selector) {
      return document.querySelector(selector);
    }
    return undefined;
  };

  /**
   * Default text: get from data-nc-text attribute
   */
  NowClipboard.prototype.defaultText = function (trigger) {
    return getAttr('text', trigger);
  };

  /**
   * Destroy instance, clean up all resources
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
  // 9. Static Methods
  // ========================================

  /**
   * Static copy method - copy text directly
   * @param {string} text - Text to copy
   * @param {Object} [options] - Options
   * @returns {Promise<string>}
   */
  NowClipboard.copy = function (text, options) {
    if (!_isString(text)) {
      return rejectedPromise(new TypeError('NowClipboard.copy() expects a string argument'));
    }
    return copyText(text, options);
  };

  /**
   * Static cut method - cut element content
   * @param {Element} element - Target element
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
   * Static read method - read clipboard text
   * @param {Object} [options] - Options (retries/retryDelay/timeout)
   * @returns {Promise<string>}
   */
  NowClipboard.read = function (options) {
    return readText(options);
  };

  /**
   * Check if current environment supports clipboard operations
   * @param {string|string[]} [actions] - Actions to check (default: ['copy', 'cut'])
   * @returns {boolean}
   */
  NowClipboard.checkSupport = function (actions) {
    if (_isNode) return true; // Node.js supported via system commands

    if (!_isBrowser) return false;

    // Modern Clipboard API available
    if (isClipboardAPIAvailable()) return true;

    // Check execCommand support
    var actionList = actions || ['copy', 'cut'];
    if (_isString(actionList)) actionList = [actionList];

    var supported = true;
    for (var i = 0; i < actionList.length; i++) {
      supported = supported && isExecCommandSupported(actionList[i]);
    }
    return supported;
  };

  /**
   * Query clipboard permission status
   * @param {string} name - Permission name: 'read' or 'write'
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
   * Static paste listener - listen to paste events
   * @param {string|Element|null} target - Selector, element, or null (defaults to document)
   * @param {Function} callback - Callback, receives { text, html, files, originalEvent, trigger }
   * @returns {{ destroy: Function }}
   */
  NowClipboard.onPaste = function (target, callback) {
    if (!_isBrowser) {
      throw new Error('NowClipboard.onPaste() is only available in browser environment');
    }
    return bindPasteListener(target, callback);
  };

  /**
   * Copy image to clipboard (browser only, requires HTTPS + modern browser)
   * @param {Blob|File|HTMLImageElement|HTMLCanvasElement|string} source - Image source
   * @param {Object} [options] - Retry options
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
   * Copy any Blob to clipboard (browser only)
   * @param {Blob} blob - Blob data
   * @param {string} [mimeType] - MIME type, defaults to blob.type
   * @param {Object} [options] - Retry options
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
   * Copy rich text (HTML + plain text) to clipboard (browser only)
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
// ESM Exports
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
