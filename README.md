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

Install from the GitHub repository into a profile with the `dsh plugin` command:

```bash
dsh plugin --profile <profile> add https://github.com/NickyWooden/dsh-scrapling
```

If you have GitHub SSH keys set up, the SSH form works too:

```bash
dsh plugin --profile <profile> add git@github.com:NickyWooden/dsh-scrapling.git
```

For a local checkout (development):

```bash
dsh plugin --profile <profile> add /path/to/dsh-plugin-scrapling
```

Or from the Web GUI: open the profile's **Plugins** page and install from the repository URL above.

### DSH Desktop

The desktop app runs the reserved `desktop` profile, so no extra setup is needed beyond
installing into that profile:

```bash
dsh plugin --profile desktop add https://github.com/NickyWooden/dsh-scrapling
```

The app must have been opened at least once (so `~/.dsh/profiles/desktop/package.json`
exists), and the running app picks the skill up when the profile recomposes — if the
catalog does not show `scrapling-official` right away, restart the app. The same install is
available from the profile's **Plugins** page in the GUI.

The `desktop` profile is reserved: `dsh --profile desktop` and `dsh --profile desktop
--dump-config` both refuse to run outside the Electron app (`profile "desktop" is managed
exclusively by the Electron application`). `dsh plugin --profile desktop ...` is the
supported exception, so package management still works from a terminal while the app runs.

Note that Desktop profiles commonly stack sizeable third-party bundles (market, UI,
preset packs). This plugin only *adds* a bundled skill root: it re-enables the host-level
`skill-filesystem` row and appends one root, while every other provider keeps its own
skills, and bundled roots rank below project-level ones (`.dsh/skills`,
`.agents/skills`), so a project can still override `scrapling-official` locally.

The skill becomes available the next time a session on that profile starts (or immediately,
when HMR is enabled and the profile recomposes).

## Requirements

- DeepSeek Harness `>= 0.1.7-rc.2`; verified end to end against DSH Desktop `0.2.0-rc.2`
  (Electron 0.2.0.0, bundled Node 24).
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

## Verifying an install

`test-discovery.mjs` boots a profile with a throwaway diagnostic plugin, lists the
resulting skill catalog, loads the `scrapling-official` body through the provider, and
exits non-zero when the skill is missing:

```bash
node test-discovery.mjs <profile>        # e.g. node test-discovery.mjs desktop
```

It needs `dsh` on `PATH` and the plugin already installed into that profile. The check
runs the real launcher on purpose: a wrong `bundledSkillDir` is not a load error, it just
means the root is scanned as an empty directory, and `dsh --dump-config` never evaluates
the `!!js` expression — so a boot is the only thing that actually proves discovery.

## How it works (for maintainers)

The bundle declares a single patch row in `cordis.patch.yml`:

```yaml
- id: skill-filesystem
  name: '@deepseek-ai/dsh-skill-filesystem'
  disabled: false
  config:
    bundledSkillDir: !!js process.getBuiltinModule("node:url").fileURLToPath(new URL("node_modules/dsh-plugin-scrapling/skills", baseUrl))
```

- `bundledSkillDir` is the skill *root* (the directory that **contains** the
  `scrapling-official/` bundle); the filesystem provider discovers
  `<root>/<name>/SKILL.md` one level deep.
- `baseUrl` is the Loader's base URL — the profile directory, e.g.
  `file:///<dshHome>/profiles/<profile>/` — so the expression yields an absolute path
  independent of the process working directory.
- `fileURLToPath`, **not** `URL.pathname`: on Windows `pathname` keeps the URL encoding
  and yields `/C:/Users/...`, which the provider resolves to the non-existent
  `C:\C:\Users\...`, so the skill is silently never discovered. `fileURLToPath` decodes
  the URL and applies the platform's drive/UNC rules, so one expression works on Windows
  and POSIX. `process` is always in scope for `!!js` evaluation, and shipped DSH bundles
  use `process.getBuiltinModule(...)` the same way.
- `disabled: false` re-enables the host-level row, which the web-app bundle disables
  (presets own local discovery there). Re-enabling it is safe: the registry merges skills
  from every provider and de-duplicates by name.

## Updating the skill

The skill content is a snapshot of the
[`agent-skill/Scrapling-Skill`](https://github.com/D4Vinci/Scrapling/tree/main/agent-skill)
directory of the Scrapling repository. To refresh it, copy the latest `Scrapling-Skill`
contents into `skills/scrapling-official/`, bump the `version` in `package.json`, and
replace the `version` in the skill's `SKILL.md` frontmatter with the upstream skill
version it came from — that frontmatter tracks the upstream skill, not this plugin.

## License

[Apache 2.0](LICENSE) — the bundled skill carries its own `LICENSE.txt` (BSD 3-Clause).
