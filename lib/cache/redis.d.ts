import Redis, { type ChainableCommander } from "ioredis";
import type { Cache, CachePipeline } from "../core/cache";
export declare class RedisCache implements Cache {
    static CID: string;
    private redis;
    constructor(redis?: Redis);
    getKey(prefix: string, ns: string, nn: any): string;
    exists(key: string): Promise<boolean>;
    expire(key: string, ms: number): Promise<number>;
    del(key: string): Promise<number>;
    set(key: string, data: any): Promise<any>;
    set(key: string, field: string, value: any): Promise<any>;
    get(key: string): Promise<any>;
    get(key: string, fields: string[]): Promise<any>;
    pipeline(): CachePipeline;
}
export declare class RedisPipeline implements CachePipeline {
    private parent;
    private redis;
    private pl;
    constructor(parent: RedisCache, redis: Redis);
    getCache(): RedisCache;
    set(key: string, field: any, value: any): ChainableCommander;
    get(key: string, fields: undefined | string[], cb: (err: Error, values: any[] | {
        [field: string]: any;
    }, valueConvertor: (value: any) => any) => any): void;
    expire(key: string, ms: number): void;
    del(key: string): void;
    exec(): Promise<void>;
}
