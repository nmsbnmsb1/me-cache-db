import { IFields, pickFields } from './fields';

//--------------------------------------------------------------------------------
//CommUtils
export function toBoolean(b: any) {
	if (typeof b === 'number') return b === 0 ? 0 : 1;
	if (typeof b === 'boolean') return b === true ? 1 : 0;
	return b ? 1 : 0;
}
export function escape(str: string) {
	if (!str) return '';
	// str = mysql.escape(str);
	// eslint-disable-next-line no-control-regex
	return str.replace(/[\0\n\r\b\t\\'"\x1a]/g, (s: string) => {
		switch (s) {
			case '\0':
				return '\\0';
			case '\n':
				return '\\n';
			case '\r':
				return '\\r';
			case '\b':
				return '\\b';
			case '\t':
				return '\\t';
			case '\x1a':
				return '\\Z';
			default:
				return '\\' + s;
		}
	});
}
export function sanitizeSQL(sql: string) {
	// 移除回车符和换行符，替换连续的空白字符为单个空格
	return sql.replace(/[\r\n]/g, '').replace(/\s+/g, ' ');
}

//----------------------------------------Sel----------------------------------------
//Fields
export type ISqlStatement = string | (() => string);
//a.uuid = b.uuid
export type IOn = { [field: string]: { tableName: string; onField: string } };
export type IWhere = { [field: string]: any; __set: string };
export type IOrder = { [field: string]: 'asc' | 'ASC' | 'desc' | 'DESC' | string; __set: string };
export interface ISqlOptions extends IFields {
	tableName: string;
	on: IOn;
	where: ISqlStatement | IWhere;
	order?: ISqlStatement | IOrder;
}
//各种生成sql语句
export function getLeftJoinSql(options: ISqlOptions[]) {
	let tableMap: { [tname: string]: ISqlOptions } = {};
	for (let option of options) {
		tableMap[option.tableName] = option;
	}
	//fields
	let selectSql = '';
	let fromSql = '';
	let whereSql = '';
	let orderSql = '';
	for (let option of options) {
		let { as, needFields } = option;
		if (!needFields) {
			option.needFields = pickFields(option);
		}
		let { tableName, on, where, order } = option;
		//select
		{
			let nfields = [...needFields];
			if (as) {
				for (let i = 0; i < nfields.length; i++) {
					nfields[i] = `${as}.${nfields[i]} as ${as}_${nfields[i]}`;
				}
			}
			selectSql = `${!selectSql ? '' : ','}${nfields.join(',')}`;
		}
		//
		let asPrefix = !as ? '' : `${as}.`;
		//from
		{
			let tsql = `${tableName}${!as ? '' : ` as ${as}`}`;
			if (!fromSql) {
				fromSql = tsql;
			} else {
				for (let field in on) {
					//a.uuid = b.uuid
					let { tableName, onField } = on[field];
					fromSql = `(${fromSql}) left join ${tsql} on ${asPrefix}${field} = ${
						!tableMap[tableName].as ? '' : `${tableMap[tableName].as}.`
					}${onField}`;
				}
			}
		}
		//where
		{
			if (typeof where === 'string') {
				whereSql = where;
			} else if (typeof where === 'function') {
				whereSql = where();
			} else {
				for (let field in where) {
					let wsql;
					let v = where[field];
					if (field === '__set') {
						wsql = `(${v})`;
					} else {
						wsql = `${asPrefix}${field}`;
						if (Array.isArray(v)) {
							wsql = `${wsql} in ('${v.join("','")}')`;
						} else {
							wsql = `${wsql}='${v}'`;
						}
					}
					whereSql = `${!whereSql ? '' : ' and '}${wsql}`;
				}
			}
		}
		//order
		if (order) {
			if (typeof order === 'string') {
				orderSql = order;
			} else if (typeof order === 'function') {
				orderSql = order();
			} else {
				for (let field in order) {
					let osql;
					let v = order[field];
					if (field === '__set') {
						osql = `${v}`;
					} else {
						osql = `${asPrefix}${field} ${v}`;
					}
					orderSql = `${!orderSql ? '' : ' , '}${osql}`;
				}
			}
		}
	}
	//
	return `select ${selectSql} from ${fromSql} where ${whereSql} ${orderSql ? `order by ${orderSql}` : ''}`;
}
