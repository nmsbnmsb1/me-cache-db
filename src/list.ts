import { type Cache, CacheManager } from './core/cache';
import { type Data, type DataDescriptor, type DataTransformer, cgetData, cset } from './core/cdata';
import type { OrderDefinition, SqlOptions } from './core/db';
import type { PageData } from './core/db.page';
import { type FieldsOptions, attachAs } from './core/fields';
import type { NameKey } from './core/keys';
import { Trigger } from './trigger';

//List查询器
export interface ListDataDescriptor extends DataDescriptor, SqlOptions {}
export interface ListSelField extends FieldsOptions, SqlOptions {}
export type ListSelector = (
	listdds: ListDataDescriptor[],
	page: number,
	pageSize: number,
	order: 'ASC' | 'DESC'
) => Promise<{ count: number; datas: Data[] }>;
export interface List {
	sel(
		fields: ListSelField[],
		page: number,
		pageSize: number,
		order: 'ASC' | 'DESC',
		raw?: boolean,
		forceDB?: boolean
	): Promise<PageData>;
	del(delDatas: boolean, onDataRefsNotFound?: () => Promise<any[]>): Promise<void>;
}

//列表缓存
//可以设置列表缓存，把整个列表根据分页和排序缓存
//如果不设置cache的相关配置，则每次查询仅使用查询器selector查询，用于数据结构相同，但是不需要缓存的场景
export interface ListCacheConfig {
	cid: undefined | string;
	listKey: NameKey;
	expireMS?: number;
}
export class CommonList implements List {
	private cid: undefined | string;
	private listKey: string;
	private expireMS: number;
	private cache: Cache;
	private dds: DataDescriptor[];
	private selector: ListSelector;
	private transform: DataTransformer;

	constructor(
		cacheConfig: false | ListCacheConfig,
		dds: DataDescriptor[],
		selector: ListSelector,
		transform?: DataTransformer
	) {
		//设置缓存配置
		if (cacheConfig) {
			this.cid = cacheConfig.cid;
			this.cache = CacheManager.getCache(this.cid);
			this.listKey = this.cache.getKey('list', cacheConfig.listKey.ns, cacheConfig.listKey.nn);
			this.expireMS = cacheConfig.expireMS || CacheManager.defaultExpireMS;
		}
		//
		this.dds = dds;
		this.selector = selector;
		this.transform = transform;
	}
	public async sel(
		fields: ListSelField[],
		page: number,
		pageSize: number,
		order: OrderDefinition = 'ASC',
		raw?: boolean,
		forceDB?: boolean
	): Promise<PageData> {
		//创建IListDataDescriptor结构
		let listdds: ListDataDescriptor[] = [];
		for (let i = 0; i < this.dds.length; i++) {
			listdds.push({ ...this.dds[i], ...(fields ? fields[i] : undefined) });
		}
		//如果没有设置缓存，则直接调用查询器查询数据
		if (!this.cache) {
			let dbDatas = await this.selector(listdds, page, pageSize, order);
			return {
				count: dbDatas.count,
				page,
				pageSize,
				totalPages: pageSize <= 0 ? 1 : Math.ceil(dbDatas.count / pageSize),
				datas: dbDatas.datas,
			};
		}
		//结合缓存进行查询
		let keyPrefix = `${pageSize}.${order}`;
		let countKey = `${keyPrefix}.count`;
		let pageDataKey = `${keyPrefix}.P${page}`;
		//尝试查询缓存
		if (!forceDB) {
			let count = 0;
			let datas: any;
			let lcdata = await this.cache.get(this.listKey, [countKey, pageDataKey]);
			if (lcdata) {
				if (lcdata[countKey] !== null && lcdata[countKey] !== undefined) {
					count = lcdata[countKey];
					if (count === 0) {
						return { count: 0, page, pageSize, totalPages: 0, datas: [] };
					}
				}
				if (lcdata[pageDataKey]) {
					datas = lcdata[pageDataKey];
				}
				if (count && datas) {
					datas = await cgetData(this.cid, datas, listdds, raw === false ? this.transform : undefined);
					if (datas) {
						return {
							count,
							page,
							pageSize,
							totalPages: pageSize <= 0 ? 1 : Math.ceil(count / pageSize),
							datas: datas as any[],
						};
					}
					//
					datas = undefined;
				}
			}
		}
		//通过查询器获取数据
		let dbDatas = await this.selector(listdds, page, pageSize, order);
		//全部写入缓存
		{
			let pl = this.cache.pipeline();
			pl.set(this.listKey, countKey, dbDatas.count);
			//
			let context: any;
			if (dbDatas.count <= 0) {
				pl.set(this.listKey, pageDataKey, `[]`);
			} else {
				context = { data: dbDatas.datas };
				let dataRefs = [];
				for (let i = 0; i < dbDatas.datas.length; i++) {
					let dref = {};
					let data = dbDatas.datas[i];
					let transform = raw === false ? this.transform : undefined;
					cset(pl, context, i, data, listdds, transform, dref, this.expireMS);
					dataRefs.push(dref);
				}
				pl.set(this.listKey, pageDataKey, dataRefs);
			}
			pl.expire(this.listKey, this.expireMS);
			await pl.exec();
			if (context?.ps) await Promise.all(context.ps);
		}
		return {
			count: dbDatas.count,
			page,
			pageSize,
			totalPages: pageSize <= 0 ? 1 : Math.ceil(dbDatas.count / pageSize),
			datas: dbDatas.datas,
		};
	}
	public async del(delDatas: boolean) {
		if (!this.cache) return;
		if (!delDatas) return this.cache.del(this.listKey);
		//
		let pl = this.cache.pipeline();
		let data = await this.cache.get(this.listKey);
		if (data) {
			let dds = [];
			for (let dd of this.dds) {
				dds.push({
					ns: dd.ns,
					nn: dd.nn,
					dataPkField: !dd.as ? dd.pkfield : attachAs(dd.as, dd.pkfield),
				});
			}
			//
			for (let key in data) {
				let drefs = data[key];
				if (!Array.isArray(drefs)) continue;
				for (let dref of drefs) {
					for (let dd of dds) {
						pl.del(this.cache.getKey('data', dd.ns, dd.nn || dref[dd.dataPkField]));
					}
				}
			}
		}
		pl.del(this.listKey);
		//
		return pl.exec();
	}
}

//混合列表套装
export type ListFactory = (listConfig: NameKey & any) => List;
export class ListSet {
	private factory: ListFactory;
	private listMap: { [listName: string]: List } = {};
	private ln: any = (body: any) => this.onTrigger(body);
	private onDelListCache: (key: NameKey, cache: Cache, listKey: string) => any;

	//Setter
	public setFactory(listFactory: ListFactory) {
		this.factory = listFactory;
		return this;
	}
	public setTrigger(...names: string[]) {
		for (let n of names) {
			Trigger.set(n, this.ln);
		}
		return this;
	}
	public setDelListCacheHandler(handler: (key: NameKey, cache: Cache, listKey: string) => any) {
		this.onDelListCache = handler;
		return this;
	}

	//
	private async onTrigger(keys: NameKey | NameKey[]) {
		if (!Array.isArray(keys)) keys = [keys];
		//
		let cache: any;
		for (let key of keys) {
			let id = `${key.ns}:${key.nn}`;
			let list = this.listMap[id];
			if (list) {
				list.del(false);
			} else {
				if (!cache) cache = CacheManager.getCache();
				//
				let listKey = cache.getKey('list', key.ns, key.nn);
				if (this.onDelListCache) {
					this.onDelListCache(key, cache, listKey);
				} else {
					//尝试使用默认的缓存器删除列表文件
					cache.del(listKey);
				}
			}
		}
	}
	//获取列表
	public async sel(
		//确定列表
		listConfig: NameKey & any,
		//查询参数
		fields: ListSelField[],
		page: number,
		pageSize: number,
		order: OrderDefinition = 'ASC',
		raw?: boolean,
		forceDB?: boolean
	): Promise<PageData> {
		let id = `${listConfig.ns}:${listConfig.nn}`;
		let list = this.listMap[id];
		if (!list) {
			//如果是第一次创建列表，强制从数据库中拉取一次数据
			forceDB = true;
			list = this.listMap[id] = this.factory(listConfig);
		}
		return list.sel(fields, page, pageSize, order, raw, forceDB);
	}
	public async del(key: NameKey, delDatas = false, onDataRefsNotFound?: () => Promise<any[]>) {
		let id = `${key.ns}:${key.nn}`;
		let list = this.listMap[id];
		return !list ? undefined : list.del(delDatas, onDataRefsNotFound);
	}
}

/*
//全量列表，一次可以加载全部的列表数据
export class FullList implements IList {
	private cid: string;
	private cache: ICache;
	private key: IListKey;
	private listKey: string;
	private dataOrderField: string;
	private blocks: (IListBlock & IHandledBlock)[];
	private selector: IListSelector;
	private expireMS: number;

	constructor(cid: string, key: IListKey, dataOrderField: string, blocks: IListBlock[], selector: IListSelector, expireMS?: number) {
		this.cid = cid;
		this.cache = CacheManager.getCache(this.cid);
		this.key = key;
		this.listKey = getListKey(key);
		this.dataOrderField = dataOrderField;
		for (let block of blocks) {
			handleBlock(block);
		}
		this.blocks = blocks as any;
		this.selector = selector;
		this.expireMS = expireMS;
	}
	//获取数据
	public async sel(page: number, pageSize: number = 0, order: 'ASC' | 'DESC' = 'ASC'): Promise<IListData> {
		let start = 0;
		let end = -1;
		if (pageSize > 0) {
			start = (page - 1) * pageSize;
			end = start + pageSize - 1;
		}
		//
		let totalPages: number = 1;
		let count = await this.cache.lcount(this.listKey);
		if (count > 0) {
			//如果有数据
			if (pageSize > 0) {
				totalPages = Math.ceil(count / pageSize);
				// 超过范围了
				if (count <= start) {
					return { count, page, pageSize, totalPages, datas: [] };
				}
				if (end >= count) {
					end = count - 1;
				}
			}
			//从Redis中读取列表格式的数据
			let dataRefs = await this.cache.lrange(this.listKey, order, start, end);
			if (dataRefs && dataRefs.length > 0) {
				//如果是空列表
				if (dataRefs[0] === '{}') {
					return { count: 0, page, pageSize, totalPages: 0, datas: [] };
				}
				//从缓存中读取数据
				let { datas, corrupted } = await cgetDatas(this.cache, dataRefs, this.blocks, false);
				if (!corrupted) {
					return { count, page, pageSize, totalPages, datas };
				}
			}
		}
		//执行到这里，需要通过调用数据库获取数据
		let listData = await this.selector(page, 0, 'ASC', this.blocks);
		//全部写入缓存
		let pl = this.cache.pipeline();
		if (!listData || listData.datas.length <= 0) {
			pl.ladd(this.listKey, 1, '{}');
		} else {
			for (let data of listData.datas) {
				let dataRef = {};
				cset(pl, data, this.blocks, this.expireMS, dataRef);
				pl.ladd(this.listKey, data[this.dataOrderField], JSON.stringify(dataRef));
			}
		}
		pl.expire(this.listKey, this.expireMS);
		await pl.exec();
		//计算要返回的数据
		if (pageSize > 0 && listData.datas.length > 0) {
			listData.datas = listData.datas.slice(start, end + 1);
		}
		return getListData(listData.count, page, pageSize, listData.datas);
	}
	//清空列表
	public async del(delDatas: boolean, onDataRefsNotFound?: () => Promise<IData[]>) {
		if (!delDatas) {
			return this.cache.del(this.listKey);
		}
		//
		let pl = this.cache.pipeline();
		let dataRefs = await this.cache.lrange(this.listKey, 'ASC', 0, -1);
		if (dataRefs && dataRefs.length > 0) {
			for (let df of dataRefs) {
				if (df === '{}') continue;
				//
				let dataRef = JSON.parse(df);
				for (let block of this.blocks) {
					pl.del(getKeyByDataPkField(block, dataRef));
				}
			}
		} else if (onDataRefsNotFound) {
			let dataRefs = await onDataRefsNotFound();
			if (dataRefs && dataRefs.length > 0) {
				for (let dataRef of dataRefs) {
					for (let block of this.blocks) {
						pl.del(getKeyByDataPkField(block, dataRef));
					}
				}
			}
		}
		pl.del(this.listKey);
		//
		return pl.exec();
	}
}
*/
