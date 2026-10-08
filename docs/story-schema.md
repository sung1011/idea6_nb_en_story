# 故事 JSON Schema

本仓库以 Markdown 为正文源（`stories/*.md`），构建时解析为 JSON，供阅读器消费。  
**不要改写故事英文/中文正文**；JSON 只是结构化镜像。

当前故事：`stories/flag-in-the-fog.md` → `app/public/stories/flag-in-the-fog.json`；`stories/spot-the-cub.md` → `app/public/stories/spot-the-cub.json`（画稿与音频尚未入库，JSON 里 image/audio 为空字符串，阅读器回退占位图与系统语音）。目录：`app/public/stories/index.json`。

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
| `gloss` | `string` | 否 | 本页主焦点词的中文短义。优先用源稿 `释义:`，否则从辅词括注 / 知识点 / 正文中文推导 |
| `highlights` | `string[]` | 否 | 从 `en` 里 `**…**` 抽出的词 |
| `learnItems` | `LearnItem[]` | 否 | 本页可点学的词（加粗词 + 辅词），每项 `{ word, gloss, audioWord, image }` |
| `image` | `string \| null` | 否 | 插图相对 URL。仓库内有 `images/<story-id>/pNN.webp`（或 png/jpg）时写入路径；否则为 `null`，阅读器回退 16:9 软陶风 SVG 占位。正式画稿必须压缩后再入库，不要提交未压缩原图 |
| `audioEn` | `string \| null` | 否 | 英文朗读音频相对 URL。仓库内有对应 mp3 时写入路径，否则为 `null` |
| `audioZh` | `string \| null` | 否 | 中文朗读音频相对 URL。同上 |
| `audioWord` | `string \| null` | 否 | 主焦点词的词级英文 mp3。仓库内有对应文件时写入路径，否则为 `null` |

相对 URL 约定：

- 插图：`images/<story-id>/p01.webp`（Flag in the Fog 22 页、Spot the Cub 24 页均已接入；缺文件时为 `null`）
- 英文音频：`audio/<story-id>/p01-en.mp3`（Edge TTS `en-US-AriaNeural`，语速 `-15%`）
- 中文音频：`audio/<story-id>/p01-zh.mp3`（Edge TTS `zh-CN-XiaoxiaoNeural`）
- 词级音频：`audio/<story-id>/word-flag.mp3`（同一 Aria 声线，只读单词）
- 词图：`images/<story-id>/words/map.webp`（有文件时写入 `learnItems[].image`）

阅读器以 Vite `base`（`/idea6_nb_en_story/`）拼接这些路径。打开故事页（翻页、换故事、续读）时自动先播 `audioEn`，约 0.5 秒后再播 `audioZh`（正常语速）。Settings → **General** 的 **Auto read** 默认开。点喇叭或英文句子（含句中加粗焦点词）播放整句 `audioEn`。点英文句子左侧的 **CN** 弹出本页译文并播放 `audioZh`。点 Slow、单词或句子会立刻停掉自动队列。点辅词芯片在词旁弹出释义气泡（词图 + 短义 + Play again）并读单词。主练句式只展示、不可点。总结页和没有音频的页不自动读。文件缺失时自动朗读静默跳过；手动点读失败时回退 Web Speech。浏览器拦截自动播放时，等第一次点击后再读当前页。

重新生成音频（在 `app/` 下）：`npm run gen-tts`（需 `edge-tts` 与 `ffmpeg`）。`npm run parse-stories` / `dev` / `build` 会根据 `app/public/images/` 与 `app/public/audio/` 里是否已有文件回填路径。

---

## 源稿字段对应

源 Markdown 每页形如：

```markdown
### P01
正文: Mia and Ben are at the sea. There is an old **map** by the sand.（米娅和本在海边。沙滩边有一张旧地图。）
主练句式: There is a ___ .
辅词: map
知识点: There is 存在句；map 寻宝地图
释义: 地图
```

| 源稿 | JSON |
|------|------|
| `### P01` | `id` / `index` |
| `正文:` 括号外 | `en` |
| `正文:` 全角括号内 | `zh` |
| `主练句式:` | `pattern` |
| `辅词:` | `focusWord` + `focusNote` + `focusRaw`；拆出的英文词进入 `learnItems` |
| `知识点:` | `knowledge`；若写成 `flag 旗子` 这类「词 + 中文」可推导 `gloss` |
| `释义:` | 可选。本页主焦点词的中文短义，写入 `gloss` / 首个 `learnItems` |

`## 知识点总表` 及之后的内容不进入 `pages`。

---

## 阅读器使用的字段

当前 Vue 阅读器实际用到：

- 导航与续读：`id`、`pageCount`、`pages[].index`
- 展示：`en`、`zh`、`pattern`、`focusWord`、`image`（正文显示英文；**CN** 在句子左侧，点开弹层）
- 朗读：`audioEn`、`audioZh`（打开页自动英→中；点喇叭或英文句子含加粗词播放整句；缺文件回退系统语音）
- 点词：`learnItems` / `gloss` / `audioWord` / `image`（点辅词芯片弹出词图 + 释义 + Play again；句中加粗词只作高亮标记；句式只展示）
- 总结页：跨页去重 `learnItems`（首次出现顺序）与去重 `pattern`；点词卡复用同一释义气泡；**Read again** 回第 1 页，进度仍夹紧在 `1..pageCount`

`localStorage`（前缀 `idea6_nb_en_story:`，GM Reset all data 会全部清除）：

- `idea6_nb_en_story:progress:flag-in-the-fog` → 页码（1-based，读写时夹紧到 `1..pageCount`）
- `idea6_nb_en_story:ackedVersion` → 用户已确认的最新版本 `id`（对应 `app/public/versions.json`）
- `idea6_nb_en_story:slowSpeed` → Slow 语速百分比（30–90，默认 60）
- `idea6_nb_en_story:autoRead` → 自动朗读（`1`/`0`，缺省为开）

启动时会删除过期键 `idea6_nb_en_story:displayMode` 与 `idea6_nb_en_story:showZh:<storyId>`，不碰阅读进度。

`app/public/versions.json` 为数组，**最新在前**，每项 `{ id, version, date, summary }`（新条目用英文）。阅读器按 `version` 号合并为组（同号多条摘要合成一行，日期取该组最新）。Settings **Version** 始终列出最近 10 组，**Current version** 为已确认/已安装版本号，页内无 **Update**。**Check for updates** 立刻再拉一次（`cache: no-store`），无新版本约 2 秒 toast **You're up to date.**，有则 **Update available**。比已确认版本号更新的组出现在设置外的弹层（手机可滚动），顶部一个 **Update**。已是最新则不显示弹层。点击 **Update** 会写入已确认版本，然后走与 **Clear cache** 相同的流程：注销 Service Worker、删除 Cache Storage（故事图/音频/阅读器壳），再带 `_reload` 硬刷新；清缓存失败时仍会硬刷新。不清除 `localStorage` / 阅读进度（那只在 GM **Reset all data**）。独立的 **Clear cache** 先 toast **Cache cleared.** 约 2 秒，再清缓存并硬刷新。
