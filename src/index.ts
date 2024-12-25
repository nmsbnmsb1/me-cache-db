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

//初始化
import { CacheManager, type Cache } from "./core/cache";
export function initCache(
	defaultCID: string,
	cacheMap: { [cid: string]: Cache },
	defalutExpireMS?: number,
) {
	CacheManager.defaultCID = defaultCID;
	CacheManager.cacheMap = cacheMap;
	if (defalutExpireMS !== undefined) {
		CacheManager.defaultExpireMS = defalutExpireMS;
	}
}
