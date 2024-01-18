import { CacheManager } from './core/cache';
import { IDataStructDescriptor, IDataKey, cdel, cgetData, cset, csetData, IData, DataTransformer } from './core/cdata';

//--------------------数据操作--------------------
//select
export async function sel(
	cid: undefined | string,
	data: IData | IData[],
	sds: IDataStructDescriptor[],
	selector: () => Promise<IData | IData[]>,
	transform: boolean | DataTransformer = false,
	forceDB?: boolean,
	expireMS?: number
) {
	let ndata: any;
	//先尝试从缓存中获取数据
	if (!forceDB) {
		ndata = await cgetData(cid, data, sds, transform);
	}
	//
	if (!ndata) {
		//从数据库中sel
		ndata = await selector();
		if (ndata) {
			ndata = await csetData(cid, ndata, sds, transform, expireMS);
		}
	}
	//
	return ndata;
}

//select in
export async function selIn(
	cid: undefined | string,
	pkfield: string,
	pkvalues: any[],
	sd: IDataStructDescriptor,
	selector: () => Promise<IData[]>,
	transform: boolean | DataTransformer = false,
	forceDB?: boolean,
	expireMS?: number
) {
	let datas = [];
	for (let v of pkvalues) {
		datas.push({ [pkfield]: v });
	}
	return sel(cid, datas, [sd], selector, transform, forceDB, expireMS);
}

//update
export async function update(
	cid: undefined | string,
	data: IData | IData[],
	sd: IDataStructDescriptor,
	updater: (data?: any) => Promise<boolean>,
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
	if (!cache) return;
	//如果是更新缓存
	if (handleCache === 'update') {
		let context = { data };
		let sds = [sd];
		if (!Array.isArray(data)) {
			//先判断key是否存在
			if (await cache.exists(cache.getKey('data', sd.ns, data[sd.pkfield]))) {
				cset(cache.pipeline(), context, undefined, data, sds, false, undefined, expireMS);
			}
		} else {
			let pl = cache.pipeline();
			for (let i = 0; i < data.length; i++) {
				//先判断key是否存在
				if (await cache.exists(cache.getKey('data', sd.ns, data[i][sd.pkfield]))) {
					cset(pl, context, i, data[i], sds, false, undefined, expireMS);
				}
			}
		}
	} else {
		if (!Array.isArray(data)) {
			cdel(cid, { prefix: 'data', ns: sd.ns, pk: data[sd.pkfield] });
		} else {
			let pl = cache.pipeline();
			for (let d of data) {
				pl.del(cache.getKey('data', sd.ns, d[sd.pkfield]));
			}
			pl.exec();
		}
	}
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
		cdel(cid, { ...key, pk: data[key.pkfield] });
	} else {
		let cache = CacheManager.getCache(cid);
		if (cache) {
			let pl = cache.pipeline();
			for (let d of data) {
				pl.del(cache.getKey('data', key.ns, d[key.pkfield]));
			}
			pl.exec();
		}
	}
}
