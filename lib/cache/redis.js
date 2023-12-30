"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RedisPipeline = exports.RedisCache = void 0;
const ioredis_1 = __importDefault(require("ioredis"));
function toRedisValue(v) {
    if (v === null || v === undefined)
        return 'null';
    if (typeof v === 'number')
        return `i/${v}`;
    return v;
}
function getRedisValue(v) {
    if (v === null || v === undefined)
        return undefined;
    if (v === 'null')
        return null;
    if (v.startsWith('i/'))
        return parseInt(v.substring(2));
    return v;
}
class RedisCache {
    constructor(redis) {
        this.redis = redis || new ioredis_1.default();
    }
    getKey(prefix, ns, pk) {
        return `${prefix}:${ns}:${pk}`;
    }
    async exists(key) {
        return (await this.redis.exists(key)) > 0;
    }
    async expire(key, ms) {
        return this.redis.pexpire(key, ms);
    }
    async del(key) {
        return this.redis.del(key);
    }
    async set(key, field, value) {
        if (typeof field === 'string') {
            return this.redis.hset(key, field, toRedisValue(value));
        }
        let pl = this.redis.pipeline();
        for (let f in field) {
            pl.hset(key, field, toRedisValue(field[f]));
        }
        return pl.exec();
    }
    async get(key, fields) {
        if (!fields) {
            let all = await this.redis.hgetall(key);
            for (let f in all) {
                all[f] = getRedisValue(all[f]);
            }
            return all;
        }
        let values = await this.redis.hmget(key, ...fields);
        let data = {};
        for (let i = 0; i < fields.length; i++) {
            data[fields[i]] = getRedisValue(values[i]);
        }
        return data;
    }
    pipeline() {
        return new RedisPipeline(this, this.redis);
    }
}
exports.RedisCache = RedisCache;
RedisCache.CID = 'redis';
class RedisPipeline {
    constructor(parent, redis) {
        this.parent = parent;
        this.redis = redis;
        this.pl = this.redis.pipeline();
    }
    getCache() {
        return this.parent;
    }
    set(key, field, value) {
        return this.pl.hset(key, field, toRedisValue(value));
    }
    get(key, fields, cb) {
        if (fields) {
            this.pl.hmget(key, ...fields, (err, values) => cb(err, values, getRedisValue));
        }
        else {
            this.pl.hgetall(key, (err, values) => cb(err, values, getRedisValue));
        }
    }
    expire(key, ms) {
        this.pl.pexpire(key, ms);
    }
    del(key) {
        this.pl.del(key);
    }
    async exec() {
        await this.pl.exec();
        this.redis = undefined;
        this.pl = undefined;
    }
}
exports.RedisPipeline = RedisPipeline;
//# sourceMappingURL=redis.js.map