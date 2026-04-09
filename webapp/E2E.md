# End-to-End (E2E) Testing Guide

This project uses a combination of **Cucumber.js** (for Behavior-Driven Development scenarios) and **Playwright** (for browser automation) to conduct full-stack End-to-End tests.

The E2E tests interact with the actual running application from a user's perspective. It opens a browser, registers a new account, logs in, and dynamically acts on the React UI fully communicating with the Rust backend and MongoDB databases.

## Directory Structure
All E2E testing logic is contained within the `webapp/test/e2e` folder:
- `features/`: Contains the `.feature` files written in Gherkin syntax. This is the human-readable "drehbuch" (script) that dictates the flows.
- `steps/`: Contains the JavaScript step definitions that map the Gherkin syntax lines to concrete Playwright API calls and assertions.
- `support/`: Contains setup and teardown logic (`setup.mjs`), including Playwright browser initialization and global timeouts.

---

## How to Run the Tests

Below are all the commands you can run from the `webapp` directory via your terminal.

### 1. First-time Setup
You must execute this initially to download the necessary Playwright browser binaries (Chromium, Firefox, WebKit):
```bash
npm run test:e2e:install-browsers
```

### 2. CI/CD Mode (Fast & Headless)
This mode runs the tests instantly in the background without opening a visible browser window. It is ideal for continuous integration pipelines or fast local verification.
* **Run default (Chromium only):**
  ```bash
  npm run test:e2e:run
  ```
* **Run cross-browser (Chromium, Firefox, WebKit):**
  ```bash
  npm run test:e2e:run-all
  ```

### 3. Developer Mode (Visible UI & Slow Motion)
This mode explicitly flags `SHOW_UI="1"`. It launches an actual visible browser window and introduces a `1200ms` delay between every single action. This allows you to visually inspect the UI behaviors and debug the test live.
* **Run default with UI (Chromium only):**
  ```bash
  npm run test:e2e:ui
  ```
* **Run cross-browser with UI:**
  ```bash
  npm run test:e2e:ui-all
  ```

### 4. Advanced: Testing a specific Browser with UI
If you need to visually debug a specific browser on Windows (e.g. Firefox), use the explicit environment flags before the standard run command:
```powershell
$env:SHOW_UI="1"; $env:BROWSER="firefox"; npm run test:e2e:run
```

---

## What does the Test do?
Currently, our primary scenario is defined in `game.feature`. It rigorously verifies the core game loop:
1. **Registration:** Randomizes a unique `E2EPlayer_*` identity and successfully registers via the UI, bypassing the popup alerts natively.
2. **Login isolation:** Actively logs out and performs a clean manual Login action to prove authentication.
3. **Bot Matchups:** Enters the Lobby and sequentially plays **3 complete matches** against the Rust Bot until a definite Win/Lose overlay appears:
    - `BEGINNER` mode on a size `5` board
    - `MEDIUM` mode on a size `11` board
    - `ADVANCED` mode on a size `5` board
4. **Assertions:** At the end of every active match, the test asserts that the winner declaration popup correctly spells out `"WINS!"`.
5. **Teardown:** Cleans up by returning to the Profile overlay, logging out, and tearing down the browser instance.
