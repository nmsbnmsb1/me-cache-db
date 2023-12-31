import { ISqlOptions } from './core/db';
import { IDataStructDescriptor, IHandledStructDescriptor, handleStructDescriptor, cgetData, cset, IData } from './core/cdata';
import { CacheManager, ICache } from './core/cache';
import { Trigger } from './trigger';

//List查询器
export interface IListKey {
	ns: string;
	listName: string;
}
export interface IListDataStructDescriptor extends IDataStructDescriptor, ISqlOptions {}
export interface IListPageData {
	count: number;
	page: number;
	pageSize: number;
	totalPages: number;
	datas: IData[];
}
export type IListSelector = (
	page: number,
	pageSize: number,
	order: 'ASC' | 'DESC',
	sds: IListDataStructDescriptor[]
) => Promise<{ count: number; datas: IData[] }>;
export interface IList {
	sel(page: number, pageSize: number, order: 'ASC' | 'DESC'): Promise<IListPageData>;
	del(delDatas: boolean, onDataRefsNotFound?: () => Promise<any[]>): Promise<void>;
}

function getListData(count: number, page: number, pageSize: number, datas: any) {
	return { count, page, pageSize, totalPages: pageSize <= 0 ? 1 : Math.ceil(count / pageSize), datas };
}

//列表
export class List implements IList {
	private cid: undefined | string;
	private cache: ICache;
	private key: IListKey;
	private listKey: string;
	private sds: (IListDataStructDescriptor & IHandledStructDescriptor)[];
	private selector: IListSelector;
	private expireMS: number;

	constructor(cid: undefined | string, key: IListKey, sds: IListDataStructDescriptor[], selector: IListSelector, expireMS?: number) {
		this.cid = cid;
		this.cache = CacheManager.getCache(this.cid);
		this.key = key;
		this.listKey = this.cache.getKey('list', key.ns, key.listName);
		for (let sd of sds) {
			handleStructDescriptor(sd);
		}
		this.sds = sds as any;
		this.selector = selector;
		this.expireMS = expireMS || CacheManager.defaultExpireMS;
	}
	public async sel(page: number, pageSize: number, order: 'ASC' | 'DESC' = 'ASC'): Promise<IListPageData> {
		let keyPrefix = `${pageSize}.${order}`;
		let countKey = `${keyPrefix}.count`;
		let pageDataKey = `${keyPrefix}.P${page}`;
		//
		let count = 0;
		let dataRefs;
		let lcdata = await this.cache.get(this.listKey, [countKey, pageDataKey]);
		if (lcdata) {
			if (lcdata[countKey] !== null && lcdata[countKey] !== undefined) {
				count = lcdata[countKey];
				if (count === 0) {
					return { count: 0, page, pageSize, totalPages: 0, datas: [] };
				}
			}
			if (lcdata[pageDataKey]) {
				dataRefs = JSON.parse(lcdata[pageDataKey]);
			}
			if (count && dataRefs) {
				let datas = await cgetData(this.cid, dataRefs, this.sds);
				if (datas) {
					return getListData(count, page, pageSize, datas);
				}
			}
		}
		//运行到这里需要调用selector
		//执行到这里，需要通过调用数据库获取数据
		let data = await this.selector(page, pageSize, order, this.sds);
		//全部写入缓存
		let pl = this.cache.pipeline();
		pl.set(this.listKey, countKey, data.count);
		//
		if (data.count > 0) {
			dataRefs = [];
			for (let i = 0; i < data.datas.length; i++) {
				let dataRef = {};
				cset(pl, data.datas[i], this.sds, this.expireMS, dataRef);
				dataRefs.push(dataRef);
			}
			pl.set(this.listKey, pageDataKey, JSON.stringify(dataRefs));
		} else {
			pl.set(this.listKey, pageDataKey, `[]`);
		}
		pl.expire(this.listKey, this.expireMS);
		pl.exec();
		//
		return getListData(data.count, page, pageSize, data.datas);
	}
	public async del(delDatas: boolean) {
		if (!delDatas) {
			return this.cache.del(this.listKey);
		}
		//
		let pl = this.cache.pipeline();
		let data = await this.cache.get(this.listKey);
		if (data) {
			for (let key in data) {
				let val = data[key];
				if (!(typeof val === 'string' && val.startsWith('[{'))) continue;
				//
				let dataRefs = JSON.parse(val);
				for (let dataRef of dataRefs) {
					for (let sd of this.sds) {
						pl.del(this.cache.getKey('data', sd.ns, dataRef[sd.dataPkField]));
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
export type IListFactory = (where: any, key: IListKey, sds: IListDataStructDescriptor[], expire: number) => IList;
export type IListNameParser = (where: any) => string;
export class ListSet {
	private baseKey: IListKey;
	private sds: IListDataStructDescriptor[];
	private nameParser: IListNameParser;
	private factory: IListFactory;
	private listMap: { [listName: string]: IList };
	private expireMS: number;

	constructor(
		baseKey: string | { prefix?: string; ns: string },
		sds: IListDataStructDescriptor[],
		listNameParser: IListNameParser,
		listFactory: IListFactory,
		expireMS?: number
	) {
		this.baseKey = (typeof baseKey === 'string' ? { ns: baseKey } : baseKey) as any;
		this.sds = sds;
		this.nameParser = listNameParser;
		this.factory = listFactory;
		this.listMap = {};
		this.expireMS = expireMS || CacheManager.defaultExpireMS;
	}

	//获取列表
	public async sel(where: any, page: number, pageSize: number = 0, order: 'ASC' | 'DESC' = 'ASC'): Promise<IListPageData> {
		let listName = this.nameParser(where);
		let list = this.listMap[listName];
		if (!list) {
			list = this.listMap[listName] = this.factory(where, { ...this.baseKey, listName }, this.sds, this.expireMS);
		}
		return list.sel(page, pageSize, order);
	}

	public async del(where: any, delDatas: boolean = false, onDataRefsNotFound?: () => Promise<any[]>) {
		let listName = this.nameParser(where);
		let list = this.listMap[listName];
		if (!list) return;
		return list.del(delDatas, onDataRefsNotFound);
	}

	//trigger
	public setTrigger(names: string | string[]) {
		if (typeof names === 'string') {
			Trigger.set(names, this.onTrigger);
		} else {
			for (let n of names) {
				Trigger.set(n, this.onTrigger);
			}
		}
		return this;
	}
	private async onTrigger(where: any) {
		let listName = this.nameParser(where);
		let list = this.listMap[listName];
		if (!list) return;
		return list.del(false);
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
