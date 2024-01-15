import Redis, { ChainableCommander } from 'ioredis';
import { ICache, ICachePipeline } from '../core/cache';
export declare class RedisCache implements ICache {
    static CID: string;
    private redis;
    constructor(redis?: Redis);
    getKey(prefix: string, ns: string, pk: any): string;
    exists(key: string): Promise<boolean>;
    expire(key: string, ms: number): Promise<number>;
    del(key: string): Promise<number>;
    set(key: string, data: any): Promise<any>;
    set(key: string, field: string, value: any): Promise<any>;
    get(key: string): Promise<any>;
    get(key: string, fields: string[]): Promise<any>;
    pipeline(): ICachePipeline;
}
export declare class RedisPipeline implements ICachePipeline {
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
