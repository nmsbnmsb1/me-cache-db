"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initCache = initCache;
__exportStar(require("./core/keys"), exports);
__exportStar(require("./core/fields"), exports);
__exportStar(require("./core/cache"), exports);
__exportStar(require("./core/db"), exports);
__exportStar(require("./core/cdata"), exports);
__exportStar(require("./data"), exports);
__exportStar(require("./list"), exports);
__exportStar(require("./trigger"), exports);
const cache_1 = require("./core/cache");
function initCache(defaultCID, cacheMap, defalutExpireMS) {
    cache_1.CacheManager.defaultCID = defaultCID;
    cache_1.CacheManager.cacheMap = cacheMap;
    if (defalutExpireMS !== undefined) {
        cache_1.CacheManager.defaultExpireMS = defalutExpireMS;
    }
}
//# sourceMappingURL=index.js.map