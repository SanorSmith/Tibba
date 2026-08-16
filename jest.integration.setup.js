/**
 * Enables the opt-in integration tests.
 *
 * They talk to a running dev server and the real database, so they are skipped
 * during a plain `npm test`. This file is loaded only by
 * jest.integration.config.js, which `npm run test:isolation` uses — that keeps
 * the switch cross-platform without depending on cross-env.
 */
process.env.RUN_INTEGRATION = '1';
