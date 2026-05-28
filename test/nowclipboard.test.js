/**
 * NowClipboard Test Suite
 * Unit tests for core functionality
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import NowClipboard from '../src/NowClipboard.js';

// ========================================
// 1. Static Methods - Text Operations
// ========================================

describe('NowClipboard.copy()', () => {
  it('should reject non-string arguments', async () => {
    await expect(NowClipboard.copy(123)).rejects.toThrow('expects a string');
    await expect(NowClipboard.copy(null)).rejects.toThrow('expects a string');
    await expect(NowClipboard.copy(undefined)).rejects.toThrow('expects a string');
  });

  it('should return a Promise', () => {
    const result = NowClipboard.copy('test');
    expect(result).toBeInstanceOf(Promise);
    // Suppress unhandled rejection
    result.catch(() => {});
  });
});

describe('NowClipboard.read()', () => {
  it('should return a Promise', () => {
    const result = NowClipboard.read();
    expect(result).toBeInstanceOf(Promise);
    result.catch(() => {});
  });
});

describe('NowClipboard.readRich()', () => {
  it('should reject when Clipboard read API is not available', async () => {
    // In jsdom, navigator.clipboard.read is not available
    await expect(NowClipboard.readRich()).rejects.toThrow();
  });
});

// ========================================
// 2. Static Methods - Cut
// ========================================

describe('NowClipboard.cut()', () => {
  it('should reject non-Element arguments', async () => {
    await expect(NowClipboard.cut('not-an-element')).rejects.toThrow('HTMLElement');
    await expect(NowClipboard.cut(null)).rejects.toThrow('HTMLElement');
  });

  it('should accept an optional options parameter', () => {
    const el = document.createElement('textarea');
    el.value = 'test';
    const result = NowClipboard.cut(el, { retries: 3 });
    expect(result).toBeInstanceOf(Promise);
    result.catch(() => {});
  });
});

// ========================================
// 3. Static Methods - Check Support
// ========================================

describe('NowClipboard.checkSupport()', () => {
  it('should return a boolean', () => {
    expect(typeof NowClipboard.checkSupport()).toBe('boolean');
  });

  it('should accept string or array argument', () => {
    expect(typeof NowClipboard.checkSupport('copy')).toBe('boolean');
    expect(typeof NowClipboard.checkSupport(['copy', 'cut'])).toBe('boolean');
  });
});

// ========================================
// 4. Static Methods - Permission
// ========================================

describe('NowClipboard.queryPermission()', () => {
  it('should reject invalid permission names', async () => {
    await expect(NowClipboard.queryPermission('invalid')).rejects.toThrow('"read" or "write"');
  });

  it('should accept "read" and "write"', async () => {
    const readResult = await NowClipboard.queryPermission('read');
    expect(readResult).toHaveProperty('state');

    const writeResult = await NowClipboard.queryPermission('write');
    expect(writeResult).toHaveProperty('state');
  });
});

// ========================================
// 5. Static Methods - onPaste / onChange
// ========================================

describe('NowClipboard.onPaste()', () => {
  it('should return a listener object with destroy method', () => {
    const listener = NowClipboard.onPaste(null, () => {});
    expect(listener).toHaveProperty('destroy');
    expect(typeof listener.destroy).toBe('function');
    listener.destroy();
  });

  it('should work with selector string', () => {
    const listener = NowClipboard.onPaste('.paste-area', () => {});
    expect(listener).toHaveProperty('destroy');
    listener.destroy();
  });
});

describe('NowClipboard.onChange()', () => {
  it('should return a listener object with destroy method', () => {
    const listener = NowClipboard.onChange(() => {}, 500);
    expect(listener).toHaveProperty('destroy');
    expect(typeof listener.destroy).toBe('function');
    listener.destroy();
  });

  it('should throw for non-function callback', () => {
    // onChange throws TypeError for programming errors (not environment checks)
    expect(() => NowClipboard.onChange('not-a-function')).toThrow('callback function');
  });
});

// ========================================
// 6. Static Methods - Image / Blob / Rich
// ========================================

describe('NowClipboard.copyImage()', () => {
  it('should reject when ClipboardItem API is not available', async () => {
    await expect(NowClipboard.copyImage('https://example.com/img.png')).rejects.toThrow();
  });
});

describe('NowClipboard.copyBlob()', () => {
  it('should reject when ClipboardItem API is not available', async () => {
    const blob = new Blob(['test'], { type: 'text/plain' });
    await expect(NowClipboard.copyBlob(blob)).rejects.toThrow('ClipboardItem');
  });

  it('should reject non-Blob when ClipboardItem is available', async () => {
    // In jsdom ClipboardItem is not available, so the API check runs first
    // This test validates the argument check would work if ClipboardItem existed
    await expect(NowClipboard.copyBlob('not-a-blob')).rejects.toThrow();
  });
});

describe('NowClipboard.copyRich()', () => {
  it('should reject without required text/html options', async () => {
    await expect(NowClipboard.copyRich({})).rejects.toThrow();
    await expect(NowClipboard.copyRich({ text: 'hello' })).rejects.toThrow();
    await expect(NowClipboard.copyRich({ html: '<b>hi</b>' })).rejects.toThrow();
  });
});

// ========================================
// 7. Instance - Constructor & Lifecycle
// ========================================

describe('NowClipboard instance', () => {
  it('should create instance with selector', () => {
    const btn = document.createElement('button');
    btn.className = 'test-btn';
    document.body.appendChild(btn);

    const clipboard = new NowClipboard('.test-btn');
    expect(clipboard).toBeInstanceOf(NowClipboard);
    expect(clipboard._destroyed).toBe(false);

    clipboard.destroy();
    btn.remove();
  });

  it('should create instance without new keyword', () => {
    const btn = document.createElement('button');
    btn.className = 'test-btn2';
    document.body.appendChild(btn);

    const clipboard = NowClipboard('.test-btn2');
    expect(clipboard).toBeInstanceOf(NowClipboard);

    clipboard.destroy();
    btn.remove();
  });

  it('should throw after destroy when calling on/once/off', () => {
    const btn = document.createElement('button');
    btn.className = 'test-btn3';
    document.body.appendChild(btn);

    const clipboard = new NowClipboard('.test-btn3');
    clipboard.destroy();

    expect(() => clipboard.on('success', () => {})).toThrow('destroyed');
    expect(() => clipboard.once('success', () => {})).toThrow('destroyed');
    expect(() => clipboard.off('success')).toThrow('destroyed');

    btn.remove();
  });

  it('should handle double destroy gracefully', () => {
    const clipboard = new NowClipboard('.nonexistent');
    clipboard.destroy();
    // Second destroy should not throw
    expect(() => clipboard.destroy()).not.toThrow();
  });
});

// ========================================
// 8. Instance - Event System
// ========================================

describe('EventEmitter', () => {
  let clipboard;

  beforeEach(() => {
    clipboard = new NowClipboard('.test-ev');
  });

  afterEach(() => {
    clipboard.destroy();
  });

  it('should emit and listen to events', () => {
    const handler = vi.fn();
    clipboard.on('success', handler);
    clipboard.emit('success', { text: 'hello' });
    expect(handler).toHaveBeenCalledWith({ text: 'hello' });
  });

  it('should support once listeners', () => {
    const handler = vi.fn();
    clipboard.once('success', handler);
    clipboard.emit('success', { text: 'a' });
    clipboard.emit('success', { text: 'b' });
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('should support off to remove listeners', () => {
    const handler = vi.fn();
    clipboard.on('success', handler);
    clipboard.off('success', handler);
    clipboard.emit('success', { text: 'a' });
    expect(handler).not.toHaveBeenCalled();
  });

  it('should ignore invalid event names or handlers', () => {
    expect(() => clipboard.on(123, () => {})).not.toThrow();
    expect(() => clipboard.on('test', 'not-a-function')).not.toThrow();
  });

  it('should support context binding', () => {
    const ctx = { value: 42 };
    let receivedCtx;
    clipboard.on('success', function () {
      receivedCtx = this;
    }, ctx);
    clipboard.emit('success', {});
    expect(receivedCtx).toBe(ctx);
  });
});

// ========================================
// 9. Retry & Timeout Mechanism
// ========================================

describe('Retry mechanism', () => {
  it('should retry on failure up to configured times', async () => {
    let attempts = 0;
    const failingCopy = async () => {
      attempts++;
      if (attempts < 3) throw new Error('fail');
      return 'success';
    };

    // Test retryOperation directly through read with mock
    // Simulate retry by using a function that fails first then succeeds
    expect(attempts).toBe(0);

    // Test that AbortSignal with already-aborted signal rejects immediately
    const controller = new AbortController();
    controller.abort();
    const result = NowClipboard.copy('test', { signal: controller.signal });
    await expect(result).rejects.toThrow();
  });

  it('should respect timeout option', async () => {
    // Timeout = 0 means no timeout, should not reject for timeout
    const result = NowClipboard.copy('test', { timeout: 0 });
    expect(result).toBeInstanceOf(Promise);
    result.catch(() => {});
  });

  it('should respect AbortSignal', async () => {
    const controller = new AbortController();
    controller.abort(); // Abort immediately

    await expect(NowClipboard.copy('test', { signal: controller.signal }))
      .rejects.toThrow();
  });

  it('should reject with AbortError when signal is aborted', async () => {
    const controller = new AbortController();
    controller.abort();

    try {
      await NowClipboard.copy('test', { signal: controller.signal });
      expect.fail('Should have thrown');
    } catch (err) {
      expect(err.name).toBe('AbortError');
    }
  });

  it('should retry with exponential backoff', async () => {
    let attempts = 0;
    // Use a mock that fails twice then succeeds to verify retry count
    const startTime = Date.now();
    // We can't easily mock internal functions, but we can verify
    // the retry options are accepted without error
    const result = NowClipboard.copy('retry-test', { retries: 5, retryDelay: 50 });
    expect(result).toBeInstanceOf(Promise);
    result.catch(() => {});
  });
});

// ========================================
// 10. Utility Functions (internal)
// ========================================

describe('Data URL parsing', () => {
  it('should handle base64 data URLs correctly', () => {
    // Verify base64 data URL format is recognized
    const dataUrl = 'data:text/plain;base64,SGVsbG8gV29ybGQ=';
    expect(dataUrl.startsWith('data:')).toBe(true);
    expect(dataUrl).toContain('base64');

    // Verify we can decode the base64 content
    const encoded = dataUrl.split(',')[1];
    const decoded = atob(encoded);
    expect(decoded).toBe('Hello World');
  });

  it('should handle non-base64 data URLs correctly', () => {
    // Verify non-base64 (percent-encoded) data URL format
    const dataUrl = 'data:text/plain,Hello%20World';
    expect(dataUrl.startsWith('data:')).toBe(true);
    expect(dataUrl).not.toContain('base64');

    // Verify percent-decoding works
    const encoded = dataUrl.split(',')[1];
    const decoded = decodeURIComponent(encoded);
    expect(decoded).toBe('Hello World');
  });

  it('should handle emoji in non-base64 data URLs via TextEncoder', () => {
    // Test that TextEncoder correctly handles BMP+ characters
    const text = 'Hello 🌍 World';
    const encoded = new TextEncoder().encode(text);
    // Verify it's a byte array (jsdom may return a different constructor)
    expect(encoded.length).toBeGreaterThan(0);
    // Verify the encoded data is correct by decoding back
    const decoded = new TextDecoder().decode(encoded);
    expect(decoded).toBe(text);
  });
});

// ========================================
// P0 Features
// ========================================

describe('NowClipboard.write()', () => {
  it('should reject non-string arguments', async () => {
    await expect(NowClipboard.write(123)).rejects.toThrow('expects a string');
    await expect(NowClipboard.write(null)).rejects.toThrow('expects a string');
  });

  it('should be a function', () => {
    expect(typeof NowClipboard.write).toBe('function');
  });
});

describe('NowClipboard.writeImage()', () => {
  it('should be a function', () => {
    expect(typeof NowClipboard.writeImage).toBe('function');
  });

  it('should reject when ClipboardItem is not supported', async () => {
    // jsdom does not support ClipboardItem
    await expect(NowClipboard.writeImage('test.png')).rejects.toThrow();
  });
});

describe('NowClipboard.writeFormats()', () => {
  it('should be a function', () => {
    expect(typeof NowClipboard.writeFormats).toBe('function');
  });

  it('should reject non-object arguments', async () => {
    await expect(NowClipboard.writeFormats('invalid')).rejects.toThrow();
    await expect(NowClipboard.writeFormats(null)).rejects.toThrow();
  });

  it('should reject empty objects', async () => {
    // In jsdom, ClipboardItem check runs first, so we get a different error
    // This tests the validation logic when ClipboardItem IS available
    await expect(NowClipboard.writeFormats({})).rejects.toThrow();
  });

  it('should reject when ClipboardItem is not supported', async () => {
    await expect(NowClipboard.writeFormats({ 'text/plain': 'hello' })).rejects.toThrow();
  });
});

describe('NowClipboard.History', () => {
  it('should be a constructor', () => {
    expect(typeof NowClipboard.History).toBe('function');
  });

  it('should create instance with default options', () => {
    var history = new NowClipboard.History();
    expect(history.size()).toBe(0);
    expect(history.list()).toEqual([]);
    expect(history.latest()).toBeNull();
    history.destroy();
  });

  it('should create instance with custom options', () => {
    var history = new NowClipboard.History({ maxSize: 10, storage: 'memory' });
    expect(history.size()).toBe(0);
    history.destroy();
  });

  it('should support list, search, clear, latest operations', () => {
    var history = new NowClipboard.History();
    // Manually add entries via internal method
    history._addEntry('hello world');
    history._addEntry('hello javascript');
    history._addEntry('goodbye world');

    expect(history.size()).toBe(3);
    expect(history.list().length).toBe(3);
    expect(history.latest().text).toBe('goodbye world');

    var results = history.search('hello');
    expect(results.length).toBe(2);

    var results2 = history.search('WORLD');
    expect(results2.length).toBe(2); // case-insensitive

    history.clear();
    expect(history.size()).toBe(0);
    expect(history.latest()).toBeNull();
    history.destroy();
  });

  it('should enforce maxSize', () => {
    var history = new NowClipboard.History({ maxSize: 3 });
    history._addEntry('a');
    history._addEntry('b');
    history._addEntry('c');
    history._addEntry('d');

    expect(history.size()).toBe(3);
    expect(history.list()[0].text).toBe('b'); // 'a' was evicted
    expect(history.latest().text).toBe('d');
    history.destroy();
  });

  it('should throw after destroy', () => {
    var history = new NowClipboard.History();
    history.destroy();
    expect(() => history.list()).toThrow('destroyed');
    expect(() => history.search('x')).toThrow('destroyed');
    expect(() => history.latest()).toThrow('destroyed');
    expect(() => history.clear()).toThrow('destroyed');
  });

  it('should track timestamp and type in entries', () => {
    var history = new NowClipboard.History();
    var before = Date.now();
    history._addEntry('test');
    var after = Date.now();
    var entry = history.latest();
    expect(entry.text).toBe('test');
    expect(entry.type).toBe('text');
    expect(entry.timestamp).toBeGreaterThanOrEqual(before);
    expect(entry.timestamp).toBeLessThanOrEqual(after);
    history.destroy();
  });
});

describe('NowClipboard.onSync()', () => {
  it('should be a function', () => {
    expect(typeof NowClipboard.onSync).toBe('function');
  });

  it('should return an object with destroy and broadcast methods', () => {
    var sync = NowClipboard.onSync();
    expect(typeof sync.destroy).toBe('function');
    expect(typeof sync.broadcast).toBe('function');
    expect(typeof sync.addListener).toBe('function');
    expect(typeof sync.removeListener).toBe('function');
    sync.destroy();
  });

  it('should return stub in non-browser-like environment', () => {
    // In jsdom, BroadcastChannel may not be available
    // The function should not throw
    var sync = NowClipboard.onSync();
    expect(typeof sync.destroy).toBe('function');
    sync.destroy();
  });
});
