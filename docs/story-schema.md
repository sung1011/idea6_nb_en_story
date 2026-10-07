# 故事 JSON Schema

本仓库以 Markdown 为正文源（`stories/*.md`），构建时解析为 JSON，供阅读器消费。  
**不要改写故事英文/中文正文**；JSON 只是结构化镜像。

当前故事：`stories/flag-in-the-fog.md` → `app/public/stories/flag-in-the-fog.json`。

解析命令（在 `app/` 下）：

```bash
npm run parse-stories
```

`npm run dev` / `npm run build` 也会在启动时重新生成 JSON。

---

## Story（整本）

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `id` | `string` | 是 | 故事 slug，与文件名一致，如 `flag-in-the-fog` |
| `title` | `string` | 是 | 英文标题 |
| `titleZh` | `string` | 否 | 中文标题 |
| `version` | `string` | 否 | 稿件版本，如 `v2` |
| `label` | `string` | 否 | 编号标签，如 `故事 B` |
| `scene` | `string` | 否 | 场景说明（来自源稿引用块） |
| `structure` | `string` | 否 | 情节结构（来自源稿引用块） |
| `notes` | `string` | 否 | 篇幅/编写说明（来自源稿引用块） |
| `source` | `string` | 是 | 源 Markdown 相对仓库根路径 |
| `pageCount` | `number` | 是 | 页数；Flag in the Fog 为 22 |
| `pages` | `Page[]` | 是 | 按页序排列 |

---

## Page（单页）

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `id` | `string` | 是 | 页码标识，如 `P01` |
| `index` | `number` | 是 | 从 1 开始的页码 |
| `en` | `string` | 是 | 英文正文。`**word**` 表示本页加粗焦点词，阅读器高亮渲染 |
| `zh` | `string` | 否 | 中文译文（源稿全角括号 `（…）` 内的内容） |
| `pattern` | `string` | 否 | 主练句式 |
| `focusWord` | `string` | 否 | 辅词。源稿为 `—` 时为空字符串 |
| `focusNote` | `string` | 否 | 辅词括注（课次、回调说明等） |
| `focusRaw` | `string` | 否 | 辅词原始字段，便于对照源稿 |
| `knowledge` | `string` | 否 | 知识点 |
| `highlights` | `string[]` | 否 | 从 `en` 里 `**…**` 抽出的词 |
| `image` | `string \| null` | 否 | 插图相对 URL。尚无画稿时为 `null`，阅读器显示占位图 |
| `audioEn` | `string \| null` | 否 | 英文朗读音频相对 URL。本阶段为 `null`（不做完整 TTS） |
| `audioZh` | `string \| null` | 否 | 中文朗读音频相对 URL。本阶段为 `null` |

相对 URL 约定（预留，当前均为 `null`）：

- 插图：`images/<story-id>/p01.png`
- 英文音频：`audio/<story-id>/p01-en.mp3`
- 中文音频：`audio/<story-id>/p01-zh.mp3`

阅读器以 Vite `base`（`/idea6_nb_en_story/`）拼接这些路径。

---

## 源稿字段对应

源 Markdown 每页形如：

```markdown
### P01
正文: There is an old **flag** by the sand.（沙滩边有一面旧旗子。）
主练句式: There is a ___ .
辅词: flag（第8章 第2课「字母 F · see blue」）
知识点: There is 存在句；flag 词包 flag/fog/fin/frog
```

| 源稿 | JSON |
|------|------|
| `### P01` | `id` / `index` |
| `正文:` 括号外 | `en` |
| `正文:` 全角括号内 | `zh` |
| `主练句式:` | `pattern` |
| `辅词:` | `focusWord` + `focusNote` + `focusRaw` |
| `知识点:` | `knowledge` |

`## 知识点总表` 及之后的内容不进入 `pages`。

---

## 阅读器使用的字段

当前 Vue 阅读器实际用到：

- 导航与续读：`id`、`pageCount`、`pages[].index`
- 展示：`en`、`zh`、`pattern`、`focusWord`、`image`
- 预留未接 UI：`audioEn`、`audioZh`、`knowledge`、`focusNote`

`localStorage` 续读键（仅本故事）：

- `idea6_nb_en_story:progress:flag-in-the-fog` → 页码（1-based）
- `idea6_nb_en_story:showZh:flag-in-the-fog` → 是否显示中文
