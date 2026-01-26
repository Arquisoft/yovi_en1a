# E2E tests (Playwright + Cucumber)

This project includes a simple BDD-style E2E setup that uses Playwright for browser automation and Cucumber (`@cucumber/cucumber`) for Gherkin feature files.

Quick commands:

- Install Playwright browsers (once):

  ```bash
  npm run test:e2e:install-browsers
  ```

- Run E2E tests (requires both the app and the users service running):

  - Start both dev servers and run tests automatically:

    ```bash
    npm run test:e2e:dev
    ```

  - Or, start the dev server yourself (`npm run dev`) and the users service (`(cd ../users && npm start)`) then run:

    ```bash
    npm run test:e2e
    ```

Files of interest:
- `features/register.feature` - example Gherkin feature
- `test/e2e/steps` - step definitions
- `test/e2e/support` - Cucumber World and Playwright hooks

Run tests in a visible browser / slow motion

- Run tests with a visible browser (headed):

  ```bash
  npm run test:e2e:headed
  ```

- Run tests in visible slow motion (helpful to watch actions):

  ```bash
  npm run test:e2e:slow
  ```

- Debug mode (headed + slow motion + open devtools):

  ```bash
  npm run test:e2e:debug
  ```

Notes:
- For CI, ensure Playwright browsers are installed (e.g. `npx playwright install --with-deps`).
- The `test:e2e:dev` script uses `concurrently` to start both Vite and the `users` service and then runs the Cucumber tests.
