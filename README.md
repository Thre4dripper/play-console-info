# Play Console Info

> Fetch anything from Google Play Console — as a GitHub Action, or as a standalone CLI binary you can use anywhere.

---

There is a gap in every Android release pipeline. You can *push* to the Play Store but you cannot *read* back what it knows. No official tooling exists. Teams end up with bespoke scripts that rot, fragile curl commands against a complex API, or just doing it manually.

This project fixes that — and it does it at two levels.

At the core is a **compiled CLI binary** that handles authentication, API calls, pagination, and response formatting against the Google Play Developer API. It speaks to you in clean JSON on stdout and keeps all progress noise on stderr, so it composes naturally with `jq`, shell pipelines, or any language.

On top of that sits a **GitHub Action** — a thin, declarative wrapper that puts every piece of Play Console data you ask for into named step outputs, ready to use in the next step of your workflow.

Use whichever layer you need. The CLI is self-contained.

---

## Table of Contents

- [The CLI](#the-cli)
  - [Download a Binary](#download-a-binary)
  - [CLI Flags](#cli-flags)
  - [Output Modes](#output-modes)
  - [CLI Examples](#cli-examples)
  - [Build From Source](#build-from-source)
- [The GitHub Action](#the-github-action)
  - [Quick Start](#quick-start)
  - [Service Account Setup](#service-account-setup)
  - [Inputs](#inputs)
  - [Outputs](#outputs)
  - [Action Examples](#action-examples)
- [Output Shape Reference](#output-shape-reference)
- [Security](#security)
- [Contributing](#contributing)
- [License](#license)

---

## The CLI

The Play Console CLI is the engine that makes everything work. It is a compiled native binary — no Python runtime, no dependencies, no installation. Download it, point it at your credentials, and it hands you back JSON.

```
play_console_cli -p com.example.myapp -c service-account.json -A
```

### Download a Binary

Pre-compiled binaries are attached to every [GitHub Release](../../releases/latest) as assets. Pick the one that matches your platform:

| Platform | Architecture | Asset name |
|---|---|---|
| Linux | x64 | `play_console_cli-linux-x64` |
| Linux | arm64 | `play_console_cli-linux-arm64` |
| macOS | x64 (Intel) | `play_console_cli-mac-x64` |
| macOS | arm64 (Apple Silicon) | `play_console_cli-mac-arm64` |
| Windows | x64 | `play_console_cli-windows-x64.exe` |

**Linux / macOS:**

```sh
# Replace <asset-name> with your platform's binary from the table above
curl -L https://github.com/ijlal-ahmad/play-console-info/releases/latest/download/<asset-name> \
  -o play_console_cli

chmod +x play_console_cli
./play_console_cli --help
```

**Windows (PowerShell):**

```powershell
Invoke-WebRequest `
  -Uri "https://github.com/ijlal-ahmad/play-console-info/releases/latest/download/play_console_cli-windows-x64.exe" `
  -OutFile "play_console_cli.exe"

.\play_console_cli.exe --help
```

---

### CLI Flags

#### Required

| Flag | Description |
|---|---|
| `-p, --package <name>` | Android package name, e.g. `com.example.myapp` |
| `-c, --creds-path <path>` | Path to your Google service account credentials JSON file |

#### Resources — pick what you want

| Flag | Description |
|---|---|
| `-A, --all` | Fetch every supported resource |
| `-t, --tracks <tracks>` | `all` or comma-separated: `production,beta,alpha,internal` |
| `-a, --apks` | APK metadata |
| `-b, --bundles` | App Bundle metadata (version codes, SHA1, SHA256) |
| `-l, --listings` | Store listings for all languages |
| `-i, --images <types>` | `all` or comma-separated: `icon,featureGraphic,phoneScreenshots,...` |
| `-I, --inapps` | In-app products and subscriptions |
| `-r, --reviews` | User reviews and ratings |
| `-v, --voided-purchases` | Voided/refunded purchase records |
| `-T, --testers <tracks>` | Tester group membership — `all` or comma-separated tracks |
| `-d, --app-details` | Core app metadata (default language, contact email) |
| `-e, --expansion-files` | Expansion file references for APKs |

#### Options

| Flag | Default | Description |
|---|---|---|
| `-L, --images-language <lang>` | `en-US` | Language code for image retrieval |
| `-P, --reviews-pages <n>` | `1` | Number of review pages to fetch |
| `-S, --reviews-page-size <n>` | `100` | Reviews per page |
| `-j, --json` | — | Output raw JSON to stdout (see below) |

---

### Output Modes

The CLI has two output modes, designed to compose cleanly in any environment.

**Default — human-readable tree** (written to `stderr`)

Without `-j`, the CLI renders a colored tree view of the response. Great for interactive use and debugging.

```
● tracks
    └─╴ production
        ├─╴ name          Release 2.4.0
        ├─╴ versionCodes  ["240"]
        └─╴ status        completed

● bundles
    ├─╴ [0]
    │   ├─╴ versionCode   240
    │   ├─╴ sha1          aabb1122...
    │   └─╴ sha256        0011aabb...
    └─╴ [1]
        └─╴ versionCode   239
```

**JSON mode** — machine-readable (written to `stdout`)

With `-j`, the complete response is written as formatted JSON to `stdout`. Progress and error messages still go to `stderr`, so they never pollute your pipeline.

```sh
# Pipe directly to jq — logs go to stderr, JSON goes straight through
./play_console_cli -p com.example.myapp -c creds.json -t production -b -j | \
  jq '.bundles | sort_by(.versionCode) | last | .sha256'

# Suppress logs entirely, capture clean JSON
./play_console_cli -p com.example.myapp -c creds.json -A -j 2>/dev/null > output.json
```

> **stdout = JSON. stderr = logs.** The separation is strict and intentional — the CLI is designed to live inside pipelines.

---

### CLI Examples

```sh
# Fetch all tracks and bundles
./play_console_cli -p com.example.myapp -c creds.json -t all -b -j

# Fetch production track only
./play_console_cli -p com.example.myapp -c creds.json -t production -j

# Fetch store icon and feature graphic for French listings
./play_console_cli -p com.example.myapp -c creds.json -i icon,featureGraphic -L fr-FR -j

# Fetch last 200 reviews (2 pages × 100)
./play_console_cli -p com.example.myapp -c creds.json -r -P 2 -S 100 -j

# Dump everything to a file, no logs
./play_console_cli -p com.example.myapp -c creds.json -A -j 2>/dev/null > play-console-dump.json

# Interactive tree view — no -j flag
./play_console_cli -p com.example.myapp -c creds.json -t all -l -d
```

---

### Build From Source

If you want to compile the CLI yourself rather than using a release binary:

```sh
git clone https://github.com/ijlal-ahmad/play-console-info.git
cd play-console-info

# Set up Python environment
python -m venv .venv && source .venv/bin/activate
pip install -r cli/python/requirements.txt

# Run directly without compiling
python cli/python/play_console_cli.py -p com.example.myapp -c creds.json -A -j

# Compile to a native binary (uses PyInstaller)
pnpm build:cli:mac         # macOS (detects x64 or arm64 automatically)
pnpm build:cli:linux       # Linux
pnpm build:cli:windows     # Windows

# Or target a specific architecture
pnpm build:cli:linux:x64
pnpm build:cli:linux:arm64
```

---

## The GitHub Action

The action wraps the CLI and makes it available declaratively inside a GitHub Actions workflow. Credentials come from Secrets, every resource you request becomes a named step output, and the whole thing wires into your existing CI in a handful of lines.

### Quick Start

```yaml
- name: Fetch Play Console data
  uses: ijlal-ahmad/play-console-info@v1
  id: play
  with:
    package: com.example.myapp
    serviceAccountJsonPlainText: ${{ secrets.PLAY_SERVICE_ACCOUNT_JSON }}
    tracks: production,beta
    bundles: 'true'

- name: Print current production version codes
  run: |
    echo '${{ steps.play.outputs.tracks }}' | \
      jq '.tracks[] | select(.track=="production") | .releases[].versionCodes'
```

---

### Service Account Setup

You need a Google Cloud service account with Play Console access. This is a one-time setup.

**1. Create the service account**

In [Google Cloud Console → IAM & Admin → Service Accounts](https://console.cloud.google.com/iam-admin/serviceaccounts):

- Click **Create Service Account**, name it something like `github-play-reader`
- Skip the role assignment — Play Console manages its own access
- Under **Keys**, create a new **JSON** key and download the file

**2. Grant access in Play Console**

In [Play Console → Setup → API access](https://play.google.com/console/developers/api-access):

- Link your Google Cloud project
- Find your service account → **Grant access**
- Assign **View app information and download bulk reports (read-only)**
- Click **Invite user**

**3. Add to GitHub Secrets**

**Settings → Secrets and variables → Actions → New repository secret**

- Name: `PLAY_SERVICE_ACCOUNT_JSON`
- Value: the full content of the downloaded JSON key file

> The action accepts credentials as a JSON string (`serviceAccountJsonPlainText`) or as a file path on the runner (`serviceAccountJsonPath`). If both are provided, the file path takes precedence.

---

### Inputs

#### Authentication

| Input | Required | Description |
|---|---|---|
| `package` | ✅ | Android application ID, e.g. `com.example.myapp` |
| `serviceAccountJsonPlainText` | ⚠️ one of these | Full service account JSON as a string — store in a GitHub Secret |
| `serviceAccountJsonPath` | ⚠️ one of these | Path to the service account JSON file on the runner |

#### Resources

| Input | Type | Default | Description |
|---|---|---|---|
| `all` | boolean | `false` | Fetch every supported resource |
| `tracks` | string | — | `all` or comma-separated: `production,beta,alpha,internal` |
| `apks` | boolean | `false` | APK metadata |
| `bundles` | boolean | `false` | App Bundle metadata |
| `listings` | boolean | `false` | Store listings for all languages |
| `images` | string | — | `all` or comma-separated image types |
| `inapps` | boolean | `false` | In-app products and subscriptions |
| `reviews` | boolean | `false` | User reviews and ratings |
| `voidedPurchases` | boolean | `false` | Voided/refunded purchase records |
| `testers` | string | — | `all` or comma-separated tracks |
| `appDetails` | boolean | `false` | Core app metadata |
| `expansionFiles` | boolean | `false` | APK expansion file references |

#### Options

| Input | Default | Description |
|---|---|---|
| `imagesLanguage` | — | Language code for image retrieval, e.g. `en-US` |
| `reviewsPages` | — | Number of review pages to fetch |
| `reviewsPageSize` | — | Reviews per page |

#### Artifact Upload

| Input | Default | Description |
|---|---|---|
| `uploadOutputsArtifact` | `false` | Upload the full JSON response as a workflow artifact |
| `outputsJsonPath` | `artifacts/` | Directory to write the JSON file before upload |
| `outputsArtifactName` | `play-console-outputs` | Artifact name in the workflow run |
| `outputsArtifactRetentionDays` | `1` | Days to keep the artifact (1–90) |

---

### Outputs

Every resource you request becomes a named step output containing a JSON string. Access them with `${{ steps.<id>.outputs.<name> }}`.

| Output | Description |
|---|---|
| `tracks` | Track data — releases, version codes, release notes, status, rollout percentage |
| `apks` | APK metadata — version codes, file sizes, SHA1/SHA256 |
| `bundles` | App Bundle metadata — version codes, SHA1, SHA256 |
| `listings` | Store listings for all languages — title, short/full description |
| `images` | Store images by type — URLs, dimensions, SHA hashes |
| `inapps` | In-app products — IDs, pricing, purchase types, status |
| `reviews` | User reviews — ratings, text, timestamps, reply status |
| `voidedPurchases` | Voided purchases — transaction IDs, void reasons |
| `testers` | Tester group membership per track |
| `appDetails` | App metadata — default language, contact email |
| `expansionFiles` | Expansion file references and sizes |

> All outputs are JSON strings. Parse them with `jq` in shell steps or `JSON.parse()` in script steps.

---

### Action Examples

<details>
<summary><strong>Check your production track on every PR</strong></summary>

```yaml
name: Production Track Check

on:
  pull_request:
    branches: [main]

jobs:
  check-production:
    runs-on: ubuntu-latest
    steps:
      - uses: ijlal-ahmad/play-console-info@v1
        id: play
        with:
          package: com.example.myapp
          serviceAccountJsonPlainText: ${{ secrets.PLAY_SERVICE_ACCOUNT_JSON }}
          tracks: production

      - name: Extract current production version
        id: version
        run: |
          VERSION=$(echo '${{ steps.play.outputs.tracks }}' | \
            jq -r '.tracks[] | select(.track=="production") | .releases[0].versionCodes[0]')
          echo "current=$VERSION" >> $GITHUB_OUTPUT

      - uses: actions/github-script@v7
        with:
          script: |
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: `Current production version code: **${{ steps.version.outputs.current }}**`
            })
```

</details>

<details>
<summary><strong>Monitor reviews and alert on Slack</strong></summary>

```yaml
name: Review Monitor

on:
  schedule:
    - cron: '0 9 * * *'

jobs:
  review-alert:
    runs-on: ubuntu-latest
    steps:
      - uses: ijlal-ahmad/play-console-info@v1
        id: play
        with:
          package: com.example.myapp
          serviceAccountJsonPlainText: ${{ secrets.PLAY_SERVICE_ACCOUNT_JSON }}
          reviews: 'true'
          reviewsPages: '2'
          reviewsPageSize: '50'

      - name: Count 1-star reviews
        id: bad-reviews
        run: |
          COUNT=$(echo '${{ steps.play.outputs.reviews }}' | \
            jq '[.reviews[] | select(.comments[0].userComment.starRating == 1)] | length')
          echo "count=$COUNT" >> $GITHUB_OUTPUT

      - name: Alert Slack
        if: steps.bad-reviews.outputs.count > '0'
        uses: slackapi/slack-github-action@v1
        with:
          payload: |
            { "text": "⚠️ ${{ steps.bad-reviews.outputs.count }} new 1-star review(s) on com.example.myapp" }
        env:
          SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK_URL }}
```

</details>

<details>
<summary><strong>Verify bundle SHA256 after uploading</strong></summary>

```yaml
- uses: ijlal-ahmad/play-console-info@v1
  id: play
  with:
    package: com.example.myapp
    serviceAccountJsonPlainText: ${{ secrets.PLAY_SERVICE_ACCOUNT_JSON }}
    bundles: 'true'

- name: Verify SHA256
  run: |
    EXPECTED="${{ env.EXPECTED_SHA256 }}"
    ACTUAL=$(echo '${{ steps.play.outputs.bundles }}' | \
      jq -r '.bundles | sort_by(.versionCode) | last | .sha256')

    if [ "$EXPECTED" != "$ACTUAL" ]; then
      echo "SHA256 mismatch — expected $EXPECTED, Play Console reports $ACTUAL"
      exit 1
    fi
    echo "SHA256 verified: $ACTUAL"
```

</details>

<details>
<summary><strong>Snapshot store listings as a workflow artifact</strong></summary>

```yaml
- uses: ijlal-ahmad/play-console-info@v1
  with:
    package: com.example.myapp
    serviceAccountJsonPlainText: ${{ secrets.PLAY_SERVICE_ACCOUNT_JSON }}
    listings: 'true'
    images: 'icon,featureGraphic,phoneScreenshots'
    uploadOutputsArtifact: 'true'
    outputsArtifactName: store-listing-snapshot
    outputsArtifactRetentionDays: '90'
```

Titles, descriptions, and image URLs for every market — saved as a downloadable artifact for 90 days.

</details>

<details>
<summary><strong>Gate a build promotion on tester enrollment</strong></summary>

```yaml
- uses: ijlal-ahmad/play-console-info@v1
  id: play
  with:
    package: com.example.myapp
    serviceAccountJsonPlainText: ${{ secrets.PLAY_SERVICE_ACCOUNT_JSON }}
    testers: internal,alpha

- name: Fail if no internal testers enrolled
  run: |
    COUNT=$(echo '${{ steps.play.outputs.testers }}' | \
      jq '.testers.internal.googleGroups | length')

    if [ "$COUNT" -eq "0" ]; then
      echo "No internal testers enrolled"
      exit 1
    fi
    echo "$COUNT internal tester group(s) enrolled"
```

</details>

---

## Output Shape Reference

All responses follow the [Google Play Developer Publishing API v3](https://developers.google.com/android-publisher/api-ref/rest) structure. Only the most commonly used fields are shown.

<details>
<summary><strong>tracks</strong></summary>

```json
{
  "kind": "androidpublisher#tracksListResponse",
  "tracks": [
    {
      "track": "production",
      "releases": [
        {
          "name": "Release 2.4.0",
          "versionCodes": ["240"],
          "status": "completed",
          "releaseNotes": [
            { "language": "en-US", "text": "Bug fixes and performance improvements." }
          ]
        }
      ]
    },
    { "track": "beta" },
    { "track": "alpha" },
    { "track": "internal" }
  ]
}
```

</details>

<details>
<summary><strong>bundles</strong></summary>

```json
{
  "kind": "androidpublisher#bundlesListResponse",
  "bundles": [
    {
      "versionCode": 240,
      "sha1": "aabbccdd...",
      "sha256": "00112233..."
    }
  ]
}
```

</details>

<details>
<summary><strong>listings</strong></summary>

```json
{
  "kind": "androidpublisher#listingsListResponse",
  "listings": [
    {
      "language": "en-US",
      "title": "My App",
      "shortDescription": "The best app for doing things.",
      "fullDescription": "My App helps you..."
    },
    { "language": "fr-FR", "title": "Mon Application" }
  ]
}
```

</details>

<details>
<summary><strong>reviews</strong></summary>

```json
{
  "count": 42,
  "reviews": [
    {
      "reviewId": "abc123",
      "comments": [
        {
          "userComment": {
            "text": "Love this app!",
            "starRating": 5,
            "lastModified": { "seconds": "1715000000" }
          }
        }
      ]
    }
  ]
}
```

</details>

<details>
<summary><strong>appDetails</strong></summary>

```json
{
  "defaultLanguage": "en-US",
  "contactEmail": "support@example.com"
}
```

</details>

---

## Security

- Never commit your service account JSON file. Use GitHub Secrets for the action, and environment variables or a secrets manager for the CLI.
- When `serviceAccountJsonPlainText` is used, the action writes the credential to a temporary file on the runner for the duration of the job only. It does not persist after the runner is cleaned up.
- Grant your service account **read-only** Play Console access. This tool only reads — it never publishes, modifies tracks, or submits changes.
- Pin the action to a specific release tag (e.g. `@v1.2.0`) rather than a branch to protect against unexpected upstream changes.

---

## Contributing

The action is TypeScript. The CLI is Python, compiled to a native binary with PyInstaller. Tests use Jest with ts-jest.

```sh
pnpm install           # install dependencies
pnpm test:unit         # unit tests (no binaries required)
pnpm typecheck         # TypeScript type check
pnpm build             # compile the action
pnpm build:cli:mac     # compile the CLI binary for macOS
```

`pnpm test:unit` and `pnpm typecheck` must pass before opening a PR. CI enforces both.

---

## License

MIT © [Ijlal Ahmad](https://github.com/ijlal-ahmad)

---

<div align="center">
  <sub>Built because this problem was real, and nobody else had fixed it.</sub>
</div>
