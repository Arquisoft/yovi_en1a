# End-to-End (E2E) Testing Guide

This project uses a combination of **Cucumber.js** (for Behavior-Driven Development scenarios) and **Playwright** (for browser automation) to conduct full-stack End-to-End tests.

The E2E tests interact with the actual running application from a user's perspective. It opens a browser, registers a new account, logs in, and dynamically acts on the React UI fully communicating with the Rust backend and MongoDB databases.

## Directory Structure
All E2E testing logic is contained within the `webapp/test/e2e` folder:
- `features/`: Contains the `.feature` files written in Gherkin syntax. Each feature file covers one isolated concern (auth, easy game, etc.).
- `steps/`: Contains the JavaScript step definitions that map the Gherkin syntax lines to concrete Playwright API calls and assertions. All steps are shared across features.
- `support/`: Contains setup and teardown logic (`setup.mjs`), including Playwright browser initialization and global timeouts.

---

## Feature Files

| File | Description |
|---|---|
| `auth.feature` | Registration, Login, Logout |
| `game-easy.feature` | Play a Beginner game (size 5) |
| `game-difficult.feature` | Play an Advanced game (size 5) |
| `game-whynot.feature` | Verify the Why Not rule mode |

---

## How to Run the Tests

Below are all the commands you can run from the `webapp` directory via your terminal.

### 1. First-time Setup
You must execute this initially to download the necessary Playwright browser binaries (Chromium, Firefox, WebKit):
```bash
npm run test:e2e:install-browsers
```

### 2. Run ALL features (headless)
* **Run default (Chromium only):**
  ```bash
  npm run test:e2e:run
  ```
* **Run cross-browser (Chromium, Firefox, WebKit sequentially):**
  ```bash
  npm run test:e2e:run-all
  ```

### 3. Run a SINGLE feature (headless)
```bash
npm run test:e2e:auth        # Only authentication
npm run test:e2e:easy        # Only beginner game
npm run test:e2e:difficult   # Only advanced game
npm run test:e2e:whynot      # Only Why Not rule
```

### 4. Developer Mode (Visible UI & Slow Motion)
This mode explicitly flags `SHOW_UI="1"`. It launches a visible browser window with a delay between actions for visual debugging.
* **Run all features with UI (Chromium only):**
  ```bash
  npm run test:e2e:ui
  ```
* **Run all features cross-browser with UI:**
  ```bash
  npm run test:e2e:ui-all
  ```

### 5. Advanced: Specific Browser + Specific Feature
If you need to visually debug a specific browser and feature on Windows (PowerShell):
```powershell
$env:SHOW_UI="1"; $env:BROWSER="firefox"; npm run test:e2e:auth
```
On Linux/macOS:
```bash
SHOW_UI=1 BROWSER=webkit npm run test:e2e:easy
```

---

## CI/CD Pipeline Behavior

Both `build.yml` and `release-deploy.yml` run E2E tests across **all 3 browsers** (Chromium, Firefox, WebKit):

- **build.yml (PR checks):** Runs all 3 browsers **in parallel** for speed.
- **release-deploy.yml (releases):** Runs all 3 browsers **sequentially** for stability.

In both cases, `npm run test:e2e:run` executes **all** feature files automatically (Cucumber scans the entire `features/` directory).

---

## What do the Tests cover?
1. **Registration:** Randomizes a unique `E2EPlayer_*` identity and registers via the UI.
2. **Login isolation:** Logs out and performs a clean manual Login to verify authentication.
3. **Bot Matchups:** Plays complete matches against the Rust Bot until a Win/Lose overlay appears:
    - `BEGINNER` mode on a size `5` board
    - `ADVANCED` mode on a size `5` board
4. **Why Not rule:** Verifies the alternative game rule can be selected and a game starts.
