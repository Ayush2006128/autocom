export type ForegroundServiceModule = {
  start: () => Promise<void>;
  stop: () => Promise<void>;
  isRunning: () => Promise<boolean>;
};
