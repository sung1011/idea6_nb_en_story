<<<<<<< HEAD
# idea6_nb_en_story / 星词岛故事库

story-first English learning stories for Star Words App

- First story: [Flag in the Fog / 雾里的旗](stories/flag-in-the-fog.md)（22 pages）
=======
# idea6_nb_en_story

Vue 3 绘本阅读器，用来翻页阅读 **Flag in the Fog**（雾里的旗，22 页）。

线上地址（启用 GitHub Pages 后）：

https://sung1011.github.io/idea6_nb_en_story/

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

阅读器：插图占位、英文、可选中文、页码、上一页/下一页。进度按本故事写入 `localStorage`，刷新后从上次页码继续。

## 启用 GitHub Pages

仓库 Settings 里打开 Pages，并选 GitHub Actions 作为发布源：

1. 打开 https://github.com/sung1011/idea6_nb_en_story/settings/pages
2. **Source** 选 **GitHub Actions**（不要选 “Deploy from a branch”）
3. 推送到 `main` 后会跑 `Deploy GitHub Pages` workflow：在 `app/` 执行 `npm ci` + `npm run build`，把 `app/dist` 发布出去
4. Vite `base` 已设为 `/idea6_nb_en_story/`，对应项目主页
5. 首次启用后打开：https://sung1011.github.io/idea6_nb_en_story/

如果 Actions 里 deploy job 报 Pages 环境未授权，回到上面第 2 步确认 Source 已是 GitHub Actions。
>>>>>>> 61c83cc (Scaffold Vue story reader and GitHub Pages deploy.)
