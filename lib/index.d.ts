export * from './core/fields';
export * from './core/cache';
export * from './core/db';
export * from './core/cdata';
export * from './data';
export * from './list';
export * from './trigger';
import { ICache } from './core/cache';
import { DataTransformer } from './core/cdata';
export declare function initCache(defaultCID: string, cacheMap: {
    [cid: string]: ICache;
}, defalutExpireMS?: number, defaultTransform?: DataTransformer): void;
