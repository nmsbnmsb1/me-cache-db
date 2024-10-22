import { IFields, pickFields } from './fields';
import { IWhere, getWhereSql } from './db.where';

//----------------------------------------Sel----------------------------------------
export type SqlStatement = string | (() => string);
export interface IOn {
	[field: string]: { tableName: string; onField: string };
}
export type OrderDefinition = 'ASC' | 'DESC';
export interface IOrder {
	[field: string]: OrderDefinition | string;
}
export interface ISqlOptions extends IFields {
	tableName: string;
	on?: IOn;
	where?: SqlStatement | IWhere;
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
		if (!needFields) needFields = option.needFields = pickFields(option);
		let { tableName, on, where, order } = option;
		let asPrefix = !as ? '' : `${as}.`;
		//select
		{
			if (!as) {
				selectSql = `${!selectSql ? '' : ','}\`${needFields.join(`\`,\``)}\``;
			} else {
				for (let i = 0; i < needFields.length; i++) {
					selectSql += `${!selectSql ? '' : ','}${as}.${needFields[i]} as \`${as}_${needFields[i]}\``;
				}
			}
		}
		//from
		{
			let tsql = `\`${tableName}\`${!as ? '' : ` as ${as}`}`;
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
		if (where) {
			if (typeof where === 'string') {
				whereSql = where;
			} else if (typeof where === 'function') {
				whereSql = where();
			} else {
				whereSql = getWhereSql(asPrefix, where);
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
					let v = order[field];
					let osql = `\`${asPrefix}${field}\` ${v}`;
					orderSql = `${!orderSql ? '' : ', '}${osql}`;
				}
			}
		}
	}
	//
	return `select ${selectSql} from ${fromSql} ${whereSql ? `where ${whereSql}` : ''} ${orderSql ? `order by ${orderSql}` : ''}`;
}
