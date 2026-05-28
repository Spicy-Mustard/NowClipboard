/**
 * NowClipboard v1.1.6
 * Modern clipboard utility library - Clipboard API + execCommand fallback + Node.js adapter
 * Zero dependencies, supports both browser and Node.js environments
 *
 * Licensed MIT © Spicy-Mustard
 */
var NowClipboard = (() => {
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __require = /* @__PURE__ */ ((x) => typeof require !== "undefined" ? require : typeof Proxy !== "undefined" ? new Proxy(x, {
    get: (a, b) => (typeof require !== "undefined" ? require : a)[b]
  }) : x)(function(x) {
    if (typeof require !== "undefined") return require.apply(this, arguments);
    throw Error('Dynamic require of "' + x + '" is not supported');
  });
  var __commonJS = (cb, mod) => function __require2() {
    return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
  };

  // src/NowClipboard.js
  var require_NowClipboard = __commonJS({
    "src/NowClipboard.js"(exports, module) {
      (function(root, factory) {
        if (typeof module === "object" && typeof module.exports === "object") {
          module.exports = factory();
        } else if (typeof define === "function" && define.amd) {
          define([], factory);
        } else {
          root.NowClipboard = factory();
        }
      })(typeof self !== "undefined" ? self : exports, function() {
        "use strict";
        var _isBrowser = typeof window !== "undefined" && typeof document !== "undefined";
        var _isNode = typeof process !== "undefined" && process.versions != null && process.versions.node != null;
        function _isString(val) {
          return typeof val === "string" || val instanceof String;
        }
        function _isFunction(val) {
          return typeof val === "function";
        }
        function _isElement(val) {
          return val != null && typeof val === "object" && val.nodeType === 1;
        }
        function _isNodeList(val) {
          var s = Object.prototype.toString.call(val);
          return val != null && (s === "[object NodeList]" || s === "[object HTMLCollection]") && "length" in val && (val.length === 0 || _isElement(val[0]));
        }
        var _isIOS = _isBrowser && /iPhone|iPad|iPod/.test(navigator.userAgent) && !window.MSStream;
        function isClipboardAPIAvailable() {
          return _isBrowser && navigator.clipboard != null && typeof navigator.clipboard.writeText === "function";
        }
        function isClipboardItemSupported() {
          return _isBrowser && navigator.clipboard != null && typeof navigator.clipboard.write === "function" && typeof ClipboardItem === "function";
        }
        function isClipboardReadSupported() {
          return _isBrowser && navigator.clipboard != null && typeof navigator.clipboard.read === "function";
        }
        function isExecCommandSupported(action) {
          if (!_isBrowser) return false;
          try {
            return !!document.queryCommandSupported && document.queryCommandSupported(action);
          } catch (e) {
            return false;
          }
        }
        function EventEmitter() {
          this._events = {};
        }
        EventEmitter.prototype.on = function(event, fn, ctx) {
          if (!_isString(event) || !_isFunction(fn)) return this;
          var events = this._events[event] || (this._events[event] = []);
          events.push({ fn, ctx, once: false });
          return this;
        };
        EventEmitter.prototype.once = function(event, fn, ctx) {
          if (!_isString(event) || !_isFunction(fn)) return this;
          var events = this._events[event] || (this._events[event] = []);
          events.push({ fn, ctx, once: true });
          return this;
        };
        EventEmitter.prototype.off = function(event, fn) {
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
        EventEmitter.prototype.emit = function(event) {
          var events = this._events[event];
          if (!events || events.length === 0) return this;
          var args = Array.prototype.slice.call(arguments, 1);
          var listeners = events.slice();
          var toRemove = [];
          for (var j = 0; j < listeners.length; j++) {
            listeners[j].fn.apply(listeners[j].ctx, args);
            if (listeners[j].once) {
              toRemove.push(listeners[j]);
            }
          }
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
        EventEmitter.prototype.removeAllListeners = function() {
          this._events = {};
          return this;
        };
        function selectText(element) {
          var text = "";
          var nodeName = element.nodeName;
          if (nodeName === "SELECT") {
            element.focus();
            text = element.value;
          } else if (nodeName === "INPUT" || nodeName === "TEXTAREA") {
            element.focus();
            try {
              element.setSelectionRange(0, element.value.length);
            } catch (e) {
              try {
                element.select();
              } catch (e2) {
              }
            }
            text = element.value;
          } else {
            if (element.hasAttribute("contenteditable")) {
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
        function createOffscreenArea(text) {
          var el = document.createElement("textarea");
          el.style.fontSize = "16px";
          el.style.border = "0";
          el.style.padding = "0";
          el.style.margin = "0";
          if (_isIOS) {
            el.style.position = "fixed";
            el.style.left = "0";
            el.style.top = "0";
            el.style.width = "1px";
            el.style.height = "1px";
            el.style.opacity = "0.01";
            el.style.zIndex = "99999";
          } else {
            el.style.position = "absolute";
            el.style.opacity = "0";
            var isRTL = document.documentElement.getAttribute("dir") === "rtl";
            el.style[isRTL ? "right" : "left"] = "-9999px";
            var yPos = window.pageYOffset || document.documentElement.scrollTop;
            el.style.top = yPos + "px";
          }
          el.setAttribute("readonly", "");
          el.value = text;
          return el;
        }
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
          }
        }
        function modernCopy(text) {
          return navigator.clipboard.writeText(text).then(function() {
            return text;
          });
        }
        function legacyCopy(text, container) {
          var fakeEl = createOffscreenArea(text);
          var containerEl = container || document.body;
          containerEl.appendChild(fakeEl);
          selectText(fakeEl);
          var succeeded = false;
          try {
            succeeded = document.execCommand("copy");
          } catch (e) {
            succeeded = false;
          }
          if (fakeEl.parentNode) {
            fakeEl.parentNode.removeChild(fakeEl);
          }
          clearSelection();
          if (succeeded) {
            return resolvedPromise(text);
          }
          return rejectedPromise(new Error("execCommand copy failed"));
        }
        function legacyCopyFromElement(element, container) {
          var text = selectText(element);
          var succeeded = false;
          try {
            succeeded = document.execCommand("copy");
          } catch (e) {
            succeeded = false;
          }
          if (succeeded) {
            return resolvedPromise(text);
          }
          return legacyCopy(text, container);
        }
        function performCut(element, options) {
          var text = selectText(element);
          var succeeded = false;
          try {
            succeeded = document.execCommand("cut");
          } catch (e) {
            succeeded = false;
          }
          if (succeeded) {
            return resolvedPromise(text);
          }
          return copyText(text, options).then(function(copiedText) {
            var nodeName = element.nodeName;
            if (nodeName === "INPUT" || nodeName === "TEXTAREA") {
              element.value = "";
            } else if (element.hasAttribute("contenteditable")) {
              element.innerHTML = "";
            }
            return copiedText;
          });
        }
        function copyText(text, options) {
          var opts = options || {};
          var container = opts.container || (_isBrowser ? document.body : null);
          return retryOperation(function() {
            if (isClipboardAPIAvailable()) {
              return modernCopy(text).catch(function() {
                if (_isBrowser) {
                  return legacyCopy(text, container);
                }
                return rejectedPromise(new Error("Clipboard API failed and no fallback available"));
              });
            }
            if (_isBrowser) {
              return legacyCopy(text, container);
            }
            if (_isNode) {
              return nodeClipboardCopy(text);
            }
            return rejectedPromise(new Error("No clipboard method available in this environment"));
          }, opts);
        }
        function copyFromElement(element, options) {
          var opts = options || {};
          var container = opts.container || document.body;
          return retryOperation(function() {
            var text = selectText(element);
            if (isClipboardAPIAvailable()) {
              return modernCopy(text).catch(function() {
                clearSelection();
                return legacyCopyFromElement(element, container);
              });
            }
            return legacyCopyFromElement(element, container);
          }, opts);
        }
        function modernRead() {
          return navigator.clipboard.readText();
        }
        function readText(options) {
          var opts = options || {};
          return retryOperation(function() {
            if (_isBrowser && navigator.clipboard != null && typeof navigator.clipboard.readText === "function") {
              return modernRead();
            }
            if (_isNode) {
              return nodeClipboardRead();
            }
            return rejectedPromise(new Error("Clipboard read not supported in this environment"));
          }, opts);
        }
        function fetchImageBlob(source) {
          if (source instanceof Blob) {
            return resolvedPromise(source);
          }
          if (typeof HTMLCanvasElement !== "undefined" && source instanceof HTMLCanvasElement) {
            return new Promise(function(resolve, reject) {
              try {
                source.toBlob(function(blob) {
                  if (blob) {
                    resolve(blob);
                  } else {
                    reject(new Error("Canvas toBlob returned null"));
                  }
                }, "image/png");
              } catch (e) {
                reject(new Error("Canvas toBlob failed: " + e.message));
              }
            });
          }
          if (typeof HTMLImageElement !== "undefined" && source instanceof HTMLImageElement) {
            var src = source.src;
            if (!src) {
              return rejectedPromise(new Error("Image element has no src"));
            }
            return _fetchAsBlob(src);
          }
          if (_isString(source)) {
            return _fetchAsBlob(source);
          }
          return rejectedPromise(new TypeError("Unsupported image source type"));
        }
        function _fetchAsBlob(url) {
          if (url.indexOf("data:") === 0) {
            try {
              var parts = url.split(",");
              var mimeMatch = parts[0].match(/data:([^;]+)/);
              var mime = mimeMatch ? mimeMatch[1] : "image/png";
              var isBase64 = parts[0].indexOf("base64") !== -1;
              var data = parts.slice(1).join(",");
              var bytes;
              if (isBase64) {
                var binary = atob(data);
                bytes = new Uint8Array(binary.length);
                for (var i = 0; i < binary.length; i++) {
                  bytes[i] = binary.charCodeAt(i);
                }
              } else {
                bytes = new Uint8Array(new TextEncoder().encode(decodeURIComponent(data)));
              }
              return resolvedPromise(new Blob([bytes], { type: mime }));
            } catch (e) {
              return rejectedPromise(new Error("Failed to parse data URL: " + e.message));
            }
          }
          return fetch(url).then(function(response) {
            if (!response.ok) {
              throw new Error("Failed to fetch image: HTTP " + response.status);
            }
            return response.blob();
          }, function(err) {
            throw new Error("Failed to fetch image (CORS or network error): " + err.message);
          });
        }
        function copyImageBlob(blob, mimeType) {
          var type = mimeType || blob.type || "image/png";
          var itemData = {};
          itemData[type] = Promise.resolve(blob);
          var item = new ClipboardItem(itemData);
          return navigator.clipboard.write([item]).then(function() {
            return blob;
          });
        }
        function copyImage(source, options) {
          return fetchImageBlob(source).then(function(blob) {
            return retryOperation(function() {
              return copyImageBlob(blob, blob.type);
            }, options);
          });
        }
        function copyRichTextModern(text, html) {
          var textBlob = new Blob([text], { type: "text/plain" });
          var htmlBlob = new Blob([html], { type: "text/html" });
          var item = new ClipboardItem({
            "text/plain": Promise.resolve(textBlob),
            "text/html": Promise.resolve(htmlBlob)
          });
          return navigator.clipboard.write([item]).then(function() {
            return { text, html };
          });
        }
        function copyRichTextLegacy(text, html, container) {
          var el = document.createElement("div");
          el.style.position = "absolute";
          el.style.opacity = "0";
          el.style.pointerEvents = "none";
          var isRTL = document.documentElement.getAttribute("dir") === "rtl";
          el.style[isRTL ? "right" : "left"] = "-9999px";
          var yPos = window.pageYOffset || document.documentElement.scrollTop;
          el.style.top = yPos + "px";
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
            succeeded = document.execCommand("copy");
          } catch (e) {
            succeeded = false;
          }
          if (el.parentNode) {
            el.parentNode.removeChild(el);
          }
          clearSelection();
          if (succeeded) {
            return resolvedPromise({ text, html });
          }
          return rejectedPromise(new Error("execCommand copy failed for rich text"));
        }
        function copyRichText(options) {
          var text = options.text;
          var html = options.html;
          var container = options.container || (_isBrowser ? document.body : null);
          return retryOperation(function() {
            if (isClipboardItemSupported()) {
              return copyRichTextModern(text, html).catch(function() {
                return copyRichTextLegacy(text, html, container);
              });
            }
            return copyRichTextLegacy(text, html, container);
          }, options);
        }
        function parseRetryConfig(options) {
          if (typeof options === "number") {
            return { retries: options, retryDelay: 100, timeout: 0, signal: null };
          }
          var opts = options || {};
          var signal = opts.signal || null;
          if (signal && typeof signal.aborted === "undefined") {
            signal = null;
          }
          return {
            retries: opts.retries != null ? opts.retries : 2,
            retryDelay: opts.retryDelay != null ? opts.retryDelay : 100,
            timeout: opts.timeout != null ? opts.timeout : 0,
            signal
          };
        }
        function withTimeout(promise, ms) {
          if (!ms || ms <= 0) return promise;
          return new Promise(function(resolve, reject) {
            var timer = setTimeout(function() {
              reject(new Error("Operation timed out after " + ms + "ms"));
            }, ms);
            promise.then(function(val) {
              clearTimeout(timer);
              resolve(val);
            }, function(err) {
              clearTimeout(timer);
              reject(err);
            });
          });
        }
        function retryOperation(fn, config) {
          var cfg = parseRetryConfig(config);
          var attempt = 0;
          var signal = cfg.signal;
          if (signal && signal.aborted) {
            return rejectedPromise(new DOMException("Operation aborted", "AbortError"));
          }
          function tryOnce() {
            if (signal && signal.aborted) {
              return rejectedPromise(new DOMException("Operation aborted", "AbortError"));
            }
            return fn().catch(function(err) {
              attempt++;
              if (attempt > cfg.retries) {
                return rejectedPromise(err);
              }
              if (signal && signal.aborted) {
                return rejectedPromise(new DOMException("Operation aborted", "AbortError"));
              }
              var delay = Math.pow(2, attempt - 1) * cfg.retryDelay;
              return new Promise(function(resolve, reject) {
                var onAbort = null;
                var timer = setTimeout(function() {
                  if (onAbort && signal) {
                    signal.removeEventListener("abort", onAbort);
                  }
                  resolve();
                }, delay);
                if (signal) {
                  onAbort = function() {
                    clearTimeout(timer);
                    reject(new DOMException("Operation aborted", "AbortError"));
                  };
                  signal.addEventListener("abort", onAbort, { once: true });
                }
              }).then(tryOnce);
            });
          }
          return withTimeout(tryOnce(), cfg.timeout);
        }
        function nodeClipboardCopy(text) {
          if (!_isNode) {
            return rejectedPromise(new Error("Not running in Node.js environment"));
          }
          return new Promise(function(resolve, reject) {
            var platform = process.platform;
            var cmd, args;
            if (platform === "win32") {
              var psScript = "Set-Clipboard -Value ([System.Text.Encoding]::UTF8.GetString([Convert]::FromBase64String('" + Buffer.from(text, "utf8").toString("base64") + "')))";
              cmd = "powershell";
              args = [
                "-NoProfile",
                "-NonInteractive",
                "-EncodedCommand",
                Buffer.from(psScript, "utf16le").toString("base64")
              ];
            } else if (platform === "darwin") {
              cmd = "pbcopy";
              args = [];
            } else {
              cmd = "xclip";
              args = ["-selection", "clipboard"];
            }
            try {
              var spawn = __require("child_process").spawn;
              var proc = spawn(cmd, args, { stdio: ["pipe", "ignore", "ignore"] });
              var finished = false;
              proc.on("error", function(err) {
                if (!finished) {
                  finished = true;
                  if (platform !== "win32" && platform !== "darwin") {
                    nodeClipboardCopyFallback(text).then(resolve, reject);
                  } else {
                    reject(new Error("Clipboard command failed: " + cmd + " - " + err.message));
                  }
                }
              });
              proc.on("close", function(code) {
                if (!finished) {
                  finished = true;
                  if (code === 0) {
                    resolve(text);
                  } else {
                    reject(new Error("Clipboard command exited with code: " + code));
                  }
                }
              });
              if (platform !== "win32") {
                proc.stdin.write(text);
                proc.stdin.end();
              } else {
                proc.stdin.end();
              }
            } catch (e) {
              reject(new Error("Failed to spawn clipboard process: " + e.message));
            }
          });
        }
        function nodeClipboardCopyFallback(text) {
          return new Promise(function(resolve, reject) {
            try {
              var spawn = __require("child_process").spawn;
              var proc = spawn("xsel", ["--clipboard", "--input"], { stdio: ["pipe", "ignore", "ignore"] });
              var finished = false;
              proc.on("error", function(err) {
                if (!finished) {
                  finished = true;
                  reject(new Error("No clipboard command available. Install xclip or xsel. " + err.message));
                }
              });
              proc.on("close", function(code) {
                if (!finished) {
                  finished = true;
                  if (code === 0) {
                    resolve(text);
                  } else {
                    reject(new Error("xsel exited with code: " + code));
                  }
                }
              });
              proc.stdin.write(text);
              proc.stdin.end();
            } catch (e) {
              reject(new Error("Failed to spawn xsel: " + e.message));
            }
          });
        }
        function nodeClipboardRead() {
          if (!_isNode) {
            return rejectedPromise(new Error("Not running in Node.js environment"));
          }
          return new Promise(function(resolve, reject) {
            var platform = process.platform;
            var cmd, args;
            if (platform === "win32") {
              var psScript = "[Console]::OutputEncoding = [System.Text.Encoding]::UTF8; Get-Clipboard";
              cmd = "powershell";
              args = [
                "-NoProfile",
                "-NonInteractive",
                "-EncodedCommand",
                Buffer.from(psScript, "utf16le").toString("base64")
              ];
            } else if (platform === "darwin") {
              cmd = "pbpaste";
              args = [];
            } else {
              cmd = "xclip";
              args = ["-selection", "clipboard", "-o"];
            }
            try {
              var spawn = __require("child_process").spawn;
              var proc = spawn(cmd, args, { stdio: ["ignore", "pipe", "pipe"] });
              var output = "";
              var errOutput = "";
              var finished = false;
              proc.stdout.on("data", function(chunk) {
                output += chunk.toString("utf8");
              });
              proc.stderr.on("data", function(chunk) {
                errOutput += chunk.toString("utf8");
              });
              proc.on("error", function(err) {
                if (!finished) {
                  finished = true;
                  if (platform !== "win32" && platform !== "darwin") {
                    nodeClipboardReadFallback().then(resolve, reject);
                  } else {
                    reject(new Error("Clipboard read command failed: " + cmd + " - " + err.message));
                  }
                }
              });
              proc.on("close", function(code) {
                if (!finished) {
                  finished = true;
                  if (code === 0) {
                    resolve(output.replace(/\r?\n$/, ""));
                  } else {
                    reject(new Error("Clipboard read command exited with code: " + code + (errOutput ? " - " + errOutput.trim() : "")));
                  }
                }
              });
            } catch (e) {
              reject(new Error("Failed to spawn clipboard read process: " + e.message));
            }
          });
        }
        function nodeClipboardReadFallback() {
          return new Promise(function(resolve, reject) {
            try {
              var spawn = __require("child_process").spawn;
              var proc = spawn("xsel", ["--clipboard", "--output"], { stdio: ["ignore", "pipe", "pipe"] });
              var output = "";
              var errOutput = "";
              var finished = false;
              proc.stdout.on("data", function(chunk) {
                output += chunk.toString("utf8");
              });
              proc.stderr.on("data", function(chunk) {
                errOutput += chunk.toString("utf8");
              });
              proc.on("error", function(err) {
                if (!finished) {
                  finished = true;
                  reject(new Error("No clipboard read command available. Install xclip or xsel. " + err.message));
                }
              });
              proc.on("close", function(code) {
                if (!finished) {
                  finished = true;
                  if (code === 0) {
                    resolve(output.replace(/\r?\n$/, ""));
                  } else {
                    reject(new Error("xsel read exited with code: " + code + (errOutput ? " - " + errOutput.trim() : "")));
                  }
                }
              });
            } catch (e) {
              reject(new Error("Failed to spawn xsel for read: " + e.message));
            }
          });
        }
        function resolvedPromise(val) {
          return Promise.resolve(val);
        }
        function rejectedPromise(err) {
          return Promise.reject(err);
        }
        function queryClipboardPermission(permissionName) {
          if (!_isBrowser || !navigator.permissions || !_isFunction(navigator.permissions.query)) {
            return resolvedPromise({ state: "prompt" });
          }
          try {
            return navigator.permissions.query({ name: permissionName }).then(function(result) {
              return { state: result.state };
            }).catch(function() {
              return { state: "prompt" };
            });
          } catch (e) {
            return resolvedPromise({ state: "prompt" });
          }
        }
        function getAttr(name, element) {
          var attr = "data-nc-" + name;
          if (element.hasAttribute(attr)) {
            return element.getAttribute(attr);
          }
          return void 0;
        }
        function closest(element, selector) {
          if (element.closest) {
            return element.closest(selector);
          }
          var el = element;
          while (el && el.nodeType === 1) {
            if (matches(el, selector)) return el;
            el = el.parentNode;
          }
          return null;
        }
        function matches(el, selector) {
          var fn = el.matches || el.matchesSelector || el.msMatchesSelector || el.mozMatchesSelector || el.webkitMatchesSelector || el.oMatchesSelector;
          return fn ? fn.call(el, selector) : false;
        }
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
            destroy: function() {
              container.removeEventListener(eventType, listener, false);
            }
          };
        }
        function bindListener(target, eventType, handler) {
          if (_isString(target)) {
            return delegateEvent(document.body, target, eventType, handler);
          }
          if (_isElement(target)) {
            target.addEventListener(eventType, handler, false);
            return {
              destroy: function() {
                target.removeEventListener(eventType, handler, false);
              }
            };
          }
          if (_isNodeList(target)) {
            var destroyers = [];
            for (var i = 0; i < target.length; i++) {
              (function(el) {
                el.addEventListener(eventType, handler, false);
                destroyers.push(function() {
                  el.removeEventListener(eventType, handler, false);
                });
              })(target[i]);
            }
            return {
              destroy: function() {
                for (var j = 0; j < destroyers.length; j++) {
                  destroyers[j]();
                }
              }
            };
          }
          throw new TypeError("First argument must be a String selector, HTMLElement, or NodeList");
        }
        function parsePasteData(clipboardData) {
          var result = { text: "", html: "", files: [] };
          if (!clipboardData) return result;
          try {
            result.text = clipboardData.getData("text/plain") || "";
          } catch (e) {
          }
          try {
            result.html = clipboardData.getData("text/html") || "";
          } catch (e) {
          }
          try {
            if (clipboardData.files && clipboardData.files.length > 0) {
              result.files = Array.prototype.slice.call(clipboardData.files);
            }
          } catch (e) {
          }
          return result;
        }
        function bindPasteListener(target, callback) {
          if (!_isFunction(callback)) {
            throw new TypeError("Callback must be a function");
          }
          function pasteHandler(e) {
            var delegateEl = e.delegateTarget || e.currentTarget || e.target;
            var data = parsePasteData(e.clipboardData);
            data.originalEvent = e;
            data.trigger = delegateEl;
            callback(data);
          }
          if (target == null) {
            document.addEventListener("paste", pasteHandler, false);
            return {
              destroy: function() {
                document.removeEventListener("paste", pasteHandler, false);
              }
            };
          }
          if (_isString(target)) {
            return delegateEvent(document.body, target, "paste", pasteHandler);
          }
          if (_isElement(target)) {
            target.addEventListener("paste", pasteHandler, false);
            return {
              destroy: function() {
                target.removeEventListener("paste", pasteHandler, false);
              }
            };
          }
          throw new TypeError("Target must be a String selector, HTMLElement, or null");
        }
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
        NowClipboard.prototype = Object.create(EventEmitter.prototype);
        NowClipboard.prototype.constructor = NowClipboard;
        NowClipboard.prototype._checkDestroyed = function() {
          if (this._destroyed) {
            throw new Error("NowClipboard instance has been destroyed. Create a new instance.");
          }
        };
        NowClipboard.prototype.resolveOptions = function(opts) {
          this.action = _isFunction(opts.action) ? opts.action : this.defaultAction;
          this.target = _isFunction(opts.target) ? opts.target : this.defaultTarget;
          this.text = _isFunction(opts.text) ? opts.text : this.defaultText;
          this.container = _isElement(opts.container) ? opts.container : _isBrowser ? document.body : null;
          this.retries = opts.retries != null ? opts.retries : 2;
          this.retryDelay = opts.retryDelay != null ? opts.retryDelay : 100;
          this.timeout = opts.timeout != null ? opts.timeout : 0;
          this.signal = opts.signal || null;
        };
        NowClipboard.prototype.listenClick = function(trigger) {
          var self2 = this;
          this._listener = bindListener(trigger, "click", function(e) {
            self2.onClick(e);
          });
        };
        NowClipboard.prototype.onClick = function(e) {
          this._checkDestroyed();
          var trigger = e.delegateTarget || e.currentTarget;
          var actionName = this.action(trigger) || "copy";
          var targetEl = this.target(trigger);
          var text = this.text(trigger);
          var self2 = this;
          if (actionName !== "copy" && actionName !== "cut") {
            self2.emit("error", {
              action: actionName,
              trigger,
              error: new Error('Invalid action "' + actionName + '", use "copy" or "cut"'),
              clearSelection
            });
            return;
          }
          var operationPromise;
          var isRichCopy = getAttr("html", trigger) === "true";
          var retryOpts = { container: self2.container, retries: self2.retries, retryDelay: self2.retryDelay, timeout: self2.timeout, signal: self2.signal };
          if (text) {
            operationPromise = copyText(text, retryOpts);
          } else if (targetEl) {
            if (actionName === "cut") {
              if (targetEl.hasAttribute("readonly") || targetEl.hasAttribute("disabled")) {
                self2.emit("error", {
                  action: actionName,
                  trigger,
                  error: new Error('Cannot cut from elements with "readonly" or "disabled" attributes'),
                  clearSelection
                });
                return;
              }
              operationPromise = performCut(targetEl, retryOpts);
            } else if (isRichCopy) {
              var richHtml = targetEl.innerHTML;
              var richText = targetEl.textContent || targetEl.innerText || "";
              operationPromise = copyRichText({
                text: richText,
                html: richHtml,
                container: self2.container,
                retries: self2.retries,
                retryDelay: self2.retryDelay,
                timeout: self2.timeout,
                signal: self2.signal
              }).then(function(result) {
                return result.text;
              });
            } else {
              operationPromise = copyFromElement(targetEl, retryOpts);
            }
          } else {
            self2.emit("error", {
              action: actionName,
              trigger,
              error: new Error("No text or target specified"),
              clearSelection
            });
            return;
          }
          operationPromise.then(function(copiedText) {
            self2.emit("success", {
              action: actionName,
              text: copiedText,
              trigger,
              clearSelection
            });
          }).catch(function(err) {
            self2.emit("error", {
              action: actionName,
              trigger,
              error: err,
              clearSelection
            });
          });
        };
        var _originalOn = NowClipboard.prototype.on;
        NowClipboard.prototype.on = function() {
          this._checkDestroyed();
          return _originalOn.apply(this, arguments);
        };
        var _originalOnce = NowClipboard.prototype.once;
        NowClipboard.prototype.once = function() {
          this._checkDestroyed();
          return _originalOnce.apply(this, arguments);
        };
        var _originalOff = NowClipboard.prototype.off;
        NowClipboard.prototype.off = function() {
          this._checkDestroyed();
          return _originalOff.apply(this, arguments);
        };
        NowClipboard.prototype.defaultAction = function(trigger) {
          return getAttr("action", trigger) || "copy";
        };
        NowClipboard.prototype.defaultTarget = function(trigger) {
          var selector = getAttr("target", trigger);
          if (selector) {
            return document.querySelector(selector);
          }
          return void 0;
        };
        NowClipboard.prototype.defaultText = function(trigger) {
          return getAttr("text", trigger);
        };
        NowClipboard.prototype.destroy = function() {
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
          this.signal = null;
        };
        NowClipboard.copy = function(text, options) {
          if (!_isString(text)) {
            return rejectedPromise(new TypeError("NowClipboard.copy() expects a string argument"));
          }
          return copyText(text, options);
        };
        NowClipboard.cut = function(element, options) {
          if (!_isBrowser) {
            return rejectedPromise(new Error("NowClipboard.cut() is only available in browser environment"));
          }
          if (!_isElement(element)) {
            return rejectedPromise(new TypeError("NowClipboard.cut() expects an HTMLElement argument"));
          }
          return performCut(element, options);
        };
        NowClipboard.read = function(options) {
          return readText(options);
        };
        NowClipboard.readRich = function(options) {
          if (!_isBrowser) {
            return rejectedPromise(new Error("NowClipboard.readRich() is only available in browser environment"));
          }
          if (!isClipboardReadSupported()) {
            return rejectedPromise(new Error("clipboard.read() API not supported. Requires HTTPS and a modern browser"));
          }
          return retryOperation(function() {
            return navigator.clipboard.read().then(function(clipItems) {
              var result = { text: "", html: "", images: [] };
              var promises = [];
              for (var i = 0; i < clipItems.length; i++) {
                var item = clipItems[i];
                for (var j = 0; j < item.types.length; j++) {
                  (function(type) {
                    if (type === "text/plain") {
                      promises.push(item.getType(type).then(function(blob) {
                        return blob.text();
                      }).then(function(text) {
                        result.text = text;
                      }));
                    } else if (type === "text/html") {
                      promises.push(item.getType(type).then(function(blob) {
                        return blob.text();
                      }).then(function(html) {
                        result.html = html;
                      }));
                    } else if (type.indexOf("image/") === 0) {
                      promises.push(item.getType(type).then(function(blob) {
                        result.images.push(blob);
                      }));
                    }
                  })(item.types[j]);
                }
              }
              return Promise.all(promises).then(function() {
                return result;
              });
            });
          }, options);
        };
        NowClipboard.checkSupport = function(actions) {
          if (_isNode) return true;
          if (!_isBrowser) return false;
          if (isClipboardAPIAvailable()) return true;
          var actionList = actions || ["copy", "cut"];
          if (_isString(actionList)) actionList = [actionList];
          var supported = true;
          for (var i = 0; i < actionList.length; i++) {
            supported = supported && isExecCommandSupported(actionList[i]);
          }
          return supported;
        };
        NowClipboard.queryPermission = function(name) {
          if (name !== "read" && name !== "write") {
            return rejectedPromise(new TypeError('queryPermission() expects "read" or "write"'));
          }
          if (_isNode) {
            return resolvedPromise({ state: "granted" });
          }
          return queryClipboardPermission("clipboard-" + name);
        };
        NowClipboard.onPaste = function(target, callback) {
          if (!_isBrowser) {
            return {
              destroy: function() {
              }
            };
          }
          return bindPasteListener(target, callback);
        };
        NowClipboard.onChange = function(callback, interval) {
          if (!_isBrowser) {
            return {
              destroy: function() {
              }
            };
          }
          if (!_isFunction(callback)) {
            throw new TypeError("NowClipboard.onChange() expects a callback function");
          }
          var pollInterval = interval || 1e3;
          var lastText = null;
          var timer = null;
          var destroyed = false;
          var initialized = false;
          function poll() {
            if (destroyed) return;
            readText().then(function(text) {
              if (destroyed) return;
              if (!initialized) {
                lastText = text;
                initialized = true;
              } else if (text !== lastText) {
                lastText = text;
                try {
                  callback({ text });
                } catch (e) {
                  if (typeof console !== "undefined" && console.warn) {
                    console.warn("NowClipboard onChange callback error:", e);
                  }
                }
              }
            }).catch(function() {
            });
          }
          poll();
          timer = setInterval(poll, pollInterval);
          return {
            destroy: function() {
              destroyed = true;
              if (timer !== null) {
                clearInterval(timer);
                timer = null;
              }
            }
          };
        };
        NowClipboard.copyImage = function(source, options) {
          if (!_isBrowser) {
            return rejectedPromise(new Error("NowClipboard.copyImage() is only available in browser environment"));
          }
          if (!isClipboardItemSupported()) {
            return rejectedPromise(new Error("ClipboardItem API not supported. Requires HTTPS and a modern browser"));
          }
          return copyImage(source, options);
        };
        NowClipboard.copyBlob = function(blob, mimeType, options) {
          if (!_isBrowser) {
            return rejectedPromise(new Error("NowClipboard.copyBlob() is only available in browser environment"));
          }
          if (!isClipboardItemSupported()) {
            return rejectedPromise(new Error("ClipboardItem API not supported. Requires HTTPS and a modern browser"));
          }
          if (!(blob instanceof Blob)) {
            return rejectedPromise(new TypeError("NowClipboard.copyBlob() expects a Blob argument"));
          }
          var type = mimeType || blob.type;
          return retryOperation(function() {
            return copyImageBlob(blob, type);
          }, options);
        };
        NowClipboard.copyRich = function(options) {
          if (!options || !_isString(options.text) || !_isString(options.html)) {
            return rejectedPromise(new TypeError("NowClipboard.copyRich() requires { text: string, html: string }"));
          }
          if (!_isBrowser) {
            return rejectedPromise(new Error("NowClipboard.copyRich() is only available in browser environment"));
          }
          return copyRichText(options);
        };
        NowClipboard.write = function(text, options) {
          if (!_isString(text)) {
            return rejectedPromise(new TypeError("NowClipboard.write() expects a string argument"));
          }
          return copyText(text, options);
        };
        NowClipboard.writeImage = function(source, options) {
          if (_isBrowser) {
            if (!isClipboardItemSupported()) {
              return rejectedPromise(new Error("ClipboardItem API not supported. Requires HTTPS and a modern browser"));
            }
            return copyImage(source, options);
          }
          if (_isNode) {
            return nodeClipboardWriteImage(source, options);
          }
          return rejectedPromise(new Error("NowClipboard.writeImage() is not supported in this environment"));
        };
        function nodeClipboardWriteImage(source, options) {
          return new Promise(function(resolve, reject) {
            var platform = process.platform;
            var imagePromise;
            if (typeof Buffer !== "undefined" && source instanceof Buffer) {
              imagePromise = resolvedPromise(source);
            } else if (typeof Blob !== "undefined" && source instanceof Blob) {
              imagePromise = source.arrayBuffer().then(function(ab) {
                return Buffer.from(ab);
              });
            } else if (_isString(source)) {
              try {
                var fs = __require("fs");
                imagePromise = new Promise(function(res, rej) {
                  fs.readFile(source, function(err, data) {
                    if (err) rej(err);
                    else res(data);
                  });
                });
              } catch (e) {
                reject(new Error("Failed to read image file: " + e.message));
                return;
              }
            } else {
              reject(new TypeError("writeImage() expects Buffer, Blob, or file path string in Node.js"));
              return;
            }
            imagePromise.then(function(buffer) {
              var cmd, args, stdinData;
              if (platform === "darwin") {
                cmd = "pbcopy";
                args = [];
                stdinData = buffer;
              } else if (platform === "linux") {
                cmd = "xclip";
                args = ["-selection", "clipboard", "-t", "image/png"];
                stdinData = buffer;
              } else if (platform === "win32") {
                var psScript = [
                  "Add-Type -AssemblyName System.Windows.Forms",
                  "Add-Type -AssemblyName System.Drawing",
                  "$ms = New-Object System.IO.MemoryStream(,([Convert]::FromBase64String('" + buffer.toString("base64") + "')))",
                  "$img = [System.Drawing.Image]::FromStream($ms)",
                  "[System.Windows.Forms.Clipboard]::SetImage($img)",
                  "$img.Dispose()",
                  "$ms.Dispose()"
                ].join(";");
                cmd = "powershell";
                args = [
                  "-NoProfile",
                  "-NonInteractive",
                  "-EncodedCommand",
                  Buffer.from(psScript, "utf16le").toString("base64")
                ];
                stdinData = null;
              } else {
                reject(new Error("writeImage() is not supported on platform: " + platform));
                return;
              }
              try {
                var spawn = __require("child_process").spawn;
                var proc;
                if (stdinData !== null) {
                  proc = spawn(cmd, args, { stdio: ["pipe", "ignore", "pipe"] });
                  proc.stdin.write(stdinData);
                  proc.stdin.end();
                } else {
                  proc = spawn(cmd, args, { stdio: ["ignore", "ignore", "pipe"] });
                }
                var errOutput = "";
                var finished = false;
                if (proc.stderr) {
                  proc.stderr.on("data", function(chunk) {
                    errOutput += chunk.toString("utf8");
                  });
                }
                proc.on("error", function(err) {
                  if (!finished) {
                    finished = true;
                    var fallbackMsg = platform === "linux" ? " Install xclip or xsel." : "";
                    reject(new Error("writeImage() command failed: " + cmd + " - " + err.message + fallbackMsg));
                  }
                });
                proc.on("close", function(code) {
                  if (!finished) {
                    finished = true;
                    if (code === 0) {
                      try {
                        var resultBlob = new Blob([buffer], { type: "image/png" });
                        resolve(resultBlob);
                      } catch (e) {
                        resolve(buffer);
                      }
                    } else {
                      reject(new Error("writeImage() command exited with code: " + code + (errOutput ? " - " + errOutput.trim() : "")));
                    }
                  }
                });
              } catch (e) {
                reject(new Error("Failed to spawn writeImage process: " + e.message));
              }
            }).catch(function(err) {
              reject(err);
            });
          });
        }
        NowClipboard.writeFormats = function(formats, options) {
          if (!_isBrowser) {
            return rejectedPromise(new Error("NowClipboard.writeFormats() is only available in browser environment"));
          }
          if (!isClipboardItemSupported()) {
            return rejectedPromise(new Error("ClipboardItem API not supported. Requires HTTPS and a modern browser"));
          }
          if (!formats || typeof formats !== "object") {
            return rejectedPromise(new TypeError("NowClipboard.writeFormats() expects an object of MIME types"));
          }
          var keys = Object.keys(formats);
          if (keys.length === 0) {
            return rejectedPromise(new TypeError("NowClipboard.writeFormats() requires at least one MIME type"));
          }
          return retryOperation(function() {
            var itemData = {};
            for (var i = 0; i < keys.length; i++) {
              var mime = keys[i];
              var value = formats[mime];
              if (value instanceof Blob) {
                itemData[mime] = Promise.resolve(value);
              } else {
                itemData[mime] = Promise.resolve(new Blob([value], { type: mime }));
              }
            }
            var item = new ClipboardItem(itemData);
            return navigator.clipboard.write([item]).then(function() {
              return formats;
            });
          }, options);
        };
        function ClipboardHistory(options) {
          if (!(this instanceof ClipboardHistory)) {
            return new ClipboardHistory(options);
          }
          var opts = options || {};
          this._maxSize = opts.maxSize || 50;
          this._storageType = opts.storage || "memory";
          this._storageKey = opts.storageKey || "nowclipboard_history";
          this._pollInterval = opts.pollInterval || 1e3;
          this._entries = [];
          this._watcher = null;
          this._destroyed = false;
          if (this._storageType === "localStorage" || this._storageType === "sessionStorage") {
            this._loadFromStorage();
          }
        }
        ClipboardHistory.prototype.start = function() {
          if (this._destroyed) throw new Error("ClipboardHistory has been destroyed");
          if (this._watcher) return this;
          var self2 = this;
          this._watcher = NowClipboard.onChange(function(data) {
            self2._addEntry(data.text);
          }, this._pollInterval);
          return this;
        };
        ClipboardHistory.prototype.stop = function() {
          if (this._watcher) {
            this._watcher.destroy();
            this._watcher = null;
          }
          return this;
        };
        ClipboardHistory.prototype._addEntry = function(text) {
          if (this._destroyed) return;
          var entry = {
            text,
            timestamp: Date.now(),
            type: "text"
          };
          this._entries.push(entry);
          while (this._entries.length > this._maxSize) {
            this._entries.shift();
          }
          this._saveToStorage();
        };
        ClipboardHistory.prototype.list = function() {
          if (this._destroyed) throw new Error("ClipboardHistory has been destroyed");
          return this._entries.slice();
        };
        ClipboardHistory.prototype.search = function(keyword) {
          if (this._destroyed) throw new Error("ClipboardHistory has been destroyed");
          if (!_isString(keyword)) {
            throw new TypeError("search() expects a string keyword");
          }
          var lower = keyword.toLowerCase();
          return this._entries.filter(function(entry) {
            return entry.text.toLowerCase().indexOf(lower) !== -1;
          });
        };
        ClipboardHistory.prototype.latest = function() {
          if (this._destroyed) throw new Error("ClipboardHistory has been destroyed");
          return this._entries.length > 0 ? this._entries[this._entries.length - 1] : null;
        };
        ClipboardHistory.prototype.clear = function() {
          if (this._destroyed) throw new Error("ClipboardHistory has been destroyed");
          this._entries = [];
          this._saveToStorage();
        };
        ClipboardHistory.prototype.size = function() {
          return this._entries.length;
        };
        ClipboardHistory.prototype._loadFromStorage = function() {
          try {
            var storage = this._storageType === "localStorage" ? localStorage : sessionStorage;
            var data = storage.getItem(this._storageKey);
            if (data) {
              this._entries = JSON.parse(data);
              while (this._entries.length > this._maxSize) {
                this._entries.shift();
              }
            }
          } catch (e) {
            this._entries = [];
          }
        };
        ClipboardHistory.prototype._saveToStorage = function() {
          if (this._storageType === "memory") return;
          try {
            var storage = this._storageType === "localStorage" ? localStorage : sessionStorage;
            storage.setItem(this._storageKey, JSON.stringify(this._entries));
          } catch (e) {
          }
        };
        ClipboardHistory.prototype.destroy = function() {
          if (this._destroyed) return;
          this._destroyed = true;
          this.stop();
          this._entries = [];
        };
        NowClipboard.History = ClipboardHistory;
        NowClipboard.onSync = function(options) {
          if (!_isBrowser) {
            return {
              destroy: function() {
              },
              broadcast: function() {
              }
            };
          }
          if (typeof BroadcastChannel === "undefined") {
            return {
              destroy: function() {
              },
              broadcast: function() {
              }
            };
          }
          var opts = options || {};
          var channelName = opts.channel || "nowclipboard";
          var autoSync = opts.autoSync !== false;
          var bc = new BroadcastChannel(channelName);
          var listeners = [];
          var destroyed = false;
          bc.onmessage = function(event) {
            var data = event.data;
            if (!data || !data.type) return;
            for (var i = 0; i < listeners.length; i++) {
              try {
                listeners[i](data);
              } catch (e) {
                if (typeof console !== "undefined" && console.warn) {
                  console.warn("NowClipboard onSync callback error:", e);
                }
              }
            }
          };
          var originalCopy = NowClipboard.copy;
          var originalCut = NowClipboard.cut;
          if (autoSync) {
            NowClipboard.copy = function(text, opts2) {
              return originalCopy.call(NowClipboard, text, opts2).then(function(result) {
                if (!destroyed) {
                  try {
                    bc.postMessage({ type: "copy", text: result, timestamp: Date.now() });
                  } catch (e) {
                  }
                }
                return result;
              });
            };
            NowClipboard.cut = function(element, opts2) {
              return originalCut.call(NowClipboard, element, opts2).then(function(result) {
                if (!destroyed) {
                  try {
                    bc.postMessage({ type: "cut", text: result, timestamp: Date.now() });
                  } catch (e) {
                  }
                }
                return result;
              });
            };
          }
          return {
            /**
             * Broadcast a custom message to other tabs
             * @param {Object} data - Data to broadcast
             */
            broadcast: function(data) {
              if (!destroyed) {
                try {
                  bc.postMessage(data);
                } catch (e) {
                }
              }
            },
            /**
             * Add a listener for sync events
             * @param {Function} callback - Callback function
             */
            addListener: function(callback) {
              if (_isFunction(callback)) {
                listeners.push(callback);
              }
            },
            /**
             * Remove a listener
             * @param {Function} callback - Callback function to remove
             */
            removeListener: function(callback) {
              var idx = listeners.indexOf(callback);
              if (idx !== -1) {
                listeners.splice(idx, 1);
              }
            },
            /**
             * Destroy the sync instance and restore original methods
             */
            destroy: function() {
              if (destroyed) return;
              destroyed = true;
              if (autoSync) {
                NowClipboard.copy = originalCopy;
                NowClipboard.cut = originalCut;
              }
              bc.close();
              listeners = [];
            }
          };
        };
        return NowClipboard;
      });
    }
  });
  return require_NowClipboard();
})();
//# sourceMappingURL=NowClipboard.js.map
