import { ICache, ICachePipeline } from '../core/cache';
export declare class NullCache implements ICache {
    static CID: string;
    constructor();
    getKey(prefix: string, ns: string, pk: string): string;
    exists(key: string): Promise<boolean>;
    expire(key: string, ms?: number): Promise<void>;
    del(key: string): Promise<void>;
    set(key: string, data: any): Promise<any>;
    set(key: string, field: string, value: any): Promise<any>;
    get(key: string): Promise<any>;
    get(key: string, fields: string[]): Promise<any>;
    pipeline(): ICachePipeline;
}
export declare class NullPipeline implements ICachePipeline {
    private parent;
    constructor(parent: NullCache);
    getCache(): NullCache;
    set(key: string, field: any, value: any): void;
    get(key: string, fields: undefined | string[], cb: (err: Error, values: any[] | {
        [field: string]: any;
    }, valueConvertor?: (value: any) => any) => any): void;
    expire(key: string, ms?: number): void;
    del(key: string): void;
    exec(): Promise<void>;
}
