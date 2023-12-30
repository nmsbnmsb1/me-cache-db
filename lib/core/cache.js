"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CacheManager = void 0;
class CacheManager {
    static getCache(cid) {
        return CacheManager.cacheMap[cid || CacheManager.defaultCID];
    }
    static pipeline(cid) {
        let cache = CacheManager.cacheMap[cid || CacheManager.defaultCID];
        if (!cache)
            return;
        return cache.pipeline();
    }
}
exports.CacheManager = CacheManager;
CacheManager.cacheMap = {};
CacheManager.defaultExpireMS = 3 * 24 * 60 * 60 * 1000;
//# sourceMappingURL=cache.js.map