# 拾句 · 书籍金句站

纯静态、零依赖、数据驱动。提取书籍经典句子 + 解读 + 应用举例，支持无限扩展书籍。

## 目录结构

```
├── index.html              # 入口（引入数据文件 + app.js）
├── css/style.css           # 样式
├── js/app.js               # 渲染 + hash 路由
└── data/books/             # 书籍数据，每本书一个文件（自注册）
    ├── poor-charlies-almanack.js
    ├── the-almanack-of-naval-ravikant.js
    ├── fooled-by-randomness.js
    ├── the-black-swan.js
    ├── antifragile.js
    └── skin-in-the-game.js
```

## 如何新增一本书

1. 复制 `data/books/poor-charlies-almanack.js`，重命名为新书的 id（如 `atomic-habits.js`）
2. 修改内容：`id` 必须唯一，`gradient` 是封面渐变色，每条金句含 `quote / theme / source / interpretation / examples`；可选 `models` 数组收录书中提出的方法理论（`name / en / source / core / points / examples`），详情页会分成"金句 / 方法论"两个标签页显示（无 models 的书只显示金句，不出现标签栏）
3. 在 `index.html` 底部追加一行：

```html
<script src="data/books/atomic-habits.js"></script>
```

完成。书架自动出现新书。

## 使用

直接双击 `index.html` 即可（file:// 协议可用，无需服务器）。
部署：整个目录上传任意静态托管（GitHub Pages / Nginx / Vercel）即可。
