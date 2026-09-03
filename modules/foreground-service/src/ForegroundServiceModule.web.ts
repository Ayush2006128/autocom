import { registerWebModule, NativeModule } from "expo";
import type { ForegroundServiceModule as ForegroundServiceModuleType } from "./ForegroundService.types";

// ForegroundServiceModule is not available on the web platform.
class ForegroundServiceModule extends NativeModule<ForegroundServiceModuleType> {
  start = async () => {};
  stop = async () => {};
  isRunning = async () => false;
}

export default registerWebModule(ForegroundServiceModule, "ForegroundService");
