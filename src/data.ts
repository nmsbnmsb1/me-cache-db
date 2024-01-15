import { CacheManager } from './core/cache';
import { IDataStructDescriptor, IDataKey, cdel, cgetData, csetData, IData } from './core/cdata';

//--------------------数据操作--------------------
//select
export async function sel(
	cid: undefined | string,
	data: IData | IData[],
	sds: IDataStructDescriptor[],
	selector: () => Promise<IData | IData[]>,
	forceDB?: boolean,
	expireMS?: number
) {
	let ndata: IData | IData[];
	//先尝试从缓存中获取数据
	if (!forceDB) {
		ndata = await cgetData(cid, data, sds);
	}
	//
	if (!ndata) {
		//从数据库中sel
		ndata = await selector();
		if (ndata) {
			csetData(cid, ndata, sds, expireMS);
		}
	}
	//
	return ndata;
}

//update
export async function update(
	cid: undefined | string,
	data: IData | IData[],
	sd: IDataStructDescriptor,
	updater: (data?: any) => Promise<boolean>,
	expireMS?: number
	//
) {
	try {
		await updater(data);
	} catch (e) {
		throw e;
	}
	//如果更新成功，更新缓存
	await csetData(cid, data, [sd], expireMS);
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
