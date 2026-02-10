import {
  EventStreamContentType,
  fetchEventSource
} from '@fortaine/fetch-event-source';

// ─── SSE 事件类型 ──────────────────────────────────────────────
export const SSEEvent = {
  ANSWER: 'answer',
  FAST_ANSWER: 'fastAnswer',
  TOOL_CALL: 'toolCall',
  TOOL_PARAMS: 'toolParams',
  TOOL_RESPONSE: 'toolResponse',
  INTERACTIVE: 'interactive',
  ERROR: 'error',
  FLOW_NODE_RESPONSE: 'flowNodeResponse',
  FLOW_NODE_STATUS: 'flowNodeStatus',
  WORKFLOW_DURATION: 'workflowDuration',
  UPDATE_VARIABLES: 'updateVariables'
} as const;

export type SSEEventType = (typeof SSEEvent)[keyof typeof SSEEvent];

// ─── 消息类型 ──────────────────────────────────────────────────
export interface SSEMessageItem {
  event: SSEEventType;
  text?: string;
  reasoningText?: string;
  nodeResponse?: Record<string, unknown>;
  variables?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface StreamResponse {
  responseText: string;
}

export interface StreamError {
  message: string;
  responseText: string;
}

// ─── 请求参数类型 ──────────────────────────────────────────────
export interface StreamFetchOptions {
  url: string;
  data: Record<string, any>;
  onMessage: (item: SSEMessageItem) => void;
  abortCtrl: AbortController;
  headers?: Record<string, string>;
  timeout?: number;
}

export interface JsonFetchOptions {
  url: string;
  data?: Record<string, any>;
  headers?: Record<string, string>;
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  abortCtrl?: AbortController;
  timeout?: number;
}

// ─── 文本类事件集合 ────────────────────────────────────────────
const TEXT_EVENTS = new Set<SSEEventType>([SSEEvent.ANSWER, SSEEvent.FAST_ANSWER]);

// ─── 动画队列：平滑消费 SSE 消息 ─────────────────────────────
class AnimationQueue {
  private _queue: SSEMessageItem[] = [];
  private _finished = false;
  private _responseText = '';
  private _rafId: number | null = null;
  private readonly _onConsume: (item: SSEMessageItem) => void;
  private readonly _onFinish: () => void;

  constructor(onConsume: (item: SSEMessageItem) => void, onFinish: () => void) {
    this._onConsume = onConsume;
    this._onFinish = onFinish;
  }

  get responseText(): string {
    return this._responseText;
  }

  push(item: SSEMessageItem): void {
    this._queue.push(item);
    if (document.hidden) this._flush();
  }

  /** 标记流结束，等队列消费完毕后触发 onFinish */
  markFinished(): void {
    this._finished = true;
  }

  /** 立即清空队列（用于中断场景） */
  drain(): void {
    this._flush(this._queue.length);
    this._finished = true;
  }

  start(): void {
    this._tick();
  }

  stop(): void {
    if (this._rafId) cancelAnimationFrame(this._rafId);
  }

  // ── 内部方法 ──

  private _tick(): void {
    this._flush();

    if (this._finished && this._queue.length === 0) {
      this._onFinish();
      return;
    }
    this._rafId = requestAnimationFrame(() => this._tick());
  }

  private _flush(count?: number): void {
    const n = count ?? Math.max(1, Math.round(this._queue.length / 30));
    const batch = this._queue.splice(0, n);

    for (const item of batch) {
      this._onConsume(item);
      if (TEXT_EVENTS.has(item.event) && item.text) {
        this._responseText += item.text;
      }
    }
  }
}

// ─── JSON 安全解析 ─────────────────────────────────────────────
function safeParse(raw: string): Record<string, any> | null {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

// ─── 从 OpenAI 格式 delta 中提取文本与推理内容 ──────────────────
function extractDelta(json: Record<string, any>): { text: string; reasoning: string } {
  const delta = json?.choices?.[0]?.delta;
  return {
    text: delta?.content ?? '',
    reasoning: delta?.reasoning_content ?? ''
  };
}

// ─── SSE 事件分发器 ────────────────────────────────────────────
function dispatchSSEEvent(
  event: string,
  json: Record<string, any>,
  queue: AnimationQueue,
  onMessage: (item: SSEMessageItem) => void
): { error: Record<string, any> } | null {
  const { text, reasoning } = extractDelta(json);

  switch (event) {
    // ── 逐字符动画输出 ──
    case SSEEvent.ANSWER:
      if (reasoning) queue.push({ event, reasoningText: reasoning });
      for (const char of text) {
        queue.push({ event, text: char });
      }
      break;

    // ── 整块快速输出 ──
    case SSEEvent.FAST_ANSWER:
      if (reasoning) queue.push({ event, reasoningText: reasoning });
      if (text) queue.push({ event, text });
      break;

    // ── 工具调用链 ──
    case SSEEvent.TOOL_CALL:
    case SSEEvent.TOOL_PARAMS:
    case SSEEvent.TOOL_RESPONSE:
    // ── 交互式对话 ──
    case SSEEvent.INTERACTIVE:
      queue.push({ event: event as SSEEventType, ...json });
      break;

    // ── 直通事件（不走动画队列） ──
    case SSEEvent.FLOW_NODE_RESPONSE:
      onMessage({ event, nodeResponse: json });
      break;
    case SSEEvent.UPDATE_VARIABLES:
      onMessage({ event, variables: json });
      break;
    case SSEEvent.FLOW_NODE_STATUS:
    case SSEEvent.WORKFLOW_DURATION:
      onMessage({ event: event as SSEEventType, ...json });
      break;

    // ── 错误 ──
    case SSEEvent.ERROR:
      return { error: json };

    default:
      break;
  }

  return null;
}

// ─── 核心：流式请求客户端 ──────────────────────────────────────
export function streamFetch({
  url,
  data,
  onMessage,
  abortCtrl,
  headers = {},
  timeout = 60_000
}: StreamFetchOptions): Promise<StreamResponse> {
  return new Promise<StreamResponse>((resolve, reject) => {
    let errMsg: string | undefined;

    // ── 1. 超时保护 ──
    const timer = setTimeout(() => abortCtrl.abort('Timeout'), timeout);
    const clearTimer = () => clearTimeout(timer);

    // ── 2. 结束处理 ──
    const done = (queue: AnimationQueue): void => {
      clearTimer();
      queue.stop();
      if (errMsg !== undefined) {
        reject({ message: errMsg, responseText: queue.responseText } satisfies StreamError);
      } else {
        resolve({ responseText: queue.responseText });
      }
    };

    const fail = (err: any, queue: AnimationQueue): void => {
      clearTimer();
      errMsg =
        typeof err === 'string' ? err : err?.message || err?.statusText || '响应异常';
      queue.markFinished();
    };

    // ── 3. 动画队列 ──
    const queue = new AnimationQueue(onMessage, () => done(queue));
    queue.start();

    // ── 4. 发起 SSE 请求 ──
    fetchEventSource(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify({ ...data, stream: true }),
      signal: abortCtrl.signal,
      openWhenHidden: true,

      async onopen(res) {
        clearTimer();

        // 非流式响应（纯文本错误）
        if (res.headers.get('content-type')?.startsWith('text/plain')) {
          return fail(await res.clone().text(), queue);
        }

        // 非 200 或非 SSE 内容类型
        if (
          !res.ok ||
          res.status !== 200 ||
          !res.headers.get('content-type')?.startsWith(EventStreamContentType)
        ) {
          try {
            fail(await res.clone().json(), queue);
          } catch {
            const text = await res.clone().text();
            if (!text.startsWith('event: error')) fail('请求失败', queue);
          }
        }
      },

      onmessage({ event, data: raw }) {
        if (raw === '[DONE]') return;

        const json = safeParse(raw);
        if (!json || typeof json !== 'object') return;

        const result = dispatchSSEEvent(event, json, queue, onMessage);
        if (result?.error) {
          errMsg = result.error?.message || result.error?.statusText || '流响应错误';
        }
      },

      onclose() {
        queue.markFinished();
      },

      onerror(err) {
        clearTimer();
        fail(err, queue);
        throw err;
      }
    }).catch((err: any) => {
      clearTimer();
      if (abortCtrl.signal.aborted) {
        queue.drain();
        return;
      }
      fail(err, queue);
    });
  });
}

// ─── 便捷方法：非流式请求 ──────────────────────────────────────
export async function jsonFetch<T = any>({
  url,
  data,
  headers = {},
  method = 'POST',
  abortCtrl,
  timeout = 30_000
}: JsonFetchOptions): Promise<T> {
  const controller = abortCtrl || new AbortController();
  const timer = setTimeout(() => controller.abort('Timeout'), timeout);

  try {
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json', ...headers },
      body: method !== 'GET' ? JSON.stringify(data) : undefined,
      signal: controller.signal
    });

    clearTimeout(timer);

    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: res.statusText }));
      throw err;
    }

    return (await res.json()) as T;
  } catch (err) {
    clearTimeout(timer);
    throw err;
  }
}
