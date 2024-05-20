import { CacheManager } from './core/cache';
import { IDataDescriptor, cdel, cgetData, cset, csetData, IData, DataTransformer } from './core/cdata';
import { IDataKey } from './core/keys';

//--------------------数据操作--------------------
//select
export async function sel(
	cid: undefined | string,
	data: IData | IData[],
	dds: IDataDescriptor[],
	selector: () => Promise<IData | IData[]>,
	transform?: DataTransformer,
	forceDB?: boolean,
	expireMS?: number
) {
	let ndata: any;
	//先尝试从缓存中获取数据
	if (!forceDB) {
		ndata = await cgetData(cid, data, dds, transform);
	}
	//
	if (!ndata) {
		//从数据库中sel
		ndata = await selector();
		if (ndata && (!Array.isArray(ndata) || ndata.length > 0)) {
			ndata = await csetData(cid, ndata, dds, transform, expireMS);
		}
	}
	return ndata;
}

//select in
export async function selIn(
	cid: undefined | string,
	pkfield: string,
	pkvalues: any[],
	dd: IDataDescriptor,
	selector: () => Promise<IData[]>,
	transform?: DataTransformer,
	forceDB?: boolean,
	expireMS?: number
) {
	let datas = [];
	for (let v of pkvalues) {
		datas.push({ [pkfield]: v });
	}
	return sel(cid, datas, [dd], selector, transform, forceDB, expireMS);
}

//update
export async function update(
	cid: undefined | string,
	data: IData | IData[],
	dd: IDataDescriptor,
	updater: (data?: any) => Promise<any>,
	handleCache: 'update' | 'del' = 'del',
	expireMS?: number
) {
	try {
		await updater(data);
	} catch (e) {
		throw e;
	}
	//如果更新成功，更新缓存
	let cache = CacheManager.getCache(cid);
	if (!cache) return data;
	//如果是更新缓存
	if (handleCache === 'update') {
		let context = { data };
		let dds = [dd];
		let pl;
		if (!Array.isArray(data)) {
			//先判断key是否存在
			if (await cache.exists(cache.getKey('data', dd.ns, dd.nn || data[dd.pkfield]))) {
				if (!pl) pl = cache.pipeline();
				cset(pl, context, undefined, data, dds, undefined, undefined, expireMS);
			}
		} else {
			for (let i = 0; i < data.length; i++) {
				//先判断key是否存在
				if (await cache.exists(cache.getKey('data', dd.ns, dd.nn || data[i][dd.pkfield]))) {
					if (!pl) pl = cache.pipeline();
					cset(pl, context, i, data[i], dds, undefined, undefined, expireMS);
				}
			}
		}
		if (pl) pl.exec();
	} else {
		if (!Array.isArray(data)) {
			cdel(cid, { prefix: 'data', ns: dd.ns, nn: dd.nn || data[dd.pkfield] });
		} else {
			let pl = cache.pipeline();
			for (let d of data) {
				pl.del(cache.getKey('data', dd.ns, dd.nn || d[dd.pkfield]));
			}
			pl.exec();
		}
	}
	return data;
}

//del
export async function del(
	cid: undefined | string,
	data: IData | IData[],
	key: IDataKey,
	deleter: (data: any) => Promise<boolean>
	//
) {
	try {
		await deleter(data);
	} catch (e) {
		throw e;
	}
	//
	if (!Array.isArray(data)) {
		cdel(cid, { ...key, nn: key.nn || data[key.pkfield] });
	} else {
		let cache = CacheManager.getCache(cid);
		if (cache) {
			let pl = cache.pipeline();
			for (let d of data) {
				pl.del(cache.getKey('data', key.ns, key.nn || d[key.pkfield]));
			}
			pl.exec();
		}
	}
}
