import type { Cache, CachePipeline } from "../core/cache";

//ICache
export class NullCache implements Cache {
	public static CID = "null";

	//common
	public getKey(prefix: string, ns: string, nn: any) {
		return "";
	}
	public async exists(key: string) {
		return false;
	}
	public async expire(key: string, ms?: number) {}
	public async del(key: string) {}
	//
	public set(key: string, data: any): Promise<any>;
	public set(key: string, field: string, value: any): Promise<any>;
	public async set(key: string, field: any, value?: any) {}

	public get(key: string): Promise<any>;
	public get(key: string, fields: string[]): Promise<any>;
	public async get(key: string, fields?: string[]) {}
	//ordered list
	// public async lcount(key: string) {
	// 	let data = read(this.rootPath, key);
	// 	return data ? data.data.length : 0;
	// }
	// public async lrange(key: string, order: 'ASC' | 'DESC', start: number, end: number) {
	// 	let data = read(this.rootPath, key);
	// 	if (!data) return;
	// 	return order === 'ASC' ? data.data.slice(start, end) : (data.data as any[]).reverse().slice(start, end);
	// }
	// public async ladd(key: string, order: number, value: any) {
	// 	let data = read(this.rootPath, key, 'Array');
	// 	data.data[order] = value;
	// 	write(this.rootPath, key, data);
	// }
	//获取管道
	public pipeline(): CachePipeline {
		return new NullPipeline(this);
	}
}

export class NullPipeline implements CachePipeline {
	private parent: NullCache;
	constructor(parent: NullCache) {
		this.parent = parent;
	}
	public getCache(): NullCache {
		return this.parent;
	}
	public set(key: string, field: any, value: any) {}
	public get(
		key: string,
		fields: undefined | string[],
		cb: (
			err: Error,
			values: any[] | { [field: string]: any },
			valueConvertor?: (value: any) => any,
			//
		) => any,
	) {
		cb(undefined, undefined);
	}
	public expire(key: string, ms?: number): void {}
	public del(key: string): void {}
	public async exec() {}
}
