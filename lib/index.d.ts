export * from "./core/keys";
export * from "./core/fields";
export * from "./core/cache";
export * from "./core/db.utils";
export * from "./core/db.where";
export * from "./core/db.page";
export * from "./core/db";
export * from "./core/cdata";
export * from "./data";
export * from "./list";
export * from "./trigger";
import { type Cache } from "./core/cache";
export declare function initCache(defaultCID: string, cacheMap: {
    [cid: string]: Cache;
}, defalutExpireMS?: number): void;
