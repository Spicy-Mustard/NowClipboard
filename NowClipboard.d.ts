// NowClipboard TypeScript 类型定义

export interface RetryOptions {
  /** 最大重试次数，默认 2 */
  retries?: number;
  /** 基础重试延迟 ms，默认 100（指数退避） */
  retryDelay?: number;
  /** 超时 ms，默认 0（不超时） */
  timeout?: number;
}

export interface NowClipboardOptions extends RetryOptions {
  /** 操作类型函数，返回 'copy' 或 'cut' */
  action?: (trigger: Element) => 'copy' | 'cut';
  /** 目标元素获取函数 */
  target?: (trigger: Element) => Element | null | undefined;
  /** 复制文本获取函数 */
  text?: (trigger: Element) => string | undefined;
  /** 容器元素，默认 document.body */
  container?: Element;
}

export interface SuccessEvent {
  /** 操作类型 */
  action: 'copy' | 'cut';
  /** 复制的文本内容 */
  text: string;
  /** 触发操作的 DOM 元素 */
  trigger: Element;
  /** 清除页面选区 */
  clearSelection: () => void;
}

export interface ErrorEvent {
  /** 操作类型 */
  action: string;
  /** 触发操作的 DOM 元素 */
  trigger: Element;
  /** 错误对象 */
  error: Error;
  /** 清除页面选区 */
  clearSelection: () => void;
}

export interface PasteData {
  /** 纯文本内容 */
  text: string;
  /** HTML 内容 */
  html: string;
  /** 文件列表 */
  files: File[];
  /** 原始 paste 事件 */
  originalEvent: ClipboardEvent;
  /** 触发元素 */
  trigger: Element;
}

export interface PasteListener {
  /** 销毁粘贴监听 */
  destroy: () => void;
}

export interface PermissionResult {
  /** 权限状态 */
  state: 'granted' | 'denied' | 'prompt';
}

export interface RichTextOptions extends RetryOptions {
  /** 纯文本内容 */
  text: string;
  /** HTML 内容 */
  html: string;
  /** 容器元素 */
  container?: Element;
}

export type ImageSource = Blob | File | HTMLImageElement | HTMLCanvasElement | string;

type EventMap = {
  success: SuccessEvent;
  error: ErrorEvent;
};

declare class NowClipboard {
  /**
   * 创建 NowClipboard 实例
   * @param trigger - CSS 选择器、DOM 元素或元素集合
   * @param options - 配置项
   */
  constructor(trigger: string | Element | NodeList, options?: NowClipboardOptions);

  /** 注册事件监听 */
  on<K extends keyof EventMap>(event: K, handler: (data: EventMap[K]) => void, ctx?: any): this;
  on(event: string, handler: (...args: any[]) => void, ctx?: any): this;

  /** 注册一次性事件监听 */
  once<K extends keyof EventMap>(event: K, handler: (data: EventMap[K]) => void, ctx?: any): this;
  once(event: string, handler: (...args: any[]) => void, ctx?: any): this;

  /** 移除事件监听 */
  off<K extends keyof EventMap>(event: K, handler?: (data: EventMap[K]) => void): this;
  off(event: string, handler?: (...args: any[]) => void): this;

  /** 销毁实例 */
  destroy(): void;

  /**
   * 复制文本到剪贴板
   * @param text - 要复制的文本
   * @param options - 重试配置
   */
  static copy(text: string, options?: RetryOptions & { container?: Element }): Promise<string>;

  /**
   * 剪切元素内容（仅浏览器）
   * @param element - 目标元素
   */
  static cut(element: Element): Promise<string>;

  /**
   * 读取剪贴板文本
   * @param options - 重试配置
   */
  static read(options?: RetryOptions): Promise<string>;

  /**
   * 检测环境是否支持剪贴板操作
   * @param actions - 要检测的操作
   */
  static checkSupport(actions?: string | string[]): boolean;

  /**
   * 查询剪贴板权限
   * @param name - 'read' 或 'write'
   */
  static queryPermission(name: 'read' | 'write'): Promise<PermissionResult>;

  /**
   * 监听粘贴事件（仅浏览器）
   * @param target - 选择器、元素或 null
   * @param callback - 粘贴回调
   */
  static onPaste(target: string | Element | null, callback: (data: PasteData) => void): PasteListener;

  /**
   * 复制图片到剪贴板（仅浏览器，需要 HTTPS + 现代浏览器）
   * @param source - 图片源（Blob、File、HTMLImageElement、HTMLCanvasElement 或图片 URL）
   * @param options - 重试配置
   */
  static copyImage(source: ImageSource, options?: RetryOptions): Promise<Blob>;

  /**
   * 复制任意 Blob 到剪贴板（仅浏览器）
   * @param blob - Blob 数据
   * @param mimeType - MIME 类型，默认使用 blob.type
   * @param options - 重试配置
   */
  static copyBlob(blob: Blob, mimeType?: string, options?: RetryOptions): Promise<Blob>;

  /**
   * 复制富文本（HTML + 纯文本）到剪贴板（仅浏览器）
   * @param options - 富文本配置
   */
  static copyRich(options: RichTextOptions): Promise<{ text: string; html: string }>;
}

export default NowClipboard;
export { NowClipboard };
