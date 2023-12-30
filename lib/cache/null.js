"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NullPipeline = exports.NullCache = void 0;
class NullCache {
    constructor() { }
    getKey(prefix, ns, pk) {
        return '';
    }
    async exists(key) {
        return false;
    }
    async expire(key, ms) { }
    async del(key) { }
    async set(key, field, value) { }
    async get(key, fields) { }
    pipeline() {
        return new NullPipeline(this);
    }
}
exports.NullCache = NullCache;
NullCache.CID = 'null';
class NullPipeline {
    constructor(parent) {
        this.parent = parent;
    }
    getCache() {
        return this.parent;
    }
    set(key, field, value) { }
    get(key, fields, cb) {
        cb(undefined, undefined);
    }
    expire(key, ms) { }
    del(key) { }
    async exec() { }
}
exports.NullPipeline = NullPipeline;
//# sourceMappingURL=null.js.map