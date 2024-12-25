export interface Cache {
    getKey(prefix: string, ns: string, nn: any): string;
    exists(key: string): Promise<boolean>;
    expire(key: string, ms: number): Promise<any>;
    del(key: string): Promise<any>;
    set(key: string, data: any): Promise<any>;
    set(key: string, field: string, value: any): Promise<any>;
    get(key: string): Promise<any>;
    get(key: string, fields: string[]): Promise<any>;
    pipeline(): CachePipeline;
}
export interface CachePipeline {
    getCache(): Cache;
    set(key: string, field: string, value: any): void;
    get(key: string, fields: undefined | string[], cb: (err: Error, values: any[] | {
        [field: string]: any;
    }, valueConvertor?: (value: any) => any) => any): void;
    expire(key: string, ms: number): void;
    del(key: string): void;
    exec(): Promise<any>;
}
export declare const CacheManager: {
    defaultCID: string;
    cacheMap: {
        [cid: string]: Cache;
    };
    defaultExpireMS: number;
    getCache(cid?: string): Cache;
    pipeline(cid?: string): CachePipeline;
};
