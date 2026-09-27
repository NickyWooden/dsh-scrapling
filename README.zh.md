# dsh-plugin-scrapling

[English](README.md) | 中文

将 **官方 [Scrapling](https://scrapling.readthedocs.io/) Agent Skill** 打包进
[DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) profile，让运行在该
profile 上的任意 agent 都能用当前版本的 Scrapling API 抓取、爬取和解析网页——反反爬
（Cloudflare Turnstile）、隐身无头浏览、spiders 框架、自适应解析、JavaScript 渲染——
而不用靠过时的训练数据去猜。

## 它做什么

这是一个*技能*插件：自身不携带任何运行时 JavaScript。它打包 `scrapling-official` 技能
（一个 `SKILL.md` 入口 + 按需加载的 `references/` 与 `examples/`），并通过
`dsh-skill-filesystem` provider 的 `bundledSkillDir` 把宿主指向该技能包。之后技能会出现在
会话的技能目录中，agent 通过 `skill` 工具按需加载。

技能根目录在加载时用 `!!js` 表达式解析为绝对路径，锚定在 Loader 的 `baseUrl`
（profile 目录）上，因此无论进程从哪里启动，路径都稳定不变。

## 安装

用 `dsh plugin` 命令从 GitHub 仓库安装到某个 profile：

```bash
dsh plugin --profile <profile> add https://github.com/NickyWooden/dsh-scrapling
```

如果已配置 GitHub SSH 密钥，SSH 形式同样可用：

```bash
dsh plugin --profile <profile> add git@github.com:NickyWooden/dsh-scrapling.git
```

本地检出（开发）：

```bash
dsh plugin --profile <profile> add /path/to/dsh-plugin-scrapling
```

或者在 Web GUI 中：打开 profile 的 **Plugins** 页面，用上面的仓库 URL 安装。

技能会在该 profile 的下一个会话启动时可用（若启用了 HMR 且 profile 会重组合，则立即可用）。

## 要求

- DeepSeek Harness `>= 0.1.7-rc.2`
- profile 的组合中包含 `dsh-skill-filesystem` provider（所有内置 profile 都包含）。
  本插件会在某个 bundle（例如 web-app bundle）禁用了宿主级 `skill-filesystem` 行时重新
  启用它，从而保证安装了本插件的每个 profile 都会扫描打包的技能根目录。

要真正*运行* Scrapling 代码，agent 还需要 Python 3.10+ 和已安装的库
（`pip install "scrapling[all]"`），以及 `scrapling install --force` 来下载浏览器依赖——
技能的 `SKILL.md` 会引导 agent 完成这些设置。

## 技能内容

- **`SKILL.md`** — 入口：安装、fetcher 选择、CLI 用法、代码概览、护栏。
- **`references/`** — 文档的 Markdown 镜像（解析、抓取、spiders、MCP server、RAG、
  Scrapy 集成、BeautifulSoup 迁移），按需加载。
- **`examples/`** — 可直接运行的脚本（fetcher 会话、dynamic session、stealthy 会话、spider）。

## 工作原理（面向维护者）

bundle 在 `cordis.patch.yml` 中声明单条 patch 行：

```yaml
- id: skill-filesystem
  name: '@deepseek-ai/dsh-skill-filesystem'
  disabled: false
  config:
    bundledSkillDir: !!js new URL('node_modules/dsh-plugin-scrapling/skills', baseUrl).pathname
```

- `bundledSkillDir` 是技能*根目录*（**包含** `scrapling-official/` bundle 的那个目录）；
  filesystem provider 会在 `<root>/<name>/SKILL.md` 一层深度发现技能。
- `baseUrl` 是 Loader 的 base URL——profile 目录，例如
  `file:///<dshHome>/profiles/<profile>/`——因此表达式得到与进程工作目录无关的绝对路径。
- `disabled: false` 重新启用宿主级行（web-app bundle 会禁用它，因为 preset 在那里拥有
  本地发现权）。重新启用是安全的：registry 会合并所有 provider 的技能并按名称去重。

## 更新技能

技能内容是 Scrapling 仓库
[`agent-skill/Scrapling-Skill`](https://github.com/D4Vinci/Scrapling/tree/main/agent-skill)
目录的快照。要刷新它，把最新的 `Scrapling-Skill` 内容复制到 `skills/scrapling-official/`，
同时提升 `package.json` 和技能 `SKILL.md` frontmatter 中的 `version`，然后重新发布。

## 许可

[Apache 2.0](LICENSE) — 打包的技能自带其自身的 `LICENSE.txt`（BSD 3-Clause）。
