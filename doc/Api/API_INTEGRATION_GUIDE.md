# Gemini 图像生成 API 接入指南

本文档详细介绍如何接入 Google Gemini 图像生成 API，包括 Gemini 原生接口和 OpenAI 兼容接口两种方式。

---

## 目录

- [1. 概述](#1-概述)
- [2. Gemini 原生接口快速接入](#2-gemini-原生接口快速接入)
- [3. OpenAI 兼容接口快速接入](#3-openai-兼容接口快速接入)
- [4. 两种接口详细对比](#4-两种接口详细对比)
- [5. 常见问题与解决方案](#5-常见问题与解决方案)
- [6. 参考资料](#6-参考资料)

---

## 1. 概述

### 1.1 支持的模型

| 模型名称 | 模型 ID | 特点 | 适用场景 |
|---------|---------|------|---------|
| Gemini 2.5 Flash Image | `gemini-2.5-flash-image` | 高速、低延迟 | 快速原型、实时应用 |
| Gemini 3 Pro Image Preview | `gemini-3-pro-image-preview` | 专业级质量、支持高级推理 | 专业资源制作、高质量输出 |

### 1.2 核心能力

- **文本生成图像**：根据文字描述生成图像
- **图像编辑**：基于参考图进行修改和编辑
- **多模态输出**：同时返回文本和图像
- **高分辨率支持**：最高支持 4K 分辨率（仅 Gemini 3 Pro）
- **多种长宽比**：支持 11 种预设长宽比

### 1.3 接口类型选择

| 接口类型 | 优势 | 劣势 | 推荐场景 |
|---------|------|------|---------|
| Gemini 原生接口 | 功能完整、参数精确控制 | 需要适配特定格式 | 新项目、需要完整功能 |
| OpenAI 兼容接口 | 与现有 OpenAI 代码兼容 | 部分高级功能受限 | 现有项目迁移、统一接口管理 |

---

## 2. Gemini 原生接口快速接入

### 2.1 接口规格

**端点 URL**
```
https://generativelanguage.googleapis.com/v1beta/models/{MODEL_NAME}:generateContent
```

**认证方式**
```
HTTP Header: x-goog-api-key: YOUR_API_KEY
```

### 2.2 请求格式

```json
{
  "contents": [{
    "role": "user",
    "parts": [
      {"text": "你的提示词"},
      {"inline_data": {"mime_type": "image/jpeg", "data": "BASE64_IMAGE_DATA"}}
    ]
  }],
  "generationConfig": {
    "responseModalities": ["TEXT", "IMAGE"],
    "imageConfig": {
      "aspectRatio": "16:9",
      "imageSize": "4K"
    }
  }
}
```

### 2.3 响应格式

```json
{
  "candidates": [{
    "content": {
      "parts": [
        {"text": "这是生成的描述文本"},
        {"inlineData": {"mimeType": "image/png", "data": "BASE64_IMAGE_DATA"}}
      ]
    }
  }]
}
```

### 2.4 支持的参数

#### 长宽比 (aspectRatio)

| 参数值 | 说明 | 适用场景 |
|-------|------|---------|
| `1:1` | 正方形 | 头像、社交媒体 |
| `2:3` | 竖版 | 海报、手机壁纸 |
| `3:2` | 横版 | 风景照片 |
| `3:4` | 竖版 | 人像摄影 |
| `4:3` | 横版 | 传统照片 |
| `4:5` | 竖版 | Instagram |
| `5:4` | 横版 | 打印照片 |
| `9:16` | 竖版 | 手机全屏、短视频 |
| `16:9` | 横版 | 宽屏、视频封面 |
| `21:9` | 超宽屏 | 电影画幅 |

#### 分辨率 (imageSize)

| 参数值 | 实际分辨率 | 支持模型 |
|-------|-----------|---------|
| `1K` | 约 1024x1024 | 所有模型 |
| `2K` | 约 2048x2048 | 所有模型 |
| `4K` | 约 4096x4096 | 仅 Gemini 3 Pro |

> **注意**：`imageSize` 参数值必须使用大写字母（如 `4K`，而非 `4k`）

#### 响应模态 (responseModalities)

| 参数值 | 说明 |
|-------|------|
| `["TEXT", "IMAGE"]` | 返回文本和图像（推荐） |
| `["IMAGE"]` | 仅返回图像 |
| `["TEXT"]` | 仅返回文本 |

### 2.5 完整代码示例

#### JavaScript/Node.js 示例

```javascript
/**
 * Gemini 原生接口 - 图像生成示例
 */
async function generateImageWithGemini(prompt, options = {}) {
    const {
        apiKey,
        model = 'gemini-3-pro-image-preview',
        aspectRatio = '1:1',
        imageSize = '4K',
        referenceImage = null  // Base64 编码的参考图
    } = options;

    // 构建请求 URL
    const baseUrl = 'https://generativelanguage.googleapis.com';
    const requestUrl = `${baseUrl}/v1beta/models/${model}:generateContent`;

    // 构建消息内容
    const parts = [{ text: prompt }];

    // 如果有参考图，添加到请求中
    if (referenceImage) {
        parts.push({
            inline_data: {
                mime_type: 'image/jpeg',
                data: referenceImage
            }
        });
    }

    // 构建请求体
    const payload = {
        contents: [{
            role: 'user',
            parts: parts
        }],
        generationConfig: {
            responseModalities: ['TEXT', 'IMAGE'],
            imageConfig: {
                aspectRatio: aspectRatio,
                imageSize: imageSize
            }
        }
    };

    try {
        const response = await fetch(requestUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-goog-api-key': apiKey
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(`API Error: ${error.error?.message || response.statusText}`);
        }

        const data = await response.json();

        // 解析响应
        const result = {
            text: '',
            images: []
        };

        if (data.candidates && data.candidates[0]?.content?.parts) {
            for (const part of data.candidates[0].content.parts) {
                if (part.text) {
                    result.text += part.text;
                } else if (part.inlineData) {
                    result.images.push({
                        mimeType: part.inlineData.mimeType,
                        data: part.inlineData.data
                    });
                }
            }
        }

        return result;

    } catch (error) {
        console.error('生成图像失败:', error);
        throw error;
    }
}

// 使用示例
async function main() {
    const result = await generateImageWithGemini(
        '一只可爱的橘猫坐在窗台上，阳光透过窗户洒在它身上，写实摄影风格',
        {
            apiKey: 'YOUR_API_KEY',
            model: 'gemini-3-pro-image-preview',
            aspectRatio: '4:3',
            imageSize: '4K'
        }
    );

    console.log('文本响应:', result.text);
    console.log('生成图片数量:', result.images.length);

    // 保存图片
    if (result.images.length > 0) {
        const imageData = result.images[0].data;
        // 在浏览器中显示
        const imgElement = document.createElement('img');
        imgElement.src = `data:image/png;base64,${imageData}`;
        document.body.appendChild(imgElement);
    }
}
```

#### Python 示例

```python
import requests
import base64
from typing import Optional, Dict, List

def generate_image_with_gemini(
    prompt: str,
    api_key: str,
    model: str = "gemini-3-pro-image-preview",
    aspect_ratio: str = "1:1",
    image_size: str = "4K",
    reference_image: Optional[str] = None  # Base64 编码
) -> Dict:
    """
    使用 Gemini 原生接口生成图像

    Args:
        prompt: 图像生成提示词
        api_key: Gemini API 密钥
        model: 模型名称
        aspect_ratio: 长宽比
        image_size: 分辨率 (1K/2K/4K)
        reference_image: 参考图的 Base64 编码（可选）

    Returns:
        包含 text 和 images 的字典
    """
    base_url = "https://generativelanguage.googleapis.com"
    url = f"{base_url}/v1beta/models/{model}:generateContent"

    # 构建消息内容
    parts = [{"text": prompt}]

    if reference_image:
        parts.append({
            "inline_data": {
                "mime_type": "image/jpeg",
                "data": reference_image
            }
        })

    payload = {
        "contents": [{
            "role": "user",
            "parts": parts
        }],
        "generationConfig": {
            "responseModalities": ["TEXT", "IMAGE"],
            "imageConfig": {
                "aspectRatio": aspect_ratio,
                "imageSize": image_size
            }
        }
    }

    headers = {
        "Content-Type": "application/json",
        "x-goog-api-key": api_key
    }

    response = requests.post(url, json=payload, headers=headers)
    response.raise_for_status()

    data = response.json()

    result = {"text": "", "images": []}

    if "candidates" in data and data["candidates"]:
        parts = data["candidates"][0].get("content", {}).get("parts", [])
        for part in parts:
            if "text" in part:
                result["text"] += part["text"]
            elif "inlineData" in part:
                result["images"].append({
                    "mime_type": part["inlineData"]["mimeType"],
                    "data": part["inlineData"]["data"]
                })

    return result


def save_image(base64_data: str, filename: str):
    """保存 Base64 图像到文件"""
    image_bytes = base64.b64decode(base64_data)
    with open(filename, "wb") as f:
        f.write(image_bytes)


# 使用示例
if __name__ == "__main__":
    result = generate_image_with_gemini(
        prompt="一只可爱的橘猫坐在窗台上，阳光透过窗户洒在它身上，写实摄影风格",
        api_key="YOUR_API_KEY",
        aspect_ratio="4:3",
        image_size="4K"
    )

    print(f"文本响应: {result['text']}")
    print(f"生成图片数量: {len(result['images'])}")

    # 保存第一张图片
    if result["images"]:
        save_image(result["images"][0]["data"], "output.png")
        print("图片已保存为 output.png")
```

#### cURL 示例

```bash
curl -X POST \
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-image-preview:generateContent" \
  -H "Content-Type: application/json" \
  -H "x-goog-api-key: YOUR_API_KEY" \
  -d '{
    "contents": [{
      "role": "user",
      "parts": [
        {"text": "一只可爱的橘猫坐在窗台上，阳光透过窗户洒在它身上，写实摄影风格"}
      ]
    }],
    "generationConfig": {
      "responseModalities": ["TEXT", "IMAGE"],
      "imageConfig": {
        "aspectRatio": "4:3",
        "imageSize": "4K"
      }
    }
  }'
```

### 2.6 使用限制

| 限制项 | 限制值 |
|-------|-------|
| 参考图片最大数量 | 14 张 |
| 高保真对象图片最大数量 | 6 张 |
| 人物图片最大数量 | 5 张 |
| 图像水印 | 所有生成图片包含 SynthID 水印 |

---

## 3. OpenAI 兼容接口快速接入

### 3.1 接口规格

**端点 URL**
```
{BASE_URL}/v1/chat/completions
```

**认证方式**
```
HTTP Header: Authorization: Bearer YOUR_API_KEY
```

### 3.2 请求格式

```json
{
  "model": "gemini-3-pro-image-preview",
  "messages": [{
    "role": "user",
    "content": [
      {"type": "text", "text": "你的提示词"},
      {"type": "image_url", "image_url": {"url": "data:image/jpeg;base64,BASE64_DATA"}}
    ]
  }],
  "stream": false,
  "size": "4096x4096",
  "aspect_ratio": "16:9"
}
```

### 3.3 响应格式

```json
{
  "id": "chatcmpl-xxxxx",
  "object": "chat.completion",
  "created": 1234567890,
  "model": "gemini-3-pro-image-preview",
  "choices": [{
    "index": 0,
    "message": {
      "role": "assistant",
      "content": "这是文本响应\n\n![image](data:image/png;base64,BASE64_IMAGE_DATA)"
    },
    "finish_reason": "stop"
  }],
  "usage": {
    "prompt_tokens": 100,
    "completion_tokens": 200,
    "total_tokens": 300
  }
}
```

> **注意**：图像数据嵌入在 Markdown 格式中，需要通过正则表达式提取

### 3.4 支持的参数

#### 分辨率 (size)

| 参数值 | 对应分辨率 |
|-------|-----------|
| `1024x1024` | 1K |
| `2048x2048` | 2K |
| `4096x4096` | 4K |

#### 其他参数

| 参数 | 类型 | 说明 |
|-----|------|------|
| `model` | string | 模型名称 |
| `messages` | array | 消息列表 |
| `stream` | boolean | 是否启用流式传输 |
| `aspect_ratio` | string | 长宽比（如 "16:9"） |

### 3.5 完整代码示例

#### JavaScript/Node.js 示例

```javascript
/**
 * OpenAI 兼容接口 - 图像生成示例
 */
async function generateImageWithOpenAI(prompt, options = {}) {
    const {
        apiKey,
        baseUrl = 'https://api.openai.com',  // 替换为兼容接口地址
        model = 'gemini-3-pro-image-preview',
        size = '4096x4096',
        aspectRatio = '1:1',
        stream = false,
        referenceImage = null  // Base64 编码的参考图
    } = options;

    // 构建请求 URL
    const requestUrl = `${baseUrl.replace(/\/$/, '')}/v1/chat/completions`;

    // 构建消息内容
    const content = [{ type: 'text', text: prompt }];

    // 如果有参考图，添加到请求中
    if (referenceImage) {
        content.push({
            type: 'image_url',
            image_url: {
                url: `data:image/jpeg;base64,${referenceImage}`
            }
        });
    }

    // 构建请求体
    const payload = {
        model: model,
        messages: [{
            role: 'user',
            content: content
        }],
        stream: stream,
        size: size,
        aspect_ratio: aspectRatio
    };

    try {
        const response = await fetch(requestUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(`API Error: ${error.error?.message || response.statusText}`);
        }

        const data = await response.json();

        // 解析响应
        const result = {
            text: '',
            images: []
        };

        if (data.choices && data.choices[0]?.message?.content) {
            const content = data.choices[0].message.content;

            // 提取图片（Markdown 格式）
            const imageRegex = /!\[.*?\]\((data:image\/[^)]+)\)/g;
            let match;
            let textContent = content;

            while ((match = imageRegex.exec(content)) !== null) {
                const dataUrl = match[1];
                const base64Data = dataUrl.split(',')[1];
                const mimeType = dataUrl.match(/data:([^;]+)/)?.[1] || 'image/png';

                result.images.push({
                    mimeType: mimeType,
                    data: base64Data
                });

                // 从文本中移除图片 Markdown
                textContent = textContent.replace(match[0], '');
            }

            result.text = textContent.trim();
        }

        return result;

    } catch (error) {
        console.error('生成图像失败:', error);
        throw error;
    }
}

// 使用示例
async function main() {
    const result = await generateImageWithOpenAI(
        '一只可爱的橘猫坐在窗台上，阳光透过窗户洒在它身上，写实摄影风格',
        {
            apiKey: 'YOUR_API_KEY',
            baseUrl: 'https://your-compatible-api.com',
            model: 'gemini-3-pro-image-preview',
            size: '4096x4096',
            aspectRatio: '4:3'
        }
    );

    console.log('文本响应:', result.text);
    console.log('生成图片数量:', result.images.length);

    // 保存图片
    if (result.images.length > 0) {
        const imageData = result.images[0].data;
        const imgElement = document.createElement('img');
        imgElement.src = `data:image/png;base64,${imageData}`;
        document.body.appendChild(imgElement);
    }
}
```

#### Python 示例

```python
import requests
import base64
import re
from typing import Optional, Dict, List

def generate_image_with_openai(
    prompt: str,
    api_key: str,
    base_url: str = "https://api.openai.com",
    model: str = "gemini-3-pro-image-preview",
    size: str = "4096x4096",
    aspect_ratio: str = "1:1",
    stream: bool = False,
    reference_image: Optional[str] = None
) -> Dict:
    """
    使用 OpenAI 兼容接口生成图像

    Args:
        prompt: 图像生成提示词
        api_key: API 密钥
        base_url: API 基础地址
        model: 模型名称
        size: 分辨率 (1024x1024/2048x2048/4096x4096)
        aspect_ratio: 长宽比
        stream: 是否流式传输
        reference_image: 参考图的 Base64 编码（可选）

    Returns:
        包含 text 和 images 的字典
    """
    url = f"{base_url.rstrip('/')}/v1/chat/completions"

    # 构建消息内容
    content = [{"type": "text", "text": prompt}]

    if reference_image:
        content.append({
            "type": "image_url",
            "image_url": {
                "url": f"data:image/jpeg;base64,{reference_image}"
            }
        })

    payload = {
        "model": model,
        "messages": [{
            "role": "user",
            "content": content
        }],
        "stream": stream,
        "size": size,
        "aspect_ratio": aspect_ratio
    }

    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {api_key}"
    }

    response = requests.post(url, json=payload, headers=headers)
    response.raise_for_status()

    data = response.json()

    result = {"text": "", "images": []}

    if "choices" in data and data["choices"]:
        content = data["choices"][0].get("message", {}).get("content", "")

        # 提取图片（Markdown 格式）
        image_pattern = r'!\[.*?\]\((data:image/[^)]+)\)'
        matches = re.findall(image_pattern, content)

        text_content = re.sub(image_pattern, '', content).strip()
        result["text"] = text_content

        for data_url in matches:
            parts = data_url.split(',')
            if len(parts) == 2:
                mime_match = re.match(r'data:([^;]+)', parts[0])
                mime_type = mime_match.group(1) if mime_match else "image/png"
                result["images"].append({
                    "mime_type": mime_type,
                    "data": parts[1]
                })

    return result


def save_image(base64_data: str, filename: str):
    """保存 Base64 图像到文件"""
    image_bytes = base64.b64decode(base64_data)
    with open(filename, "wb") as f:
        f.write(image_bytes)


# 使用示例
if __name__ == "__main__":
    result = generate_image_with_openai(
        prompt="一只可爱的橘猫坐在窗台上，阳光透过窗户洒在它身上，写实摄影风格",
        api_key="YOUR_API_KEY",
        base_url="https://your-compatible-api.com",
        size="4096x4096",
        aspect_ratio="4:3"
    )

    print(f"文本响应: {result['text']}")
    print(f"生成图片数量: {len(result['images'])}")

    if result["images"]:
        save_image(result["images"][0]["data"], "output.png")
        print("图片已保存为 output.png")
```

#### cURL 示例

```bash
curl -X POST \
  "https://your-compatible-api.com/v1/chat/completions" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -d '{
    "model": "gemini-3-pro-image-preview",
    "messages": [{
      "role": "user",
      "content": [
        {"type": "text", "text": "一只可爱的橘猫坐在窗台上，阳光透过窗户洒在它身上，写实摄影风格"}
      ]
    }],
    "stream": false,
    "size": "4096x4096",
    "aspect_ratio": "4:3"
  }'
```

### 3.6 流式传输示例

```javascript
async function generateImageWithStream(prompt, options = {}) {
    const { apiKey, baseUrl, model } = options;

    const response = await fetch(`${baseUrl}/v1/chat/completions`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            model: model,
            messages: [{ role: 'user', content: prompt }],
            stream: true,
            size: '4096x4096'
        })
    });

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullContent = '';

    while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n').filter(line => line.startsWith('data: '));

        for (const line of lines) {
            const data = line.slice(6);
            if (data === '[DONE]') continue;

            try {
                const parsed = JSON.parse(data);
                const delta = parsed.choices?.[0]?.delta?.content || '';
                fullContent += delta;

                // 实时显示文本
                console.log(delta);
            } catch (e) {
                // 忽略解析错误
            }
        }
    }

    // 流式完成后解析图片
    const imageMatch = fullContent.match(/!\[.*?\]\((data:image\/[^)]+)\)/);
    if (imageMatch) {
        return {
            text: fullContent.replace(imageMatch[0], '').trim(),
            imageDataUrl: imageMatch[1]
        };
    }

    return { text: fullContent, imageDataUrl: null };
}
```

---

## 4. 两种接口详细对比

### 4.1 基础对比

| 对比项 | Gemini 原生接口 | OpenAI 兼容接口 |
|-------|----------------|-----------------|
| **端点路径** | `/v1beta/models/{model}:generateContent` | `/v1/chat/completions` |
| **认证方式** | `x-goog-api-key` Header | `Authorization: Bearer` Header |
| **认证格式** | 直接 API Key | `Bearer {API_KEY}` |

### 4.2 请求格式对比

| 对比项 | Gemini 原生接口 | OpenAI 兼容接口 |
|-------|----------------|-----------------|
| **消息结构** | `contents[].parts[]` | `messages[].content[]` |
| **文本格式** | `{"text": "..."}` | `{"type": "text", "text": "..."}` |
| **图片格式** | `{"inline_data": {"mime_type": "...", "data": "..."}}` | `{"type": "image_url", "image_url": {"url": "data:...;base64,..."}}` |
| **分辨率参数** | `imageConfig.imageSize`: `"1K"/"2K"/"4K"` | `size`: `"1024x1024"/"2048x2048"/"4096x4096"` |
| **长宽比参数** | `imageConfig.aspectRatio` | `aspect_ratio` |
| **响应模态** | `generationConfig.responseModalities` | 自动 |

### 4.3 响应格式对比

| 对比项 | Gemini 原生接口 | OpenAI 兼容接口 |
|-------|----------------|-----------------|
| **响应结构** | `candidates[].content.parts[]` | `choices[].message.content` |
| **文本位置** | `part.text` | 直接在 `content` 中 |
| **图片位置** | `part.inlineData.data` | 嵌入在 Markdown `![](data:...)` 中 |
| **图片提取** | 直接访问 | 需正则表达式解析 |
| **流式支持** | 不支持 | 支持 |

### 4.4 功能支持对比

| 功能 | Gemini 原生接口 | OpenAI 兼容接口 |
|-----|----------------|-----------------|
| 文本生成图像 | 支持 | 支持 |
| 图像编辑 | 支持 | 支持 |
| 4K 分辨率 | 支持 | 支持 |
| 多图参考 | 最多 14 张 | 取决于实现 |
| 流式传输 | 不支持 | 支持 |
| 响应模态控制 | 支持 | 不支持 |
| 直接图片数据 | 支持 | 需解析 |

### 4.5 代码实现对比

```javascript
// ============= Gemini 原生接口 =============
// 请求
const geminiPayload = {
    contents: [{
        role: 'user',
        parts: [
            { text: prompt },
            { inline_data: { mime_type: 'image/jpeg', data: base64Data } }
        ]
    }],
    generationConfig: {
        responseModalities: ['TEXT', 'IMAGE'],
        imageConfig: {
            imageSize: '4K',
            aspectRatio: '16:9'
        }
    }
};

// 响应解析
const parts = data.candidates[0].content.parts;
parts.forEach(part => {
    if (part.inlineData) {
        const imageBase64 = part.inlineData.data;
    } else if (part.text) {
        const textContent = part.text;
    }
});

// ============= OpenAI 兼容接口 =============
// 请求
const openaiPayload = {
    model: 'gemini-3-pro-image-preview',
    messages: [{
        role: 'user',
        content: [
            { type: 'text', text: prompt },
            { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${base64Data}` } }
        ]
    }],
    stream: false,
    size: '4096x4096',
    aspect_ratio: '16:9'
};

// 响应解析
const content = data.choices[0].message.content;
const match = content.match(/!\[.*?\]\((data:image\/[^)]+)\)/);
if (match) {
    const imageBase64 = match[1].split(',')[1];
}
```

---

## 5. 常见问题与解决方案

### 5.1 认证相关

#### Q: 请求返回 401 Unauthorized
**A:** 检查以下几点：
- Gemini 原生接口：确认使用 `x-goog-api-key` Header，值为纯 API Key
- OpenAI 兼容接口：确认使用 `Authorization` Header，值为 `Bearer YOUR_API_KEY`

```javascript
// Gemini 原生接口 - 正确
headers: { 'x-goog-api-key': 'AIzaSy...' }

// OpenAI 兼容接口 - 正确
headers: { 'Authorization': 'Bearer sk-...' }
```

### 5.2 参数相关

#### Q: 4K 分辨率不生效
**A:**
1. 确认使用的是 `gemini-3-pro-image-preview` 模型，`gemini-2.5-flash-image` 不支持 4K
2. Gemini 原生接口：确认 `imageSize` 使用大写（`"4K"` 而非 `"4k"`）
3. OpenAI 兼容接口：使用 `"4096x4096"` 而非 `"4K"`

#### Q: 长宽比参数无效
**A:**
1. 确认使用支持的长宽比值：`1:1`, `2:3`, `3:2`, `3:4`, `4:3`, `4:5`, `5:4`, `9:16`, `16:9`, `21:9`
2. Gemini 原生接口：参数位于 `generationConfig.imageConfig.aspectRatio`
3. OpenAI 兼容接口：参数为顶层的 `aspect_ratio`

### 5.3 响应解析

#### Q: OpenAI 兼容接口无法提取图片
**A:** 图片以 Markdown 格式嵌入，使用正则表达式提取：

```javascript
const content = response.choices[0].message.content;
const regex = /!\[.*?\]\((data:image\/[^)]+)\)/g;
const matches = [...content.matchAll(regex)];

matches.forEach(match => {
    const dataUrl = match[1];
    const base64Data = dataUrl.split(',')[1];
    // 使用 base64Data
});
```

#### Q: 生成的图片无法显示
**A:**
1. 确认 Base64 数据完整性
2. 确认 MIME 类型正确（通常为 `image/png`）
3. 在浏览器中可直接使用 Data URL：

```javascript
const img = document.createElement('img');
img.src = `data:image/png;base64,${base64Data}`;
```

### 5.4 性能相关

#### Q: 请求超时
**A:**
1. 4K 图像生成需要更长时间，建议设置 60-120 秒超时
2. 考虑使用流式传输（仅 OpenAI 兼容接口支持）
3. 可以先用 1K 测试，再切换到更高分辨率

```javascript
fetch(url, {
    method: 'POST',
    headers: headers,
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(120000)  // 120 秒超时
});
```

### 5.5 内容限制

#### Q: 返回内容安全错误
**A:**
1. Gemini 有内容安全过滤，避免生成敏感内容
2. 人物图片有额外限制（最多 5 张参考图）
3. 所有生成的图片会包含 SynthID 水印，这是正常的

### 5.6 接口切换

#### Q: 如何在两种接口间切换
**A:** 创建统一的适配层：

```javascript
async function generateImage(prompt, options) {
    const { interfaceType = 'gemini', ...rest } = options;

    if (interfaceType === 'gemini') {
        return await generateImageWithGemini(prompt, rest);
    } else {
        return await generateImageWithOpenAI(prompt, rest);
    }
}
```

---

## 6. 参考资料

### 6.1 官方文档

- [Google AI for Developers - 图片生成](https://ai.google.dev/gemini-api/docs/image-generation?hl=zh-cn)
- [Gemini API 参考](https://ai.google.dev/api/generate-content)
- [Google AI Studio](https://aistudio.google.com/)

### 6.2 模型说明

| 资源 | 链接 |
|-----|------|
| Gemini 模型列表 | https://ai.google.dev/gemini-api/docs/models/gemini |
| 速率限制说明 | https://ai.google.dev/gemini-api/docs/quota |
| 定价信息 | https://ai.google.dev/pricing |

### 6.3 相关工具

- [Gemini 3 Pro Image Preview 工作台](https://github.com/Tansuo2021/gemini-3-pro-image-preview) - 本项目 GitHub 仓库
- [Banana Prompt](https://github.com/glidea/banana-prompt-quicker) - 优质提示词库

### 6.4 社区资源

- [Google AI Discord](https://discord.gg/google-ai)
- [Google Developers Blog](https://developers.googleblog.com/)

---

## 版本历史

| 版本 | 日期 | 更新内容 |
|-----|------|---------|
| v1.0.0 | 2026-02-06 | 初始版本，包含完整接入指南 |

---

<div align="center">

**如有问题，请提交 [Issue](https://github.com/Tansuo2021/gemini-3-pro-image-preview/issues)**

</div>
