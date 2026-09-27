# dsh-plugin-scrapling

English | [中文](README.zh.md)

Bundles the **official [Scrapling](https://scrapling.readthedocs.io/) agent skill** into a
[DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) profile, so any agent
running on that profile can scrape, crawl, and parse the web with the current Scrapling API —
anti-bot bypass (Cloudflare Turnstile), stealth headless browsing, the spiders framework,
adaptive parsing, and JavaScript rendering — without guessing from outdated training data.

## What it does

This is a *skill* plugin: it ships no runtime JavaScript of its own. It bundles the
`scrapling-official` skill (a `SKILL.md` entry point plus on-demand `references/` and
`examples/`) and points the host's `dsh-skill-filesystem` provider at that bundle through the
provider's `bundledSkillDir`. The skill then appears in the session's skill catalog and the
agent loads it on demand via the `skill` tool.

The skill root is resolved to an absolute path at load time with a `!!js` expression anchored
on the Loader's `baseUrl` (the profile directory), so the path is stable no matter where the
process was launched from.

## Installation

Install into a profile with the `dsh plugin` command:

```bash
dsh plugin --profile <profile> add dsh-plugin-scrapling
```

For a local checkout (development):

```bash
dsh plugin --profile <profile> add /path/to/dsh-plugin-scrapling
```

Or from the Web GUI: open the profile's **Plugins** page and install `dsh-plugin-scrapling`.

The skill becomes available the next time a session on that profile starts (or immediately,
when HMR is enabled and the profile recomposes).

## Requirements

- DeepSeek Harness `>= 0.1.7-rc.2`
- A profile whose composition includes the `dsh-skill-filesystem` provider (all shipped
  profiles do). The plugin re-enables the host-level `skill-filesystem` row if a bundle
  (e.g. the web-app bundle) had disabled it, so the bundled skill root is scanned on every
  profile that installs this plugin.

To actually *run* Scrapling code, the agent needs Python 3.10+ and the library installed
(`pip install "scrapling[all]"`), plus `scrapling install --force` to fetch browser
dependencies — the skill's `SKILL.md` walks the agent through this setup.

## Skill contents

- **`SKILL.md`** — entry point: setup, fetcher selection, CLI usage, code overview, guardrails.
- **`references/`** — Markdown mirrors of the documentation (parsing, fetching, spiders,
  MCP server, RAG, Scrapy integration, BeautifulSoup migration), loaded on demand.
- **`examples/`** — ready-to-run scripts (fetcher session, dynamic session, stealthy session,
  spider).

## How it works (for maintainers)

The bundle declares a single patch row in `cordis.patch.yml`:

```yaml
- id: skill-filesystem
  name: '@deepseek-ai/dsh-skill-filesystem'
  disabled: false
  config:
    bundledSkillDir: !!js new URL('node_modules/dsh-plugin-scrapling/skills', baseUrl).pathname
```

- `bundledSkillDir` is the skill *root* (the directory that **contains** the
  `scrapling-official/` bundle); the filesystem provider discovers
  `<root>/<name>/SKILL.md` one level deep.
- `baseUrl` is the Loader's base URL — the profile directory, e.g.
  `file:///<dshHome>/profiles/<profile>/` — so the expression yields an absolute path
  independent of the process working directory.
- `disabled: false` re-enables the host-level row, which the web-app bundle disables
  (presets own local discovery there). Re-enabling it is safe: the registry merges skills
  from every provider and de-duplicates by name.

## Updating the skill

The skill content is a snapshot of the
[`agent-skill/Scrapling-Skill`](https://github.com/D4Vinci/Scrapling/tree/main/agent-skill)
directory of the Scrapling repository. To refresh it, copy the latest `Scrapling-Skill`
contents into `skills/scrapling-official/`, bump the `version` in both `package.json` and the
skill's `SKILL.md` frontmatter, and republish.

## License

[Apache 2.0](LICENSE) — the bundled skill carries its own `LICENSE.txt` (BSD 3-Clause).
