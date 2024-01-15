//缓存
export interface ICache {
	//common
	getKey(prefix: string, ns: string, pk: any): string;
	//
	exists(key: string): Promise<boolean>;
	expire(key: string, ms: number): Promise<any>;
	del(key: string): Promise<any>;
	//data
	set(key: string, data: any): Promise<any>;
	set(key: string, field: string, value: any): Promise<any>;
	get(key: string): Promise<any>;
	get(key: string, fields: string[]): Promise<any>;
	//获取管道
	pipeline(): ICachePipeline;
}
//缓存Pipeline
export interface ICachePipeline {
	getCache(): ICache;
	//
	set(key: string, field: string, value: any): void;
	get(
		key: string,
		fields: undefined | string[],
		cb: (
			err: Error,
			values: any[] | { [field: string]: any },
			valueConvertor?: (value: any) => any
			//
		) => any
	): void;
	expire(key: string, ms: number): void;
	del(key: string): void;
	//
	exec(): Promise<any>;
}

export class CacheManager {
	public static defaultCID: string;
	public static cacheMap: { [cid: string]: ICache } = {};
	public static defaultExpireMS: number = 3 * 24 * 60 * 60 * 1000;

	public static getCache(cid?: string) {
		return CacheManager.cacheMap[cid || CacheManager.defaultCID];
	}
	public static pipeline(cid?: string) {
		let cache = CacheManager.cacheMap[cid || CacheManager.defaultCID];
		if (!cache) return;
		return cache.pipeline();
	}
}
