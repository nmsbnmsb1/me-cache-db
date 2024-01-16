export * from './core/fields';
export * from './core/cache';
export * from './core/db';
export * from './core/cdata';
export * from './data';
export * from './list';
export * from './trigger';

//初始化
import { CacheManager, ICache } from './core/cache';
export function initCache(
	defaultCID: string,
	cacheMap: { [cid: string]: ICache },
	defalutExpireMS?: number
	//
) {
	CacheManager.defaultCID = defaultCID;
	CacheManager.cacheMap = cacheMap;
	if (defalutExpireMS !== undefined) {
		CacheManager.defaultExpireMS = defalutExpireMS;
	}
}
