import { Cache, CachePipeline } from '../core/cache';
export declare class JSONCache implements Cache {
    static CID: string;
    private rootPath;
    constructor(rootPath: string);
    getKey(prefix: string, ns: string, nn: any): string;
    exists(key: string): Promise<boolean>;
    expire(key: string, ms: number): Promise<void>;
    del(key: string): Promise<void>;
    set(key: string, data: any): Promise<any>;
    set(key: string, field: string, value: any): Promise<any>;
    get(key: string): Promise<any>;
    get(key: string, fields: string[]): Promise<any>;
    pipeline(): CachePipeline;
}
export declare class JSONPipeline implements CachePipeline {
    private parent;
    private rootPath;
    private dataMap;
    constructor(parent: JSONCache, rootPath: string);
    getCache(): JSONCache;
    private getData;
    set(key: string, field: any, value: any): void;
    get(key: string, fields: undefined | string[], cb: (err: Error, values: any[] | {
        [field: string]: any;
    }, valueConvertor?: (value: any) => any) => any): any;
    expire(key: string, ms: number): void;
    del(key: string): void;
    exec(): Promise<void>;
}
