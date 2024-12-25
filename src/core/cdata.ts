import { type FieldsOptions, attachAs, cutAs, hasAs, pickFields } from './fields';
import { CacheManager, type Cache, type CachePipeline } from './cache';
import type { DataKey } from './keys';

//interfaces
export interface Data {
	[dataField: string]: any;
}
export interface DataDescriptor extends DataKey, FieldsOptions {}
interface HandledDataDescriptor extends DataDescriptor {
	__handled: boolean;
	//
	fieldsNeeded?: string[];
	//as转换器
	nas?: { [f: string]: string | false };
	dataPkField?: string;
	//要去除的字段
	dfieldMap?: { [f: string]: boolean };
}
function handleData(dd: DataDescriptor & HandledDataDescriptor): HandledDataDescriptor {
	dd.__handled = true;
	//
	if (!dd.as) {
		if (dd.pkfield) {
			dd.dataPkField = dd.pkfield;
		}
	} else {
		dd.nas = {};
		if (dd.pkfield) {
			dd.dataPkField = dd.nas[dd.pkfield] = attachAs(dd.as, dd.pkfield);
		}
	}
	//
	if (dd.fields) dd.fieldsNeeded = pickFields(dd.fields);
	if (dd.fieldsNeeded) dd.dfieldMap = {};
	//
	return dd;
}
function getPipeline(pl: undefined | string | Cache | CachePipeline) {
	if (!pl) {
		return CacheManager.pipeline(CacheManager.defaultCID);
	}
	if (typeof pl === 'string') {
		return CacheManager.pipeline(pl);
	}
	if ((pl as Cache).pipeline) {
		return (pl as Cache).pipeline();
	}
	return pl as CachePipeline;
}
export type DataTransformer = (data: Data) => any | Promise<any>;
// export interface IDataCorruptedInfo {
// 	indexes: { [index: number | string]: IData };
// 	pkfields: { [dataPkField: string]: any[] };
// }

//
export function cget(
	pl: CachePipeline,
	context: { done?: boolean; data: any; ps?: Promise<any>[] },
	index: undefined | number | string,
	data: Data,
	dds: DataDescriptor[],
	transform?: DataTransformer
) {
	let readCount = 0;
	for (let dd of dds) {
		let hdd = dd as HandledDataDescriptor;
		if (!hdd.__handled) handleData(hdd);
		//
		let key = pl.getCache().getKey('data', hdd.ns, hdd.nn || data[hdd.dataPkField]);
		let { as, pkfield, fieldsNeeded } = hdd;
		let { nas, dataPkField, dfieldMap } = hdd;
		pl.get(key, fieldsNeeded, (err: Error, values: any, valueConvetor: any) => {
			//如果群组出错了，则直接退出
			if (context.done === false) return;
			//解析缓存数据
			let readDone: boolean = undefined;
			if (err || !values) readDone = false;
			else {
				let fn = (field: string, value: any) => {
					value = !valueConvetor ? value : valueConvetor(value);
					if (value === undefined) return false;
					//转换data字段
					let dataField: string;
					if (!nas) {
						dataField = field;
					} else {
						dataField = nas[field] || (nas[field] = attachAs(as, field));
					}
					data[dataField] = value;
					return true;
				};
				if (Array.isArray(values)) {
					for (let k = 0; k < fieldsNeeded.length; k++) {
						if (!fn(fieldsNeeded[k], values[k])) {
							readDone = false;
							break;
						}
					}
				} else {
					for (let f in values) {
						if (!fn(f, values[f])) {
							readDone = false;
							break;
						}
					}
				}
			}
			if (readDone === false) {
				context.done = false;
				// if (result.corruptedInfo) {
				// 	result.corruptedInfo.indexes[index] = data;
				// 	if (!result.corruptedInfo.pkfields[dataPkField]) result.corruptedInfo.pkfields[dataPkField] = [];
				// 	result.corruptedInfo.pkfields[dataPkField].push(data[dataPkField]);
				// }
				return;
			}
			//只有pkfield可能不在需要的字段列表里
			//在get方法里，nas使用了pkfield做key,所以在dfields中也使用pkfield做key
			if (pkfield && fieldsNeeded && dfieldMap[pkfield] !== false) {
				if (dfieldMap[pkfield]) {
					//去除
					delete data[dataPkField];
				} else if (fieldsNeeded.indexOf(pkfield) < 0) {
					//去除
					dfieldMap[pkfield] = true;
					delete data[dataPkField];
				} else {
					//标记
					dfieldMap[pkfield] = false;
				}
			}
			//
			readCount++;
			if (readCount >= dds.length) {
				let ndata = !transform ? data : (transform as DataTransformer)(data);
				//如果result不是Priomise
				if (!ndata.then) {
					index === undefined ? (context.data = ndata) : (context.data[index] = ndata);
				} else {
					(context.ps || (context.ps = [])).push(
						ndata.then((ndata: any) => (index === undefined ? (context.data = ndata) : (context.data[index] = ndata)))
					);
				}
			}
		});
	}
}
export async function cgetData(
	cid: undefined | string | Cache | CachePipeline,
	data: Data | Data[],
	dds: DataDescriptor[],
	transform?: DataTransformer
): Promise<any> {
	let pl = getPipeline(cid);
	if (!pl) return;
	//
	let context: any = { data };
	if (!Array.isArray(data)) {
		cget(pl, context, undefined, data, dds, transform);
	} else {
		for (let i = 0; i < data.length; i++) {
			cget(pl, context, i, data[i], dds, transform);
		}
	}
	//
	await pl.exec();
	if (context.ps) await Promise.all(context.ps);
	//
	return context.done !== false ? context.data : undefined;
}

//set
export async function cset(
	pl: CachePipeline,
	context: { data: any; ps?: Promise<any>[] },
	index: number | string,
	data: Data,
	dds: DataDescriptor[],
	transform?: DataTransformer,
	dataRefs?: { [dataPkField: string]: any },
	expireMS?: number
) {
	for (let dd of dds) {
		let hdd = dd as HandledDataDescriptor;
		if (!hdd.__handled) handleData(hdd);
		if (dds.length > 1 && !hdd.nas) throw new Error('should set `as` when data has more than one DataDescriptor');
		//
		let key = pl.getCache().getKey('data', hdd.ns, hdd.nn || data[hdd.dataPkField]);
		let { as, fieldsNeeded } = hdd;
		let { nas, dataPkField, dfieldMap } = hdd;
		//放在前面设置，后面可能会删除字段
		if (dataRefs) dataRefs[dataPkField] = data[dataPkField];
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
					//不属于当前dd
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
			if (fieldsNeeded && dfieldMap[dataField] !== false) {
				if (dfieldMap[dataField]) {
					//去除
					delete data[dataField];
				} else if (fieldsNeeded.indexOf(field) < 0) {
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
	}
	//
	let ndata = !transform ? data : (transform as DataTransformer)(data);
	//如果result不是Priomise
	if (!ndata.then) {
		index === undefined ? (context.data = ndata) : (context.data[index] = ndata);
	} else {
		(context.ps || (context.ps = [])).push(
			ndata.then((ndata: any) => (index === undefined ? (context.data = ndata) : (context.data[index] = ndata)))
		);
	}
}
export async function csetData(
	cid: undefined | string | Cache | CachePipeline,
	data: Data | Data[],
	dds: DataDescriptor[],
	transform?: DataTransformer,
	expireMS?: number
): Promise<any> {
	let pl = getPipeline(cid);
	if (!pl) return;
	//
	let context: any = { data };
	if (!Array.isArray(data)) {
		cset(pl, context, undefined, data, dds, transform, undefined, expireMS);
		await pl.exec();
		if (context.ps) await Promise.all(context.ps);
		//
	} else if (data.length > 0) {
		for (let i = 0; i < data.length; i++) {
			cset(pl, context, i, data[i], dds, transform, undefined, expireMS);
		}
		await pl.exec();
		if (context.ps) await Promise.all(context.ps);
	}
	//
	return context.data;
}

/**
 * 查询存在
 */
export async function cexists(cid: undefined | string, key: string | { prefix?: string; ns: string; nn: string }) {
	let cache = CacheManager.getCache(cid || CacheManager.defaultCID);
	if (cache) {
		if (typeof key === 'string') {
			return cache.exists(key);
		}
		return cache.exists(cache.getKey(key.prefix || 'data', key.ns, key.nn));
	}
	return false;
}

/**
 * 删除
 */
export async function cdel(cid: undefined | string, key: string | { prefix?: string; ns: string; nn: string }) {
	let cache = CacheManager.getCache(cid || CacheManager.defaultCID);
	if (cache) {
		if (typeof key === 'string') {
			return cache.del(key);
		}
		return cache.del(cache.getKey(key.prefix || 'data', key.ns, key.nn));
	}
}
export async function cdelDatas(
	cid: undefined | string | Cache | CachePipeline,
	key: { prefix?: string } & DataKey,
	datas: any[]
) {
	let pl = getPipeline(cid);
	if (!pl) return;
	//
	let cache = pl.getCache();
	let { prefix, ns, nn, pkfield } = key;
	for (let d of datas) {
		pl.del(cache.getKey(prefix || 'data', ns, nn || d[pkfield]));
	}
	//
	return pl.exec();
}

/**
 * 延长过期时间
 */
export async function cexpire(
	cid: undefined | string,
	key: string | { prefix?: string; ns: string; nn: string },
	ms: number
) {
	let cache = CacheManager.getCache(cid || CacheManager.defaultCID);
	if (cache) {
		if (typeof key === 'string') {
			return cache.expire(key, ms);
		}
		return cache.expire(cache.getKey(key.prefix || 'data', key.ns, key.nn), ms);
	}
}
