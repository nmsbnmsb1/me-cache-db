import { IFields, attachAs, cutAs, hasAs, pickFields } from './fields';
import { CacheManager, ICache, ICachePipeline } from './cache';
import { IDataKey } from './keys';

//interfaces
export interface IData {
	[dataField: string]: any;
}
export interface IDataDescriptor extends IDataKey, IFields {}
// export interface IDataCorruptedInfo {
// 	indexes: { [index: number | string]: IData };
// 	pkfields: { [dataPkField: string]: any[] };
// }
export type DataTransformer = (data: IData) => any | Promise<any>;
//辅助方法
interface IHandledDataDescriptor extends IDataDescriptor {
	__handled: boolean;
	//as转换器
	nas?: { [f: string]: string | false };
	dataPkField?: string;
	//要去除的字段
	dfieldMap?: { [f: string]: boolean };
}
function handleData(dd: any): IHandledDataDescriptor {
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
	if (dd.fields) dd.needFields = pickFields(dd);
	if (dd.needFields) dd.dfieldMap = {};
	//
	return dd;
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
	context: { done?: boolean; data: any; ps?: Promise<any>[] },
	index: undefined | number | string,
	data: IData,
	dds: IDataDescriptor[],
	transform?: DataTransformer
) {
	let readCount = 0;
	for (let dd of dds) {
		let hdd = dd as IHandledDataDescriptor;
		if (!hdd.__handled) handleData(hdd);
		//
		let key = pl.getCache().getKey('data', hdd.ns, hdd.nn || data[hdd.dataPkField]);
		let { as, pkfield, needFields } = hdd;
		let { nas, dataPkField, dfieldMap } = hdd;
		pl.get(key, needFields, (err: Error, values: any, valueConvetor: any) => {
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
					for (let k = 0; k < needFields.length; k++) {
						if (!fn(needFields[k], values[k])) {
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
			if (pkfield && needFields && dfieldMap[pkfield] !== false) {
				if (dfieldMap[pkfield]) {
					//去除
					delete data[dataPkField];
				} else if (needFields.indexOf(pkfield) < 0) {
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
	cid: undefined | string | ICache | ICachePipeline,
	data: IData | IData[],
	dds: IDataDescriptor[],
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
	if (context.ps) {
		await Promise.all(context.ps);
	}
	//
	return context.done !== false ? context.data : undefined;
}

//set
export async function cset(
	pl: ICachePipeline,
	context: { data: any; ps?: Promise<any>[] },
	index: number | string,
	data: IData,
	dds: IDataDescriptor[],
	transform?: DataTransformer,
	dataRefs?: { [dataPkField: string]: any },
	expireMS?: number
) {
	for (let dd of dds) {
		let hdd = dd as IHandledDataDescriptor;
		if (!hdd.__handled) handleData(hdd);
		if (dds.length > 1 && !hdd.nas) throw new Error('should set `as` when data has more than one DataDescriptor');
		//
		let key = pl.getCache().getKey('data', hdd.ns, hdd.nn || data[hdd.dataPkField]);
		let { as, needFields } = hdd;
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
			if (needFields && dfieldMap[dataField] !== false) {
				if (dfieldMap[dataField]) {
					//去除
					delete data[dataField];
				} else if (needFields.indexOf(field) < 0) {
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
	cid: undefined | string | ICache | ICachePipeline,
	data: IData | IData[],
	dds: IDataDescriptor[],
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
		} else {
			return cache.exists(cache.getKey(key.prefix || 'data', key.ns, key.nn));
		}
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
		} else {
			return cache.del(cache.getKey(key.prefix || 'data', key.ns, key.nn));
		}
	}
}
export async function cdelDatas(
	cid: undefined | string | ICache | ICachePipeline,
	key: { prefix?: string } & IDataKey,
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
		} else {
			return cache.expire(cache.getKey(key.prefix || 'data', key.ns, key.nn), ms);
		}
	}
}
