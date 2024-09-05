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

//----------------------------------------分页查询----------------------------------------
export interface IPageData {
	count: number;
	page: number;
	pageSize: number;
	totalPages: number;
	datas: any[];
}
export type Query = (sql: string) => Promise<any>;
export async function doPage(page: number, pageSize: number, countField: string, sql: string, query: Query) {
	let totalCount;
	let rs;
	//如果分页查询
	if (pageSize > 0) {
		let countData = await query(`select COUNT(${countField}) as count from (${sql}) as a`);
		if (!countData || countData.length === 0 || countData[0].count <= 0) {
			totalCount = 0;
		} else {
			totalCount = countData[0].count;
			rs = await query(`${sql} limit ${(page - 1) * pageSize},${pageSize}`);
		}
	} else {
		rs = await query(`${sql}`);
		totalCount = rs.length;
	}
	return {
		count: totalCount,
		page,
		pageSize,
		totalPages: pageSize <= 0 ? 1 : Math.ceil(totalCount / pageSize),
		datas: rs || [],
	} as IPageData;
}

//----------------------------------------Sel----------------------------------------
export type SqlStatement = string | (() => string);
export interface IOn {
	[field: string]: { tableName: string; onField: string };
}
export interface IWhere {
	__set?: string;
	[field: string]: any;
}
export interface IOrder {
	__set?: string;
	[field: string]: 'asc' | 'ASC' | 'desc' | 'DESC' | string;
}
export interface ISqlOptions extends IFields {
	tableName: string;
	on?: IOn;
	where: SqlStatement | IWhere;
	order?: SqlStatement | IOrder;
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
			needFields = option.needFields = pickFields(option);
		}
		let { tableName, on, where, order } = option;
		//select
		{
			if (!as) {
				selectSql = `${!selectSql ? '' : ','}"${needFields.join(`","`)}"`;
			} else {
				for (let i = 0; i < needFields.length; i++) {
					selectSql += `${!selectSql ? '' : ','}${as}.${needFields[i]} as "${as}_${needFields[i]}"`;
				}
			}
		}
		//
		let asPrefix = !as ? '' : `${as}.`;
		//from
		{
			let tsql = `"${tableName}"${!as ? '' : ` as ${as}`}`;
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
						} else if (typeof v !== 'string') {
							wsql = `${wsql}=${v}`;
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
