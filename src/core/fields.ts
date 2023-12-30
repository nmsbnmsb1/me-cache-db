//字段别名
export interface IAs {
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
//字段标签
export const TAG_FULL = 'full';
export const TAG_COMMON = 'common';
export const TAG_Preset = 'preset';
export interface ITagStore {
	[TAG_FULL]: string[];
	[TAG_COMMON]: string[];
	[TAG_Preset]: string[];
	[tagName: string]: string[];
}
export function getBaseTagStore(options?: {
	id?: { fieldName?: string; common?: boolean; preset?: boolean; others?: string[] } | false;
	createdAt?: { fieldName?: string; common?: boolean; preset?: boolean; others?: string[] } | false;
	updatedAt?: { fieldName?: string; common?: boolean; preset?: boolean; others?: string[] } | false;
	deletedAt?: { fieldName?: string; common?: boolean; preset?: boolean; others?: string[] } | false;
}): ITagStore {
	let store: any = {};
	if (options?.id !== false) {
		let tags = [TAG_FULL];
		if (options?.id?.common) tags.push(TAG_COMMON);
		if (options?.id?.preset) tags.push(TAG_Preset);
		if (options?.id?.others) tags.push(...options?.id?.others);
		//
		tagField(store, options?.id?.fieldName || 'id', tags);
	}
	if (options?.createdAt !== false) {
		let tags = [TAG_FULL];
		if (options?.createdAt?.common) tags.push(TAG_COMMON);
		if (options?.createdAt?.preset) tags.push(TAG_Preset);
		if (options?.createdAt?.others) tags.push(...options?.createdAt?.others);
		//
		tagField(store, options?.createdAt?.fieldName || 'createdAt', tags);
	}
	if (options?.updatedAt !== false) {
		let tags = [TAG_FULL];
		if (options?.updatedAt?.common) tags.push(TAG_COMMON);
		if (options?.updatedAt?.preset) tags.push(TAG_Preset);
		if (options?.updatedAt?.others) tags.push(...options?.updatedAt?.others);
		//
		tagField(store, options?.updatedAt?.fieldName || 'updatedAt', tags);
	}
	if (options?.deletedAt !== false) {
		let tags = [TAG_FULL];
		if (options?.deletedAt?.common) tags.push(TAG_COMMON);
		if (options?.deletedAt?.preset) tags.push(TAG_Preset);
		if (options?.deletedAt?.others) tags.push(...options?.deletedAt?.others);
		//
		tagField(store, options?.deletedAt?.fieldName || 'deletedAt', tags);
	}
	return store;
}
function tagField(store: ITagStore, fieldName: string, tags: string[]) {
	for (let tag of tags) {
		let t = store[tag] || (store[tag] = []);
		if (t.indexOf(fieldName) < 0) {
			fieldName === 'id' ? t.unshift(fieldName) : t.push(fieldName);
		}
	}
}
export function Tag(store: ITagStore, ...tags: string[]) {
	return (target: any, fieldName: string) => {
		tags.push(TAG_FULL);
		tags.push(TAG_Preset);
		tagField(store, fieldName, tags);
	};
}
//字段处理
export interface IFieldsModifier {
	[name: string]: boolean | 'override';
}
export interface IFields extends IAs {
	fields?: string | string[];
	fieldsModifier?: IFieldsModifier;
	neededFields?: string[];
}
// export function pickFields(fields: string, modifier: IFieldsModifier): string[];
// export function pickFields(fields: string[], modifier: IFieldsModifier): string[];
// export function pickFields(fields: IFields): string[];
export function pickFields(fields: string | string[] | IFields, modifier?: IFieldsModifier) {
	let fs: string[];
	if (typeof fields === 'string') {
		fs = fields.split(',');
	} else if (Array.isArray(fields)) {
		fs = fields.slice();
	} else if (fields.fields) {
		fs = typeof fields.fields === 'string' ? fields.fields.split(',') : fields.fields.slice();
		modifier = fields.fieldsModifier;
	}
	//
	if (modifier) {
		for (let n in modifier) {
			let tmp = n.split(',');
			if (modifier[n] === 'override') {
				fs = tmp;
				break;
			}
			//
			for (let f of tmp) {
				let index = fs.indexOf(f);
				if (modifier[n] === true && index < 0) {
					fs.push(f);
				} else if (modifier[n] === false && index >= 0) {
					fs.splice(index, 1);
				}
			}
		}
	}
	// console.log(fs);
	return fs;
}
export function filterDataFields(data: any, fields: string | string[] | IFields, modifier?: IFieldsModifier) {
	let fs = pickFields(fields, modifier);
	for (let k in data) {
		if (fs.indexOf(k) < 0) {
			delete data[k];
		}
	}
	return data;
}
