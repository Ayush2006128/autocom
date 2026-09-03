import { NativeModule, requireOptionalNativeModule } from "expo";
import type { ForegroundServiceModule as ForegroundServiceModuleType } from "./ForegroundService.types";

declare class ForegroundServiceModule extends NativeModule<{}> {
  start: ForegroundServiceModuleType["start"];
  stop: ForegroundServiceModuleType["stop"];
  isRunning: ForegroundServiceModuleType["isRunning"];
}

const nativeModule = requireOptionalNativeModule<ForegroundServiceModule>(
  "ForegroundService"
);

export default nativeModule ?? {
  start: async () => {},
  stop: async () => {},
  isRunning: async () => false,
};
