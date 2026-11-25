# 拾句 · 书籍金句站

纯静态、零依赖、数据驱动。提取书籍经典句子 + 解读 + 应用举例，支持无限扩展书籍。

## 目录结构

```
├── index.html              # 入口（引入数据文件 + search.js + app.js）
├── css/style.css           # 样式
├── js/search.js            # 全局搜索：索引 / 匹配 / 相关度排序（纯逻辑，不依赖 DOM）
├── js/app.js               # 渲染 + hash 路由 + 登录/收藏 + 搜索结果页
├── functions/api/favs.js   # Cloudflare Pages Function：收藏同步 API（KV 存储）
└── data/books/             # 书籍数据，每本书一个文件（自注册，共 95 本）
    ├── poor-charlies-almanack.js
    ├── ...
    └── the-crowd.js
```

## 如何新增一本书

1. 复制 `data/books/poor-charlies-almanack.js`，重命名为新书的 id（如 `atomic-habits.js`）
2. 修改内容：`id` 必须唯一，`gradient` 是封面渐变色，每条金句含 `quote / theme / source / interpretation / examples`；可选 `models` 数组收录书中提出的方法理论（`name / en / source / core / points / examples`），详情页会分成"金句 / 方法论"两个标签页显示（无 models 的书只显示金句，不出现标签栏）
3. 在 `index.html` 底部追加一行：

```html
<script src="data/books/atomic-habits.js"></script>
```

完成。书架自动出现新书，全局搜索也会自动收录（字段名不变即可，无需改搜索代码）。

## 全局搜索

- 头部搜索框输入关键词回车，跳转 `#/search?q=关键词`；结果按书分组，每本预览 3 条金句 + 3 个方法论，「显示更多」每次追加 10 本
- 可搜索范围：书名 / 原名 / 作者 / 分类 / 标签；金句的正文 / 主题 / 出处 / 解读 / 应用举例；方法论的名称 / 英文名 / 出处 / 核心思想 / 要点 / 应用举例
- 多个关键词用空格分隔取交集；不区分大小写；按字面匹配（输入 `(` `"` 等特殊字符不会出错）
- 相关度：书名 > 作者/标签 > 正文/主题 > 解读 > 出处/举例，书内与书间都按得分排序（搜「护城河」《巴菲特的护城河》排第一）
- 点「查看全部 N 条 →」进入 `#/book/{id}?q=关键词`，详情页筛选框预填该词、只显示命中的卡片，返回链接回到搜索结果
- 宽度 ≤ 760px 时搜索框收成右侧 🔍 按钮，点击展开独占一行并直接弹键盘

## 登录与收藏

- 默认账号 `admin` / `admin`（纯前端模拟登录，存 localStorage）
- 登录后书卡右上角 ★ 和详情页「收藏本书」按钮可用，书架出现「我的收藏」分类
- 未登录点收藏会先弹登录框，登录成功自动完成刚才的收藏
- 收藏存在 localStorage（`shiju-favs`），API 不可用时自动降级为纯本地模式

## 跨设备同步（Cloudflare Pages + KV）

站点部署在 Cloudflare Pages，收藏通过 Pages Function `/api/favs` 读写 KV，换设备登录后自动拉取：

- GET `/api/favs?user=admin` 拉取；PUT `/api/favs`（body 带 user/pass/favs）推送
- 登录时 / 已登录打开页面时拉取远端覆盖本地；每次收藏变更实时推送

一次性配置（Pages 控制台）：

1. Workers & Pages → KV → 创建 namespace
2. Pages 项目 → Settings → Bindings → 添加 KV binding，变量名 **FAVS**
3. Deployments → 最新部署 → Retry deployment（重新部署后 binding 生效）

未绑定 KV 时 API 返回 500 并提示配置方法，站点功能退化为纯本地收藏。

## 使用

直接双击 `index.html` 即可（file:// 协议可用，无需服务器；跨设备同步需在线部署）。
部署：推送 git 后 Cloudflare Pages 自动构建（仓库已关联）。
