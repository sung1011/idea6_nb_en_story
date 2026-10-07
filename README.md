# idea6_nb_en_story / 星词岛故事库

story-first English learning stories for Star Words App

Vue 3 绘本阅读器，用来翻页阅读 **Flag in the Fog**（雾里的旗，22 页）。

线上地址（启用 GitHub Pages 后）：

https://sung1011.github.io/idea6_nb_en_story/

- First story: [Flag in the Fog / 雾里的旗](stories/flag-in-the-fog.md)（22 pages）

## 本地开发

在 `app/` 目录安装并启动：

```bash
cd app
npm install
npm run dev
```

构建：

```bash
cd app
npm install
npm run build
```

把 `stories/*.md` 解析成阅读器 JSON（`dev` / `build` 也会自动跑）：

```bash
cd app
npm run parse-stories
```

## 内容与结构

| 路径 | 作用 |
|------|------|
| `stories/flag-in-the-fog.md` | 故事源稿（勿改写正文） |
| `docs/story-schema.md` | 页字段说明（en / zh / pattern / focusWord / image / audioEn / audioZh 等） |
| `app/scripts/parseStory.mjs` | Markdown → JSON |
| `app/public/stories/flag-in-the-fog.json` | 阅读器消费的 JSON |
| `app/` | Vue 3 + Vite + TypeScript 阅读器 |
| `.github/workflows/deployPages.yml` | 推送到 `main` 后构建并发布 GitHub Pages |

## 阅读器（Stage 4）

- 展示模式：`英文` / `中英对照` / `中文`（`en` \| `en+zh` \| `zh`），默认 `en+zh`，写入 `localStorage`
- 续读：刷新后夹紧在 1..N 页继续；顶部可「继续阅读」或对本故事「从头读」
- 插图：16:9 奶油色软陶风 CSS/SVG 占位（圆角、深色描边、页码标签）。正式画稿需压缩后再接入，本阶段不放原图
- 翻页：大触摸热区的上一页 / 下一页，Fredoka 字体，平板宽度友好
- 尚未做：TTS、点词学习（Stage 5–6）

进度按本故事写入 `localStorage`。展示模式是整站偏好。

## 启用 GitHub Pages

仓库 Settings 里打开 Pages，并选 GitHub Actions 作为发布源：

1. 打开 https://github.com/sung1011/idea6_nb_en_story/settings/pages
2. **Source** 选 **GitHub Actions**（不要选 “Deploy from a branch”）
3. 推送到 `main` 后会跑 `Deploy GitHub Pages` workflow：在 `app/` 执行 `npm ci` + `npm run build`，把 `app/dist` 发布出去
4. Vite `base` 已设为 `/idea6_nb_en_story/`，对应项目主页
5. 首次启用后打开：https://sung1011.github.io/idea6_nb_en_story/

如果 Actions 里 deploy job 报 Pages 环境未授权，回到上面第 2 步确认 Source 已是 GitHub Actions。
