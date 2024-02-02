import { IFields, attachAs, cutAs, hasAs, pickFields } from './fields';
import { CacheManager, ICache, ICachePipeline } from './cache';

//metadata专属字段名
export const MetadataField = '$metadata';

//interfaces
export interface IData {
	[dataField: string]: any;
	[MetadataField]?: any;
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
export type DataTransformer = (data: IData, metadatas?: any) => any | Promise<any>;
// export const Transformer: { transform: DataTransformer } = {
// 	transform: undefined,
// };
//辅助方法
interface IHandledStructDescriptor extends IDataStructDescriptor {
	__handled: boolean;
	//as转换器
	nas?: { [f: string]: string | false };
	dataPkField: string;
	//要去除的字段
	dfieldMap?: { [f: string]: boolean };
	//需要的字段
	allwantFields?: string[];
}
function handleStructDescriptor(sd: any, transform: boolean): IHandledStructDescriptor {
	sd.__handled = true;
	//
	if (!sd.as) {
		sd.dataPkField = sd.pkfield;
	} else {
		sd.nas = {};
		sd.dataPkField = sd.nas[sd.pkfield] = attachAs(sd.as, sd.pkfield);
	}
	//
	if (sd.fields) sd.needFields = pickFields(sd);
	if (sd.needFields) sd.dfieldMap = {};
	if (sd.needFields) {
		sd.allwantFields = !transform ? sd.needFields : sd.needFields.concat(MetadataField);
	}
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
	context: { done?: boolean; data: any; ps?: Promise<any>[] },
	index: undefined | number | string,
	data: IData,
	sds: IDataStructDescriptor[],
	transform?: DataTransformer
) {
	let readCount = 0;
	let metadatas: any = !transform ? undefined : {};
	for (let sd of sds) {
		let hsd = sd as IHandledStructDescriptor;
		if (!hsd.__handled) {
			handleStructDescriptor(hsd, !!transform);
		}
		let key = pl.getCache().getKey('data', hsd.ns, data[hsd.dataPkField]);
		let { as, pkfield, needFields } = hsd;
		let { nas, dataPkField, dfieldMap } = hsd;
		let { allwantFields } = hsd;
		pl.get(key, allwantFields, (err: Error, values: any, valueConvetor: any) => {
			//如果群组出错了，则直接退出
			if (context.done === false) {
				return;
			}
			//解析缓存数据
			let readDone: boolean = undefined;
			if (err || !values) {
				readDone = false;
			} else {
				let fn = (field: string, value: any) => {
					value = !valueConvetor ? value : valueConvetor(value);
					if (value === undefined && field !== MetadataField) {
						return false;
					}
					//转换data字段
					let dataField: string;
					if (!nas) {
						dataField = field;
					} else {
						dataField = nas[field] || (nas[field] = attachAs(as, field));
					}
					//
					if (field === MetadataField) {
						if (metadatas) metadatas[dataField] = value;
					} else {
						data[dataField] = value;
					}
					//
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
			if (needFields && dfieldMap[pkfield] !== false) {
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
			if (readCount >= sds.length) {
				let ndata = !transform ? data : (transform as DataTransformer)(data, metadatas);
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
	sds: IDataStructDescriptor[],
	transform?: DataTransformer
): Promise<any> {
	let pl = getPipeline(cid);
	if (!pl) return;
	//
	let context: any = { data };
	if (!Array.isArray(data)) {
		cget(pl, context, undefined, data, sds, transform);
	} else {
		for (let i = 0; i < data.length; i++) {
			cget(pl, context, i, data[i], sds, transform);
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
	sds: IDataStructDescriptor[],
	transform?: DataTransformer,
	dataRefs?: { [dataPkField: string]: any },
	expireMS?: number
) {
	let metadatas: any = !transform ? undefined : {};
	for (let sd of sds) {
		let hsd = sd as IHandledStructDescriptor;
		if (!hsd.__handled) {
			handleStructDescriptor(hsd, !!transform);
		}
		//
		let key = pl.getCache().getKey('data', hsd.ns, data[hsd.dataPkField]);
		let { as, needFields } = hsd;
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
			//
			if (field === MetadataField) {
				if (metadatas) metadatas[dataField] = data[dataField];
				delete data[dataField];
			}
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
		//
		//console.log('set', hsd);
	}
	//
	let ndata = !transform ? data : (transform as DataTransformer)(data, metadatas);
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
	sds: IDataStructDescriptor[],
	transform?: DataTransformer,
	expireMS?: number
): Promise<any> {
	let pl = getPipeline(cid);
	if (!pl) return;
	//
	let context: any = { data };
	if (!Array.isArray(data)) {
		cset(pl, context, undefined, data, sds, transform, undefined, expireMS);
	} else if (data.length > 0) {
		for (let i = 0; i < data.length; i++) {
			cset(pl, context, i, data[i], sds, transform, undefined, expireMS);
		}
	}
	//
	await pl.exec();
	if (context.ps) {
		await Promise.all(context.ps);
	}
	//
	return context.data;
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
export async function cdelData(
	cid: undefined | string | ICache | ICachePipeline,
	key: { prefix?: string; ns: string; pkfield?: string },
	datas: any[]
) {
	let pl = getPipeline(cid);
	if (!pl) return;
	//
	let { prefix, ns, pkfield } = key;
	for (let d of datas) {
		pl.del(pl.getCache().getKey(prefix || 'data', ns, !pkfield ? d : d[pkfield]));
	}
	//
	return pl.exec();
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
