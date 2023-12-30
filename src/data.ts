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
	data: any,
	updater: (data: any) => Promise<number>,
	keys: (IDataKey & { pk: string })[]
	//
) {
	let success = false;
	try {
		success = (await updater(data)) > 0;
	} catch (e) {}
	//如果成功，删除key
	if (success) {
		for (let k of keys) {
			cdel(cid, { ...k, pk: k.pk || data[k.pkfield] });
		}
	}
	return success;
}

//del
export async function del(
	cid: undefined | string,
	data: any,
	deleter: (data: any) => Promise<number>,
	keys: (IDataKey & { pk: string })[]
	//
) {
	let success = false;
	try {
		success = (await deleter(data)) > 0;
	} catch (e) {}
	//
	if (success) {
		for (let k of keys) {
			cdel(cid, { ...k, pk: k.pk || data[k.pkfield] });
		}
	}
	return success;
}
