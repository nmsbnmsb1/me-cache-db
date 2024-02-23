import { INameKey } from './core/key';
import { IFields, attachAs } from './core/fields';
import { IPageData, ISqlOptions } from './core/db';
import { CacheManager, ICache } from './core/cache';
import { IDataDescriptor, cgetData, cset, IData, DataTransformer } from './core/cdata';
import { Trigger } from './trigger';

//List查询器
export interface IListDataDescriptor extends IDataDescriptor, Partial<ISqlOptions> {}
export type IListSelector = (
	page: number,
	pageSize: number,
	order: 'ASC' | 'DESC',
	ldds: IListDataDescriptor[]
) => Promise<{ count: number; datas: IData[] }>;
export interface IList {
	sel(
		page: number,
		pageSize: number,
		order: 'ASC' | 'DESC',
		fields?: IFields[],
		raw?: boolean,
		forceDB?: boolean
	): Promise<IPageData>;
	del(delDatas: boolean, onDataRefsNotFound?: () => Promise<any[]>): Promise<void>;
}

//列表
export class List implements IList {
	private cid: undefined | string;
	private cache: ICache;
	private key: INameKey;
	private listKey: string;
	private ldds: IListDataDescriptor[];
	private selector: IListSelector;
	private transform: DataTransformer;
	private expireMS: number;

	constructor(
		cid: undefined | string,
		key: INameKey,
		ldds: IListDataDescriptor[],
		selector: IListSelector,
		transform?: DataTransformer,
		expireMS?: number
	) {
		this.cid = cid;
		this.cache = CacheManager.getCache(this.cid);
		this.key = key;
		this.listKey = this.cache.getKey('list', key.ns, key.nn);
		this.ldds = ldds;
		this.selector = selector;
		this.transform = transform;
		this.expireMS = expireMS || CacheManager.defaultExpireMS;
	}
	public async sel(
		page: number,
		pageSize: number,
		order: 'ASC' | 'DESC' = 'ASC',
		fields?: IFields[],
		raw?: boolean,
		forceDB?: boolean
	): Promise<IPageData> {
		let keyPrefix = `${pageSize}.${order}`;
		let countKey = `${keyPrefix}.count`;
		let pageDataKey = `${keyPrefix}.P${page}`;
		//
		let count = 0;
		let datas;
		//创建新的sds结构，防止多次调用使用同一个对象
		let ldds = [];
		for (let i = 0; i < this.ldds.length; i++) {
			ldds.push({ ...this.ldds[i], ...(fields ? fields[i] : undefined) });
		}
		//
		if (!forceDB) {
			//尝试查询缓存
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
					datas = await cgetData(this.cid, datas, ldds, raw === false ? this.transform : undefined);
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
		//执行到这里，需要通过调用数据库获取数据
		let pageData = await this.selector(page, pageSize, order, ldds);
		//全部写入缓存
		let pl = this.cache.pipeline();
		pl.set(this.listKey, countKey, pageData.count);
		//
		let context: any;
		if (pageData.count <= 0) {
			pl.set(this.listKey, pageDataKey, `[]`);
		} else {
			context = { data: pageData.datas };
			let dataRefs = [];
			for (let i = 0; i < pageData.datas.length; i++) {
				let dref = {};
				cset(pl, context, i, pageData.datas[i], ldds, raw === false ? this.transform : undefined, dref, this.expireMS);
				dataRefs.push(dref);
			}
			pl.set(this.listKey, pageDataKey, dataRefs);
		}
		pl.expire(this.listKey, this.expireMS);
		await pl.exec();
		if (context?.ps) {
			await Promise.all(context.ps);
		}
		//
		return {
			count: pageData.count,
			page,
			pageSize,
			totalPages: pageSize <= 0 ? 1 : Math.ceil(pageData.count / pageSize),
			datas: pageData.datas,
		};
	}
	public async del(delDatas: boolean) {
		if (!delDatas) {
			return this.cache.del(this.listKey);
		}
		//
		let pl = this.cache.pipeline();
		let data = await this.cache.get(this.listKey);
		if (data) {
			let ldds = [];
			for (let ldd of this.ldds) {
				ldds.push({ ns: ldd.ns, nn: ldd.nn, dataPkField: !ldd.as ? ldd.pkfield : attachAs(ldd.as, ldd.pkfield) });
			}
			//
			for (let key in data) {
				let drefs = data[key];
				if (!Array.isArray(drefs)) continue;
				for (let dref of drefs) {
					for (let ldd of ldds) {
						pl.del(this.cache.getKey('data', ldd.ns, ldd.nn || dref[ldd.dataPkField]));
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
export type IListFactory = (where: INameKey | any) => IList;
export class ListSet {
	private factory: IListFactory;
	private listMap: { [listName: string]: IList };

	constructor(listFactory: IListFactory) {
		this.factory = listFactory;
		this.listMap = {};
	}

	//获取列表
	public async sel(
		where: INameKey | any,
		page: number,
		pageSize: number = 0,
		order: 'ASC' | 'DESC' = 'ASC',
		fields?: IFields[],
		raw?: boolean,
		forceDB?: boolean
	): Promise<IPageData> {
		let id = `${where.ns}:${where.nn}`;
		let list = this.listMap[id] || (this.listMap[id] = this.factory(where));
		return list.sel(page, pageSize, order, fields, raw, forceDB);
	}

	public async del(key: INameKey, delDatas: boolean = false, onDataRefsNotFound?: () => Promise<any[]>) {
		let id = `${key.ns}:${key.nn}`;
		let list = this.listMap[id];
		return !list ? undefined : list.del(delDatas, onDataRefsNotFound);
	}

	//trigger
	public setTrigger(names: string | string[]) {
		let ln = (body: any) => this.onTrigger(body);
		if (typeof names === 'string') {
			Trigger.set(names, ln);
		} else {
			for (let n of names) {
				Trigger.set(n, ln);
			}
		}
		return this;
	}
	private async onTrigger(keys: INameKey | INameKey[]) {
		if (!Array.isArray(keys)) keys = [keys];
		//
		let cache: any;
		for (let key of keys) {
			let id = `${key.ns}:${key.nn}`;
			let list = this.listMap[id];
			if (list) {
				list.del(false);
			} else {
				//TODO
				//尝试使用默认的缓存起删除列表文件
				if (!cache) cache = CacheManager.getCache();
				await cache.del(cache.getKey('list', key.ns, key.nn));
			}
		}
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
