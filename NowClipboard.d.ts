// NowClipboard TypeScript 类型定义 v1.1.5

export interface RetryOptions {
  /** 最大重试次数，默认 2 */
  retries?: number;
  /** 基础重试延迟 ms，默认 100（指数退避） */
  retryDelay?: number;
  /** 超时 ms，默认 0（不超时） */
  timeout?: number;
  /** AbortSignal，用于取消操作 */
  signal?: AbortSignal | null;
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

export interface ReadRichResult {
  /** 纯文本内容 */
  text: string;
  /** HTML 内容 */
  html: string;
  /** 图片 Blob 列表 */
  images: Blob[];
}

export interface ChangeListener {
  /** 销毁变更监听 */
  destroy: () => void;
}

export interface ChangeData {
  /** 变更后的剪贴板文本 */
  text: string;
}

export type ImageSource = Blob | File | HTMLImageElement | HTMLCanvasElement | string;

/** 事件映射 */
type EventMap = {
  success: SuccessEvent;
  error: ErrorEvent;
};

/** 事件处理函数类型 */
type EventHandler<T> = (data: T) => void;

/**
 * NowClipboard 主类
 * 现代剪贴板工具库，支持浏览器和 Node.js 双环境
 */
declare class NowClipboard {
  /**
   * 创建 NowClipboard 实例
   * @param trigger - CSS 选择器、DOM 元素或元素集合
   * @param options - 配置项
   */
  constructor(trigger: string | Element | NodeList, options?: NowClipboardOptions);

  /**
   * 注册事件监听
   * @param event - 事件名称
   * @param handler - 事件处理函数
   * @param ctx - 上下文对象
   */
  on<K extends keyof EventMap>(event: K, handler: EventHandler<EventMap[K]>, ctx?: any): this;
  on(event: string, handler: (...args: any[]) => void, ctx?: any): this;

  /**
   * 注册一次性事件监听
   * @param event - 事件名称
   * @param handler - 事件处理函数
   * @param ctx - 上下文对象
   */
  once<K extends keyof EventMap>(event: K, handler: EventHandler<EventMap[K]>, ctx?: any): this;
  once(event: string, handler: (...args: any[]) => void, ctx?: any): this;

  /**
   * 移除事件监听
   * @param event - 事件名称
   * @param handler - 要移除的事件处理函数（不传则移除该事件所有监听）
   */
  off<K extends keyof EventMap>(event: K, handler?: EventHandler<EventMap[K]>): this;
  off(event: string, handler?: (...args: any[]) => void): this;

  /**
   * 销毁实例，移除所有事件监听和 DOM 绑定
   */
  destroy(): void;

  /**
   * 复制文本到剪贴板
   * @param text - 要复制的文本
   * @param options - 重试配置
   * @returns 复制的文本
   */
  static copy(text: string, options?: RetryOptions & { container?: Element }): Promise<string>;

  /**
   * 剪切元素内容（仅浏览器）
   * @param element - 目标元素
   * @param options - 重试配置
   * @returns 剪切的文本
   */
  static cut(element: Element, options?: RetryOptions): Promise<string>;

  /**
   * 读取剪贴板文本
   * @param options - 重试配置
   * @returns 剪贴板文本内容
   */
  static read(options?: RetryOptions): Promise<string>;

  /**
   * 读取剪贴板富内容（文本、HTML、图片）（仅浏览器，需要 HTTPS + 现代浏览器）
   * @param options - 重试配置
   * @returns 剪贴板富内容
   */
  static readRich(options?: RetryOptions): Promise<ReadRichResult>;

  /**
   * 检测环境是否支持剪贴板操作
   * @param actions - 要检测的操作（默认 ['copy', 'cut']）
   * @returns 是否支持
   */
  static checkSupport(actions?: string | string[]): boolean;

  /**
   * 查询剪贴板权限
   * @param name - 'read' 或 'write'
   * @returns 权限状态
   */
  static queryPermission(name: 'read' | 'write'): Promise<PermissionResult>;

  /**
   * 监听粘贴事件（仅浏览器）
   * @param target - 选择器、元素或 null（默认监听 document）
   * @param callback - 粘贴回调，接收 { text, html, files, originalEvent, trigger }
   * @returns 监听器对象，包含 destroy 方法
   */
  static onPaste(target: string | Element | null, callback: (data: PasteData) => void): PasteListener;

  /**
   * 监听剪贴板内容变更（仅浏览器，轮询方式）
   * @param callback - 变更回调，接收 { text }
   * @param interval - 轮询间隔 ms，默认 1000
   * @returns 监听器对象，包含 destroy 方法
   */
  static onChange(callback: (data: ChangeData) => void, interval?: number): ChangeListener;

  /**
   * 复制图片到剪贴板（仅浏览器，需要 HTTPS + 现代浏览器）
   * @param source - 图片源（Blob、File、HTMLImageElement、HTMLCanvasElement 或图片 URL）
   * @param options - 重试配置
   * @returns 复制的 Blob
   */
  static copyImage(source: ImageSource, options?: RetryOptions): Promise<Blob>;

  /**
   * 复制任意 Blob 到剪贴板（仅浏览器）
   * @param blob - Blob 数据
   * @param mimeType - MIME 类型，默认使用 blob.type
   * @param options - 重试配置
   * @returns 复制的 Blob
   */
  static copyBlob(blob: Blob, mimeType?: string, options?: RetryOptions): Promise<Blob>;

  /**
   * 复制富文本（HTML + 纯文本）到剪贴板（仅浏览器）
   * @param options - 富文本配置 { text, html, container?, retries?, retryDelay?, timeout?, signal? }
   * @returns 复制的富文本内容
   */
  static copyRich(options: RichTextOptions): Promise<{ text: string; html: string }>;
}

export default NowClipboard;
export { NowClipboard };
