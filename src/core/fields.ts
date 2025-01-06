//AS 字段别名 ------------------------------------------------------------------------
export interface As {
	as?: string;
}
export function hasAs(as: string, asField: string) {
	return asField.startsWith(`${as}_`);
}
export function attachAs(as: string, field: string) {
	return `${as}_${field}`;
}
export function cutAs(as: string, asField: string) {
	return asField.substring(as.length + 1);
}
//Tag 字段标签 ------------------------------------------------------------------------
// export const TAG_FULL = 'full';
// export const TAG_COMMON = 'common';
// export const TAG_Preset = 'preset';
// export interface ITagStore {
// 	[TAG_FULL]: string[];
// 	[TAG_COMMON]: string[];
// 	[TAG_Preset]: string[];
// 	[tagName: string]: string[];
// }
// export function getBaseTagStore(options?: {
// 	id?: { fieldName?: string; common?: boolean; preset?: boolean; others?: string[] } | false;
// 	createdAt?: { fieldName?: string; common?: boolean; preset?: boolean; others?: string[] } | false;
// 	updatedAt?: { fieldName?: string; common?: boolean; preset?: boolean; others?: string[] } | false;
// 	deletedAt?: { fieldName?: string; common?: boolean; preset?: boolean; others?: string[] } | false;
// }): ITagStore {
// 	let store: any = {};
// 	if (options?.id !== false) {
// 		let tags = [TAG_FULL];
// 		if (options?.id?.common) tags.push(TAG_COMMON);
// 		if (options?.id?.preset) tags.push(TAG_Preset);
// 		if (options?.id?.others) tags.push(...options?.id?.others);
// 		//
// 		tagField(store, options?.id?.fieldName || 'id', tags);
// 	}
// 	if (options?.createdAt !== false) {
// 		let tags = [TAG_FULL];
// 		if (options?.createdAt?.common) tags.push(TAG_COMMON);
// 		if (options?.createdAt?.preset) tags.push(TAG_Preset);
// 		if (options?.createdAt?.others) tags.push(...options?.createdAt?.others);
// 		//
// 		tagField(store, options?.createdAt?.fieldName || 'createdAt', tags);
// 	}
// 	if (options?.updatedAt !== false) {
// 		let tags = [TAG_FULL];
// 		if (options?.updatedAt?.common) tags.push(TAG_COMMON);
// 		if (options?.updatedAt?.preset) tags.push(TAG_Preset);
// 		if (options?.updatedAt?.others) tags.push(...options?.updatedAt?.others);
// 		//
// 		tagField(store, options?.updatedAt?.fieldName || 'updatedAt', tags);
// 	}
// 	if (options?.deletedAt !== false) {
// 		let tags = [TAG_FULL];
// 		if (options?.deletedAt?.common) tags.push(TAG_COMMON);
// 		if (options?.deletedAt?.preset) tags.push(TAG_Preset);
// 		if (options?.deletedAt?.others) tags.push(...options?.deletedAt?.others);
// 		//
// 		tagField(store, options?.deletedAt?.fieldName || 'deletedAt', tags);
// 	}
// 	return store;
// }
// export function tagField(store: ITagStore, fieldName: string, tags: string[]) {
// 	for (let tag of tags) {
// 		let t = store[tag] || (store[tag] = []);
// 		if (t.indexOf(fieldName) < 0) {
// 			fieldName === 'id' ? t.unshift(fieldName) : t.push(fieldName);
// 		}
// 	}
// }
// export function Tag(store: ITagStore, ...tags: string[]) {
// 	return (target: any, fieldName: string) => {
// 		tags.push(TAG_FULL);
// 		tags.push(TAG_Preset);
// 		tagField(store, fieldName, tags);
// 	};
// }
//Field 字段处理 ------------------------------------------------------------------------

//生成字段

export interface FieldsModifier {
	[name: string]: boolean | 'override';
}
export interface FieldsPicker {
	base: string | string[];
	modifier: FieldsModifier;
}
export type Fields = string | string[] | FieldsPicker;
export function pickFields(base: Fields, modifier?: FieldsModifier) {
	let result: string[];
	//
	let baseFields: any = base;
	if ((base as FieldsPicker).base) {
		baseFields = (base as FieldsPicker).base;
	}
	if (typeof baseFields === 'string') {
		result = baseFields.split(',');
	} else if (Array.isArray(baseFields)) {
		result = baseFields.slice();
	}
	if (!modifier && (base as FieldsPicker).modifier) {
		modifier = (base as FieldsPicker).modifier;
	}
	if (modifier) {
		for (let n in modifier) {
			let tmp = n.split(',');
			if (modifier[n] === 'override') {
				result = tmp;
				break;
			}
			for (let f of tmp) {
				let index = result.indexOf(f);
				if (modifier[n] === true && index < 0) {
					result.push(f);
				} else if (modifier[n] === false && index >= 0) {
					result.splice(index, 1);
				}
			}
		}
	}
	// console.log(result);
	return result;
}
export function filterDataFields(data: any, base: Fields, modifier?: FieldsModifier) {
	let result = pickFields(base, modifier);
	for (let k in data) {
		if (result.indexOf(k) < 0) {
			delete data[k];
		}
	}
	return data;
}
//字段方案表,设置多种字段方案
export class FieldScheme {
	private base: string[];
	private m: { [scheme: string]: string[] };
	constructor(base: string | string[], m: { [scheme: string]: string | string[] | FieldsModifier }) {
		this.base = typeof base === 'string' ? base.split(',') : base;
		//预缓存m
		this.m = {};
		for (let scheme in m) {
			let config = m[scheme];
			if (typeof config === 'string') this.m[scheme] = config.split(',');
			else if (Array.isArray(config)) this.m[scheme] = config;
			else this.m[scheme] = pickFields(this.base, config as FieldsModifier);
		}
	}
	public getBase(modifier?: FieldsModifier) {
		return !modifier ? this.base.slice() : pickFields(this.base, modifier);
	}
	//根据方案名获取需要的字段
	public getFields(fields: string | string[] | FieldsModifier | FieldsPicker): string[] {
		if (typeof fields === 'string') {
			if (this.m[fields]) return this.m[fields].slice();
			return fields.split(',');
		}
		if (Array.isArray(fields)) return fields.slice();
		if ((fields as FieldsPicker).base && (fields as FieldsPicker).modifier) return pickFields(fields as FieldsPicker);
		return pickFields(this.base, fields as FieldsModifier);
	}
	public getFieldsOptions(fields: string | string[] | FieldsModifier | FieldsPicker): FieldsOptions {
		return { fields: this.getFields(fields) };
	}
	public getDbFieldsOptions(fields: string | string[] | FieldsModifier | FieldsPicker): FieldsOptions {
		return { dbFields: this.getFields(fields) };
	}
	public filterDataFields(data: any, fields: string | string[] | FieldsModifier | FieldsPicker): string {
		return filterDataFields(data, this.getFields(fields));
	}
}
export interface FieldsOptions extends As {
	//for cache
	fields?: Fields;
	//for sql
	dbFields?: Fields;
}
