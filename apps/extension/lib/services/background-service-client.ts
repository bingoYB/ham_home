import { createProxyService } from "@webext-core/proxy-service";
import {
  BACKGROUND_SERVICE_KEY,
  type IBackgroundService,
} from "./background-service-contract";

export type { IBackgroundService } from "./background-service-contract";

export function getBackgroundService() {
  return createProxyService<IBackgroundService>(BACKGROUND_SERVICE_KEY);
}
