# idea6_nb_en_story / 星词岛故事库

story-first English learning stories for Star Words App

Vue 3 绘本阅读器，用来翻页阅读 **Flag in the Fog**（雾里的旗，22 页）。

线上地址（启用 GitHub Pages 后）：

https://sung1011.github.io/idea6_nb_en_story/

- First story: [Flag in the Fog / 雾里的旗](stories/flag-in-the-fog.md)（22 pages）
- Character sheets: [角色设定](docs/characters.md)（Mia / Ben / Rat）

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

重新生成页级朗读 mp3（英文 Ana、中文晓晓；已有文件会跳过）：

```bash
cd app
python3 -m pip install edge-tts
npm run gen-tts
```

需要本机有 `ffmpeg`（脚本会压成单声道 24kHz / 40kbps）。强制全部重录加 `--force`：`npm run gen-tts -- --force`。生成后 JSON 的 `audioEn` / `audioZh` 会写成 `audio/<story-id>/p01-en.mp3` 这类路径；焦点词另有 `audio/<story-id>/word-flag.mp3`。

## 内容与结构

| 路径 | 作用 |
|------|------|
| `stories/flag-in-the-fog.md` | 故事源稿（勿改写正文） |
| `docs/characters.md` | 角色一致性规则、角色表与画图提示前缀 |
| `docs/characters/` | Mia / Ben / Rat 角色参考图 |
| `docs/story-schema.md` | 页字段说明（en / zh / pattern / focusWord / image / audioEn / audioZh 等） |
| `app/scripts/parseStory.mjs` | Markdown → JSON（有画稿/mp3 时写入 `image` / `audioEn` / `audioZh` / `audioWord`，并推导 `gloss` / `learnItems`） |
| `app/scripts/genStoryTts.mjs` | 按故事 JSON 调 edge-tts 生成页级 en/zh 与词级 mp3 |
| `app/public/stories/flag-in-the-fog.json` | 阅读器消费的 JSON |
| `app/public/images/flag-in-the-fog/` | 各页软陶风插图（`p01.webp` … `p22.webp`） |
| `app/public/audio/flag-in-the-fog/` | 预生成朗读（`p01-en.mp3` / `p01-zh.mp3` …）与词级（`word-flag.mp3` …） |
| `app/public/versions.json` | 版本记录（最新在前）；每次有意义的发布追加一条 |
| `app/assets/icon-master.png` | 软陶风应用图标母版（1024，不进 public） |
| `app/scripts/makePwaIcons.py` | 从母版生成 `pwa512` / `pwa192` / `appleTouchIcon` / `favicon.png` |
| `app/public/pwa192.png` / `pwa512.png` | PWA 安装图标（Mia 软陶风） |
| `app/public/appleTouchIcon.png` | iOS 添加到主屏幕图标 |
| `app/public/favicon.png` | 站点 favicon（48×48 PNG） |
| `app/` | Vue 3 + Vite + TypeScript 阅读器（`vite-plugin-pwa`） |
| `.github/workflows/deployPages.yml` | 推送到 `main` 后构建并发布 GitHub Pages |

## 阅读器（Stage 6）

- 始终中英对照：英文标题后紧跟较小的浅色中文标题（可换行）；正文只显示英文（固定两行高度），中文在关键词芯片行的 **中文** 按钮里，点开弹层并朗读
- 续读：刷新后夹紧在 1..N 页，打开直接回到上次页（无提示条）；Home 键回到第 1 页
- 插图：各页绑定 `images/flag-in-the-fog/pNN.webp`；缺图时回退 16:9 奶油色软陶风 SVG 占位。画稿上不叠关键词或页码。画稿需压缩后再入库
- 朗读：点喇叭或英文句子播放 Ana；点关键词芯片行的 **中文** 弹出译文并播晓晓。新点击会停掉上一句。默认不自动播放。mp3 缺失或播放失败时回退 Web Speech
- 点词：点加粗焦点词、辅词芯片或带 `___` 的句式，在词旁弹出释义气泡（中文短义 + Play again）；不挡住整句播放
- 翻页：大触摸热区的 Prev / Next，Fredoka 字体，平板宽度友好
- 阅读卡标题行右侧 **Settings** 齿轮：`Version` 看当前构建与摘要，可 **Check for updates**（立刻拉取 `versions.json`）和 **Clear cache**（注销 Service Worker、清空 Cache Storage 后硬刷新，不碰 localStorage）；有待更新条目时，版本行也会显示 **Update**；`GM` 可 **Reset all data**（清空本应用全部 localStorage 后重载）
- 更新 toast：每 10 秒带 cache-bust 拉取 `versions.json`，若有比已确认版本更新的条目（最多 10 条），在齿轮下方列出并提供 **Update**（先走与 **Clear cache** 相同的流程，再硬刷新并标记已读；阅读进度保留）
- PWA：可安装到主屏幕（`standalone`）；预缓存阅读器壳 + 故事 JSON。页/词 mp3 与插图 webp 走运行时 Cache First，不进预缓存。换插图时 bump `vite.config.ts` 里的 `story-image-cache-first` 缓存名，换朗读时 bump `story-audio-cache-first` 缓存名，检查更新并重载后会拉新资源。`versions.json` 用 Network First，以免挡住更新检测

进度按本故事写入 `localStorage`。每次有意义的发布请在 `app/public/versions.json` 顶部追加 `{ id, version, date, summary }`（新条目用英文）。当前版本 **0.6.1**。

## 安装到主屏幕（PWA）

站点已是 HTTPS（GitHub Pages），带 Web App Manifest（`name` 为 Star Word Island，`short_name` 为 Star Words）、192/512 PNG 图标和服务 Worker，满足可安装条件。安装后以独立窗口打开，入口为 `/idea6_nb_en_story/`。

**Chrome / Edge（电脑）**

1. 打开 https://sung1011.github.io/idea6_nb_en_story/
2. 地址栏右侧点安装图标，或菜单 → **Install Star Word Island** / **将此应用安装到电脑**
3. 确认安装。之后可从应用列表或桌面快捷方式打开，不再显示浏览器工具栏

**Chrome / Edge（Android）**

1. 用 Chrome 或 Edge 打开上面的地址
2. 菜单 → **安装应用** 或 **添加到主屏幕**
3. 主屏幕会出现 Star Words 图标

**Safari（iPhone / iPad）**

1. 必须用 **Safari** 打开（不要用 Chrome / 微信内置浏览器）
2. 点底部分享按钮（方框加箭头）
3. 滑到 **添加到主屏幕**，名称用 Star Word Island
4. 点添加。主屏幕图标打开后是无 Safari 地址栏的独立窗口

若没有安装入口：确认打开的是 HTTPS 线上地址（不是 `localhost`），并等页面加载完成以便注册 Service Worker。

## 启用 GitHub Pages

仓库 Settings 里打开 Pages，并选 GitHub Actions 作为发布源：

1. 打开 https://github.com/sung1011/idea6_nb_en_story/settings/pages
2. **Source** 选 **GitHub Actions**（不要选 “Deploy from a branch”）
3. 推送到 `main` 后会跑 `Deploy GitHub Pages` workflow：在 `app/` 执行 `npm ci` + `npm run build`，把 `app/dist` 发布出去
4. Vite `base` 已设为 `/idea6_nb_en_story/`，对应项目主页
5. 首次启用后打开：https://sung1011.github.io/idea6_nb_en_story/

如果 Actions 里 deploy job 报 Pages 环境未授权，回到上面第 2 步确认 Source 已是 GitHub Actions。
