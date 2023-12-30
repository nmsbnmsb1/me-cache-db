import path from 'path';
import fs from 'fs';
import { CacheManager, ICache, ICachePipeline } from '../core/cache';

function getPath(rootPath: string, key: string) {
	return path.resolve(rootPath, key);
}
function read(rootPath: string, key: string, createType?: 'Array' | 'Object') {
	let data: any;
	try {
		data = JSON.parse(fs.readFileSync(getPath(rootPath, key)).toString());
		//如果过期了，则置空
		if (data.expire > 0 && Date.now() > data.expire) {
			data = undefined;
		}
	} catch (e) {}
	//
	if (!data && createType) {
		data = {
			data: createType === 'Array' ? [] : {},
			expire: Date.now() + CacheManager.defaultExpireMS,
		};
	}
	return data;
}
function write(rootPath: string, key: string, data: any) {
	fs.writeFileSync(getPath(rootPath, key), JSON.stringify(data));
}
function del(rootPath: string, key: string) {
	try {
		fs.unlinkSync(getPath(rootPath, key));
	} catch (e) {}
}

//ICache
export class JSONCache implements ICache {
	public static CID = 'json';

	private rootPath = path.resolve();

	constructor(rootPath: string) {
		this.rootPath = rootPath;
		if (!fs.existsSync(this.rootPath)) {
			fs.mkdirSync(this.rootPath);
		}
	}

	//common
	public getKey(prefix: string, ns: string, pk: string) {
		return `${prefix}_${ns}_${pk.replace(/\//g, '_')}`;
	}
	public async exists(key: string) {
		return fs.existsSync(getPath(this.rootPath, key));
	}
	public async expire(key: string, ms: number) {
		let data = read(this.rootPath, key);
		if (!data) return;
		data.expire = ms === 0 ? 0 : Date.now() + ms;
		write(this.rootPath, key, data);
	}
	public async del(key: string) {
		del(this.rootPath, key);
	}
	//
	public set(key: string, data: any): Promise<any>;
	public set(key: string, field: string, value: any): Promise<any>;
	public async set(key: string, field: any, value?: any) {
		let data = read(this.rootPath, key, 'Object');
		if (typeof field === 'string') {
			data.data[field] = value;
		} else {
			for (let f in field) {
				data.data[f] = field[f];
			}
		}
		write(this.rootPath, key, data);
	}
	public get(key: string): Promise<any>;
	public get(key: string, fields: string[]): Promise<any>;
	public async get(key: string, fields?: string[]) {
		let data = read(this.rootPath, key);
		if (!data) return;
		if (!fields) return data.data;
		//
		let ndata: any = {};
		for (let f of fields) {
			ndata[f] = data.data[f];
		}
		return ndata;
	}
	//
	public pipeline(): ICachePipeline {
		return new JSONPipeline(this, this.rootPath);
	}
}

export class JSONPipeline implements ICachePipeline {
	private parent: JSONCache;
	private rootPath: string;
	private dataMap: { [p: string]: any } = {};

	constructor(parent: JSONCache, rootPath: string) {
		this.parent = parent;
		this.rootPath = rootPath;
	}
	//
	public getCache(): JSONCache {
		return this.parent;
	}
	//
	private getData(key: string, createType?: 'Array' | 'Object') {
		if (!this.dataMap[key]) {
			let data = read(this.rootPath, key, createType);
			if (data) {
				this.dataMap[key] = data;
			}
		}
		return this.dataMap[key];
	}
	public set(key: string, field: any, value: any) {
		let data = this.getData(key, 'Object');
		data.data[field] = value;
		data.needWrite = true;
	}
	public get(
		key: string,
		fields: undefined | string[],
		cb: (
			err: Error,
			values: any[] | { [field: string]: any },
			valueConvertor?: (value: any) => any
			//
		) => any
	) {
		let data = this.getData(key);
		if (!data) {
			return cb(undefined, undefined);
		} else if (!fields) {
			return cb(undefined, data.data);
		}
		//
		let ndata: any = {};
		for (let f of fields) {
			ndata[f] = data.data[f];
		}
		return cb(undefined, ndata);
	}
	public expire(key: string, ms: number): void {
		let data = this.getData(key);
		if (data) {
			data.expire = ms === 0 ? 0 : Date.now() + ms;
		}
	}
	public del(key: string): void {
		delete this.dataMap[key];
		del(this.rootPath, key);
	}
	//
	public async exec() {
		for (let key in this.dataMap) {
			let data = this.dataMap[key];
			if (data.needWrite) {
				delete data.needWrite;
				write(this.rootPath, key, data);
			}
		}
		//
		this.dataMap = undefined;
	}
}
