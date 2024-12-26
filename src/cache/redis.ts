import Redis, { type ChainableCommander } from 'ioredis';
import type { Cache, CachePipeline } from '../core/cache';

function toRedisValue(v: any) {
	if (v === null || v === undefined) return 'null';
	if (typeof v === 'number') return `i/${v}`;
	if (typeof v === 'object') return `j/${JSON.stringify(v)}`;
	return v;
}
function getRedisValue(v: any) {
	if (v === null || v === undefined) return undefined;
	if (v === 'null') return null;
	if (v.startsWith('i/')) return parseInt(v.substring(2));
	if (v.startsWith('j/')) return JSON.parse(v.substring(2));
	return v;
}

//ICache
export class RedisCache implements Cache {
	public static CID = 'redis';

	private redis: Redis;

	constructor(redis?: Redis) {
		this.redis = redis || new Redis();
	}

	//common
	public getKey(prefix: string, ns: string, nn: any) {
		return `${prefix}:${ns}:${nn}`;
	}
	public async exists(key: string) {
		return (await this.redis.exists(key)) > 0;
	}
	public async expire(key: string, ms: number) {
		return this.redis.pexpire(key, ms);
	}
	public async del(key: string) {
		return this.redis.del(key);
	}
	//
	public set(key: string, data: any): Promise<any>;
	public set(key: string, field: string, value: any): Promise<any>;
	public async set(key: string, field: any, value?: any) {
		if (typeof field === 'string') {
			return this.redis.hset(key, field, toRedisValue(value));
		}
		//
		let pl = this.redis.pipeline();
		for (let f in field) {
			pl.hset(key, field, toRedisValue(field[f]));
		}
		return pl.exec();
	}

	public get(key: string): Promise<any>;
	public get(key: string, fields: string[]): Promise<any>;
	public async get(key: string, fields?: string[]) {
		if (!fields) {
			let all = await this.redis.hgetall(key);
			for (let f in all) {
				all[f] = getRedisValue(all[f]);
			}
			return all;
		}
		//
		let values = await this.redis.hmget(key, ...fields);
		let data: any = {};
		for (let i = 0; i < fields.length; i++) {
			data[fields[i]] = getRedisValue(values[i]);
		}
		return data;
	}
	//ordered list
	// public async lcount(key: string) {
	// 	return this.redis.zcard(key);
	// }
	// public async lrange(key: string, order: 'ASC' | 'DESC', start: number, end: number) {
	// 	return order === 'ASC' ? this.redis.zrange(key, start, end) : this.redis.zrevrange(key, start, end);
	// }
	// public async ladd(key: string, order: number, value: any) {
	// 	return this.redis.zadd(key, order, toRedisValue(value));
	// }
	//获取管道
	public pipeline(): CachePipeline {
		return new RedisPipeline(this, this.redis);
	}
}

export class RedisPipeline implements CachePipeline {
	private parent: RedisCache;
	private redis: Redis;
	private pl: ChainableCommander;

	constructor(parent: RedisCache, redis: Redis) {
		this.parent = parent;
		this.redis = redis;
		this.pl = this.redis.pipeline();
	}

	public getCache(): RedisCache {
		return this.parent;
	}
	public set(key: string, field: any, value: any) {
		return this.pl.hset(key, field, toRedisValue(value));
	}
	public get(
		key: string,
		fields: undefined | string[],
		cb: (
			err: Error,
			values: any[] | { [field: string]: any },
			valueConvertor: (value: any) => any
			//
		) => any
	) {
		if (fields) {
			this.pl.hmget(key, ...fields, (err, values) => cb(err, values, getRedisValue));
		} else {
			this.pl.hgetall(key, (err, values) => cb(err, values, getRedisValue));
		}
	}
	// public ladd(key: string, order: number, value: any): void {
	// 	this.pl.zadd(key, order, toRedisValue(value));
	// }
	//
	public expire(key: string, ms: number): void {
		this.pl.pexpire(key, ms);
	}
	public del(key: string): void {
		this.pl.del(key);
	}
	public async exec() {
		await this.pl.exec();
		//
		this.redis = undefined;
		this.pl = undefined;
	}
}
