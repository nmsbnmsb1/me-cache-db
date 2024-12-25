"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CacheManager = void 0;
exports.CacheManager = {
    defaultCID: '',
    cacheMap: {},
    defaultExpireMS: 3 * 24 * 60 * 60 * 1000,
    getCache(cid) {
        return exports.CacheManager.cacheMap[cid || exports.CacheManager.defaultCID];
    },
    pipeline(cid) {
        let cache = exports.CacheManager.cacheMap[cid || exports.CacheManager.defaultCID];
        if (!cache)
            return;
        return cache.pipeline();
    },
};
//# sourceMappingURL=cache.js.map