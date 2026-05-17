# GPT-image-2 API 接口文档

> 模型标识符（AI/ML API）：`openai/gpt-image-2`  
> Base URL（AI/ML API）：`https://api.aimlapi.com`  
> 认证方式：请求头携带 `Authorization: Bearer <YOUR_AIMLAPI_KEY>`

---

## 目录

- [概述](#概述)
- [接口一：生成图像 POST /v1/images/generations](#接口一生成图像)
- [接口二：编辑图像 POST /v1/images/edits](#接口二编辑图像)
- [响应结构说明](#响应结构说明)
- [代码示例](#代码示例)

---

## 概述

`gpt-image-2` 是 OpenAI 目前（截至 2026 年 4 月）最先进的图像生成模型，支持：

- **文本到图像生成**（`/v1/images/generations`）
- **图像编辑与合成**（`/v1/images/edits`）：支持单张或多张图像（最多 16 张）输入，也支持使用 mask 蒙版精确控制编辑区域

> ⚠️ **重要限制**：`/v1/images/edits` 端点仅接受**本地文件路径**作为图像输入，不支持 URL 或 base64 编码方式传入图像。

---

## 接口一：生成图像

### `POST /v1/images/generations`

根据文本提示词生成全新图像。

**请求地址**

```
POST https://api.aimlapi.com/v1/images/generations
```

**请求头**

| 字段            | 值                              |
| --------------- | ------------------------------- |
| `Content-Type`  | `application/json`              |
| `Authorization` | `Bearer <YOUR_AIMLAPI_KEY>`     |

---

### 请求体参数（JSON）

#### 必填参数

| 参数名  | 类型   | 说明 |
| ------- | ------ | ---- |
| `model` | string | 固定值：`"openai/gpt-image-2"` |
| `prompt` | string | 描述图像内容、风格或构图的文本提示词。最大长度 **32000** 个字符。 |

---

#### 可选参数

| 参数名               | 类型    | 默认值      | 可选值                                      | 说明 |
| -------------------- | ------- | ----------- | ------------------------------------------- | ---- |
| `size`               | string  | `1024x1024` | `1024x1024` / `1024x1536` / `1536x1024`    | 生成图像的尺寸。也支持自定义分辨率（格式 `WIDTHxHEIGHT`，宽高须为 16 的倍数，宽高比需在 1:3 到 3:1 之间，最大支持 `3840x2160`，2560×1440 以上为实验性功能）。 |
| `quality`            | string  | `medium`    | `low` / `medium` / `high`                  | 图像质量等级。`high` 最精细但耗时较长；`low` 速度最快。 |
| `output_format`      | string  | `png`       | `png` / `jpeg` / `webp`                    | 返回图像的格式。若需要透明背景，须选 `png` 或 `webp`。 |
| `background`         | string  | `auto`      | `transparent` / `opaque` / `auto`          | 图像背景透明度。`transparent` 要求 `output_format` 为 `png` 或 `webp`；`auto` 由模型自动判断最佳背景。 |
| `moderation`         | string  | `auto`      | `low` / `auto`                             | 内容审核级别。`low` 为较宽松的过滤；`auto` 为默认审核级别。 |
| `n`                  | number  | `1`         | 仅支持 `1`                                 | 生成图像数量。此端点当前仅支持 n=1。 |
| `output_compression` | integer | `100`       | `0` ~ `100`                                | 压缩级别（百分比），仅对 `jpeg` 和 `webp` 格式有效。`100` 为无压缩，值越小文件越小质量越低。 |
| `response_format`    | string  | `url`       | `url` / `b64_json`                         | 返回图像的方式。`url` 返回可访问链接；`b64_json` 返回 base64 编码字符串。 |

---

### 请求示例

```json
{
  "model": "openai/gpt-image-2",
  "prompt": "A futuristic city skyline at sunset with flying cars",
  "size": "1536x1024",
  "quality": "high",
  "output_format": "png",
  "background": "opaque",
  "response_format": "url"
}
```

---

### 响应示例

```json
{
  "data": [
    {
      "url": "https://cdn.aimlapi.com/generations/openai-image-generation/xxxx.png",
      "b64_json": null
    }
  ],
  "meta": {
    "usage": {
      "credits_used": 107341,
      "usd_spent": 0.0536705
    }
  }
}
```

---

## 接口二：编辑图像

### `POST /v1/images/edits`

基于一张或多张输入图像及文本提示词，生成经过编辑或融合后的新图像。

**请求地址**

```
POST https://api.aimlapi.com/v1/images/edits
```

**请求头**

| 字段            | 值                              |
| --------------- | ------------------------------- |
| `Content-Type`  | `multipart/form-data`（文件上传）|
| `Authorization` | `Bearer <YOUR_AIMLAPI_KEY>`     |

> ⚠️ 此端点传输图像使用 `multipart/form-data` 而非 JSON，图像须以**本地文件**形式上传。

---

### 请求体参数（multipart/form-data）

#### 必填参数

| 参数名  | 类型             | 说明 |
| ------- | ---------------- | ---- |
| `model` | string           | 固定值：`"openai/gpt-image-2"` |
| `prompt` | string          | 描述如何对图像进行编辑的文本提示词。最大长度 **32000** 个字符。 |
| `image`  | file 或 file[]  | 要编辑的图像文件。支持 `png`、`webp`、`jpg` 格式，单文件最大 **50MB**，最多可传入 **16 张**图像。多张图像时模型会将其融合处理。 |

---

#### 可选参数

| 参数名               | 类型    | 默认值      | 可选值                                      | 说明 |
| -------------------- | ------- | ----------- | ------------------------------------------- | ---- |
| `mask`               | file    | —           | 本地 PNG 文件                               | 蒙版图像，用于精确控制编辑区域。**透明区域**表示需要被编辑的部分，不透明区域保持原样。文件需为 PNG 格式，大小不超过 **4MB**，尺寸须与输入图像一致。 |
| `size`               | string  | `1024x1024` | `1024x1024` / `1024x1536` / `1536x1024`    | 输出图像的尺寸。 |
| `quality`            | string  | `medium`    | `low` / `medium` / `high`                  | 图像质量等级。 |
| `output_format`      | string  | `png`       | `png` / `jpeg` / `webp`                    | 输出图像的格式。 |
| `background`         | string  | `auto`      | `transparent` / `opaque` / `auto`          | 输出图像的背景透明度。`transparent` 要求 `output_format` 为 `png` 或 `webp`。 |
| `n`                  | number  | `1`         | `1` ~ `10`                                 | 生成图像的数量，最多 **10** 张。 |
| `output_compression` | integer | `100`       | `0` ~ `100`                                | 压缩级别，仅对 `jpeg` 和 `webp` 格式有效。 |
| `response_format`    | string  | `url`       | `url` / `b64_json`                         | 返回图像的方式。`url` 返回链接；`b64_json` 返回 base64 字符串。 |

---

### 请求示例（Python，使用 OpenAI SDK）

```python
from openai import OpenAI

client = OpenAI(
    api_key="<YOUR_AIMLAPI_KEY>",
    base_url="https://api.aimlapi.com/v1",
)

result = client.images.edit(
    model="openai/gpt-image-2",
    image=[
        open("base_image.png", "rb"),
        open("overlay_element.png", "rb"),
    ],
    prompt="Place the crown on the character's head",
    size="1024x1024",
    quality="high",
    n=1,
)

print(result.model_dump_json(indent=2))
```

---

### 使用 mask 蒙版的示例（Python，原生请求）

```python
import requests

with open("image.png", "rb") as img, open("mask.png", "rb") as mask_file:
    response = requests.post(
        "https://api.aimlapi.com/v1/images/edits",
        headers={"Authorization": "Bearer <YOUR_AIMLAPI_KEY>"},
        data={
            "model": "openai/gpt-image-2",
            "prompt": "Replace the background with a snowy mountain landscape",
            "size": "1024x1024",
            "quality": "medium",
        },
        files={
            "image": ("image.png", img, "image/png"),
            "mask": ("mask.png", mask_file, "image/png"),
        },
    )

print(response.json())
```

---

### 响应示例

```json
{
  "data": [
    {
      "url": "https://cdn.aimlapi.com/generations/openai-image-generation/yyyy.png",
      "b64_json": null,
      "revised_prompt": null
    }
  ],
  "meta": {
    "usage": {
      "credits_used": 190450,
      "usd_spent": 0.095225
    }
  }
}
```

---

## 响应结构说明

两个端点返回结构基本一致：

| 字段                    | 类型    | 说明 |
| ----------------------- | ------- | ---- |
| `data`                  | array   | 生成的图像列表，每个元素包含 `url` 或 `b64_json`（取决于 `response_format`）。 |
| `data[].url`            | string  | 图像可访问的 URL 地址（`response_format=url` 时返回）。 |
| `data[].b64_json`       | string  | 图像的 base64 编码字符串（`response_format=b64_json` 时返回）。 |
| `meta.usage.credits_used` | number | 本次请求消耗的 credits 数量。 |
| `meta.usage.usd_spent`  | number  | 本次请求消耗的美元金额。 |

---

## 代码示例

### 生成图像（JavaScript）

```javascript
async function generateImage() {
  const response = await fetch('https://api.aimlapi.com/v1/images/generations', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer <YOUR_AIMLAPI_KEY>',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'openai/gpt-image-2',
      prompt: 'A serene Japanese garden in autumn with red maple leaves',
      size: '1024x1024',
      quality: 'high',
      output_format: 'png',
      background: 'opaque',
      response_format: 'url',
    }),
  });

  const data = await response.json();
  console.log('Image URL:', data.data[0].url);
  console.log('Cost:', data.meta.usage.usd_spent, 'USD');
}

generateImage();
```

### 编辑图像（JavaScript，使用 OpenAI SDK）

```javascript
import fs from 'fs';
import OpenAI, { toFile } from 'openai';

const client = new OpenAI({
  baseURL: 'https://api.aimlapi.com/v1',
  apiKey: '<YOUR_AIMLAPI_KEY>',
});

async function editImage() {
  const images = await Promise.all(
    ['base.png', 'overlay.png'].map(
      async (file) =>
        await toFile(fs.createReadStream(file), null, { type: 'image/png' })
    )
  );

  const result = await client.images.edit({
    model: 'openai/gpt-image-2',
    image: images,
    prompt: 'Combine these two images naturally',
    size: '1024x1024',
    quality: 'medium',
  });

  console.log(JSON.stringify(result, null, 2));
}

editImage();
```

---

## 参数对比速查表

| 参数名               | `/generations` | `/edits` | 说明 |
| -------------------- | :------------: | :------: | ---- |
| `model`              | ✅ 必填        | ✅ 必填  | 固定 `openai/gpt-image-2` |
| `prompt`             | ✅ 必填        | ✅ 必填  | 文本描述，最长 32000 字符 |
| `image`              | ❌             | ✅ 必填  | 输入图像（本地文件），最多 16 张 |
| `mask`               | ❌             | ⬜ 可选  | 蒙版 PNG 文件，透明区域为编辑范围 |
| `size`               | ⬜ 可选        | ⬜ 可选  | 默认 1024x1024 |
| `quality`            | ⬜ 可选        | ⬜ 可选  | low/medium/high，默认 medium |
| `output_format`      | ⬜ 可选        | ⬜ 可选  | png/jpeg/webp，默认 png |
| `background`         | ⬜ 可选        | ⬜ 可选  | transparent/opaque/auto |
| `moderation`         | ⬜ 可选        | ❌       | 内容审核级别，仅生成端点 |
| `n`                  | ⬜ 可选（仅=1）| ⬜ 可选（1~10）| 生成数量 |
| `output_compression` | ⬜ 可选        | ⬜ 可选  | JPEG/WebP 压缩率 0~100 |
| `response_format`    | ⬜ 可选        | ⬜ 可选  | url 或 b64_json |
