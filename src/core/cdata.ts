import { IFields, attachAs, cutAs, hasAs, pickFields } from './fields';
import { CacheManager, ICache, ICachePipeline } from './cache';

//interfaces
export interface IData {
	[dataField: string]: any;
}
export interface IDataKey {
	ns: string;
	pkfield: string;
}
export interface IDataStructDescriptor extends IDataKey, IFields {
	//
}
// export interface IDataCorruptedInfo {
// 	indexes: { [index: number | string]: IData };
// 	pkfields: { [dataPkField: string]: any[] };
// }

//核心方法
export interface IHandledStructDescriptor extends IDataStructDescriptor {
	__handled: boolean;
	//as转换器
	nas?: { [f: string]: string | false };
	dataPkField: string;
	//要去除的字段
	dfieldMap?: { [f: string]: boolean };
}
export function handleStructDescriptor(sd: any): IHandledStructDescriptor {
	sd.__handled = true;
	//
	if (!sd.as) {
		sd.dataPkField = sd.pkfield;
	} else {
		sd.nas = {};
		sd.dataPkField = sd.nas[sd.pkfield] = attachAs(sd.as, sd.pkfield);
	}
	//
	if (sd.fields) sd.neededFields = pickFields(sd);
	if (sd.neededFields) sd.dfieldMap = {};
	//
	return sd;
}
function getPipeline(pl: undefined | string | ICache | ICachePipeline) {
	if (!pl) {
		return CacheManager.pipeline(CacheManager.defaultCID);
	} else if (typeof pl === 'string') {
		return CacheManager.pipeline(pl);
	} else if ((pl as ICache).pipeline) {
		return (pl as ICache).pipeline();
	}
	return pl as ICachePipeline;
}

//
export function cget(
	pl: ICachePipeline,
	store: { data: IData | IData[] },
	index: number,
	data: IData,
	sds: IDataStructDescriptor[]
	//
) {
	//设置store
	if (index === undefined) {
		store.data = data;
	} else {
		((store.data || (store.data = [])) as any)[index] = data;
	}
	//读取缓存
	for (let sd of sds) {
		let hsd = sd as IHandledStructDescriptor;
		if (!hsd.__handled) {
			handleStructDescriptor(hsd);
		}
		//
		let key = pl.getCache().getKey('data', hsd.ns, data[hsd.dataPkField]);
		let { as, pkfield, neededFields } = hsd;
		let { nas, dataPkField, dfieldMap } = hsd;
		pl.get(key, neededFields, (err: Error, values: any, valueConvetor: any) => {
			if (!store.data) return;
			//
			let done = true;
			if (err || !values) done = false;
			else {
				let fn = (field: string, value: any) => {
					value = !valueConvetor ? value : valueConvetor(value);
					if (value === undefined) {
						return false;
					}
					//
					let dataField: string;
					if (!nas) {
						dataField = field;
					} else {
						dataField = nas[field] || (nas[field] = attachAs(as, field));
					}
					data[dataField] = value;
					//
					return true;
				};
				if (Array.isArray(values)) {
					for (let k = 0; k < neededFields.length; k++) {
						if (!fn(neededFields[k], values[k])) {
							done = false;
							break;
						}
					}
				} else {
					for (let f in values) {
						if (!fn(f, values[f])) {
							done = false;
							break;
						}
					}
				}
			}
			if (!done) {
				delete store.data;
				// if (result.corruptedInfo) {
				// 	result.corruptedInfo.indexes[index] = data;
				// 	if (!result.corruptedInfo.pkfields[dataPkField]) result.corruptedInfo.pkfields[dataPkField] = [];
				// 	result.corruptedInfo.pkfields[dataPkField].push(data[dataPkField]);
				// }
				return;
			}
			//只有pkfield可能不在需要的字段列表里
			//在get方法里，nas使用了pkfield做key,所以在dfields中也使用pkfield做key
			if (neededFields && dfieldMap[pkfield] !== false) {
				if (dfieldMap[pkfield]) {
					//去除
					delete data[dataPkField];
				} else if (neededFields.indexOf(pkfield) < 0) {
					//去除
					dfieldMap[pkfield] = true;
					delete data[dataPkField];
				} else {
					//标记
					dfieldMap[pkfield] = false;
				}
			}
		});
	}
}
export async function cgetData(
	cid: undefined | string | ICache | ICachePipeline,
	data: IData | IData[],
	sds: IDataStructDescriptor[]
	//
) {
	let pl = getPipeline(cid);
	if (!pl) return;
	//
	let store = { data };
	if (!Array.isArray(data)) {
		cget(pl, store, undefined, data, sds);
	} else {
		for (let i = 0; i < data.length; i++) {
			cget(pl, store, i, data[i], sds);
		}
	}
	await pl.exec();
	//
	return store.data;
}

//set
export function cset(
	pl: ICachePipeline,
	data: IData,
	sds: IDataStructDescriptor[],
	expireMS?: number,
	dataRefs?: { [dataPkField: string]: any }
) {
	for (let sd of sds) {
		let hsd = sd as IHandledStructDescriptor;
		if (!hsd.__handled) {
			handleStructDescriptor(hsd);
		}
		//
		let key = pl.getCache().getKey('data', hsd.ns, data[hsd.dataPkField]);
		let { as, neededFields } = hsd;
		let { nas, dataPkField, dfieldMap } = hsd;
		//放在前面设置，后面可能会删除字段
		if (dataRefs) {
			dataRefs[dataPkField] = data[dataPkField];
		}
		//{ a_uuid:'1', b_uuid:'2' }
		for (let dataField in data) {
			//判断字段是否属于当前的block
			//因为多个Struct中可能有相同名字的字段
			//所以只能遍历所有的DataField从而挑选出属于当前Struct的字段
			//如果不属于当前Struct，则标记为false
			let field: string;
			{
				if (!nas) {
					//不需要转换
					field = dataField;
				} else if (nas[dataField] === false) {
					//不属于当前sd
					continue;
				} else {
					if (nas[dataField]) {
						//转换
						field = nas[dataField] as string;
					} else if (hasAs(as, dataField)) {
						//转换
						field = nas[dataField] = cutAs(as, dataField);
					} else {
						//标记不属于当前sd
						nas[dataField] = false;
						continue;
					}
				}
			}
			pl.set(key, field, data[dataField]);
			//如果需要返回ndata，去除无用的字段
			if (neededFields && dfieldMap[dataField] !== false) {
				if (dfieldMap[dataField]) {
					//去除
					delete data[dataField];
				} else if (neededFields.indexOf(field) < 0) {
					//去除
					dfieldMap[dataField] = true;
					delete data[dataField];
				} else {
					//标记
					dfieldMap[dataField] = false;
				}
			}
		}
		//
		pl.expire(key, expireMS || CacheManager.defaultExpireMS);
		//
		//console.log('set', hsd);
	}
}
export async function csetData(
	cid: undefined | string | ICache | ICachePipeline,
	data: IData | IData[],
	sds: IDataStructDescriptor[],
	expireMS?: number
): Promise<IData | IData[]> {
	//
	if (!Array.isArray(data)) {
		let pl = getPipeline(cid);
		if (pl) {
			cset(pl, data, sds, expireMS);
			await pl.exec();
		}
	} else if (data.length > 0) {
		let pl = getPipeline(cid);
		if (pl) {
			for (let d of data) {
				cset(pl, d, sds, expireMS);
			}
			await pl.exec();
		}
	}
	return data;
}

/**
 * 查询存在
 */
export async function cexists(cid: undefined | string, key: string | { prefix?: string; ns: string; pk: string }) {
	let cache = CacheManager.getCache(cid || CacheManager.defaultCID);
	if (cache) {
		if (typeof key === 'string') {
			return cache.exists(key);
		} else {
			return cache.exists(cache.getKey(key.prefix || 'data', key.ns, key.pk));
		}
	}
	return false;
}

/**
 * 删除
 */
export async function cdel(cid: undefined | string, key: string | { prefix?: string; ns: string; pk: string }) {
	let cache = CacheManager.getCache(cid || CacheManager.defaultCID);
	if (cache) {
		if (typeof key === 'string') {
			return cache.del(key);
		} else {
			return cache.del(cache.getKey(key.prefix || 'data', key.ns, key.pk));
		}
	}
}

/**
 * 延长过期时间
 */
export async function cexpire(
	cid: undefined | string,
	key: string | { prefix?: string; ns: string; pk: string },
	ms: number
) {
	let cache = CacheManager.getCache(cid || CacheManager.defaultCID);
	if (cache) {
		if (typeof key === 'string') {
			cache.expire(key, ms);
		} else {
			return cache.expire(cache.getKey(key.prefix || 'data', key.ns, key.pk), ms);
		}
	}
}
