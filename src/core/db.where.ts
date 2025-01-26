//增加where模块
export const WhereOperatorEnum = [
	'>',
	'>=',
	'<',
	'<=',
	'=',
	'!=',
	'IS',
	'is',
	'IS NOT',
	'is not',
	'LIKE',
	'like',
	'NOT LIKE',
	'not like',
	'IN',
	'in',
	'NOT IN',
	'not in',
	'BETWEEN',
	'between',
	'NOT BETWEEN',
	'not between',
] as const;
export type WhereOperator = (typeof WhereOperatorEnum)[number];
export const WhereLogicRangeEnum = ['(', ')'] as const;
export type WhereLogicRange = (typeof WhereLogicRangeEnum)[number];
export const WhereLogicValueEnum = ['AND', 'and', 'OR', 'or'] as const;
export type WhereLogicValue = (typeof WhereLogicValueEnum)[number];
export type WhereValue = null | string | number;
export type WhereValues = WhereValue[];
export type WhereOP = ((WhereOperator | WhereLogicRange | WhereLogicValue | string) | (WhereValue | WhereValues))[];
export type Where = WhereValue | WhereOP;
//复合
export type WhereComposite = { [field: string]: Where } & { _logic?: WhereLogicValue | string };
export type WhereOptions = { [field: string]: Where | WhereComposite };

//
function getValueSql(v: string | number): string {
	if (v === null) {
		return 'NULL';
	}
	// string
	if (typeof v === 'string') {
		// 将反斜杠转义为双反斜杠
		v = v.replace(/\\/g, '\\\\');
		// 将单引号转义为两个单引号
		v = v.replace(/'/g, "''");
		//
		return `'${v}'`;
	}
	// if (Array.isArray(v)) {
	// 	return v.map(getValueSql).join(',');
	// }
	// number
	return `${v}`;
}
// 解析 Where
export function getFieldWhereSql(field: string, where: Where): string {
	//基础类型
	if (!Array.isArray(where)) {
		return where === null || where === undefined
			? `\`${field}\` IS NULL`
			: `\`${field}\` = ${getValueSql(where as any)}`;
	}
	if (!where.length) return '';
	//遍历数组，生成sql
	let sqls: string[] = [];
	for (let i = 0; i < where.length; i++) {
		let op: any = where[i];
		//如果是操作符
		if (WhereOperatorEnum.includes(op)) {
			op = op.toUpperCase();
			let v = where[++i];
			let genSql: string;
			if (v == null || v === undefined) {
				if (op === '=' || op === 'IS') {
					genSql = `\`${field}\` IS NULL`;
				} else if (op === '!=' || op === 'IS NOT') {
					genSql = `\`${field}\` IS NOT NULL`;
				}
			} else if (!Array.isArray(v)) {
				genSql = `\`${field}\` ${op} ${getValueSql(v)}`;
			} else if (v.length) {
				if (op === 'LIKE' || op === 'NOT LIKE') {
					genSql = v.map((vv) => `\`${field}\` ${op} '${vv}'`).join(' OR ');
				} else if (op === 'IN' || op === 'NOT IN') {
					genSql = `\`${field}\` ${op} (${v.map(getValueSql).join(',')})`;
				} else if (op === 'BETWEEN' || op === 'NOT BETWEEN') {
					genSql = `\`${field}\` ${op} ${getValueSql(v[0])} AND ${getValueSql(v[1])}`;
				}
			}
			if (genSql) {
				sqls.push(genSql);
				//预读取下一个操作符,如果是操作符增加AND条件
				let nextOp: any = where[i + 1];
				if (nextOp && WhereOperatorEnum.includes(nextOp)) {
					sqls.push('AND');
				}
			}
		} else if (WhereLogicRangeEnum.includes(op)) {
			sqls.push(op);
		} else if (WhereLogicValueEnum.includes(op)) {
			sqls.push(op.toUpperCase());
		}
	}
	return sqls.length ? sqls.join(' ') : '';
}

//
function _getWhereSql(asPrefix: string, wo: WhereOptions, isChild: boolean): string {
	let sqls: string[] = [];
	//遍历所有的where条件
	for (let field in wo) {
		if (field === '_logic') continue;
		//
		let where = wo[field];
		//如果是嵌套where
		let fieldSql: string;
		if (typeof where === 'object' && !Array.isArray(where)) {
			//WhereComposite
			fieldSql = _getWhereSql(asPrefix, where as any, true);
		} else {
			//Where
			fieldSql = getFieldWhereSql(`${asPrefix}${field}`, where);
		}
		if (fieldSql) {
			sqls.push(fieldSql);
		}
	}
	//
	let length = sqls.length;
	if (length <= 0) {
		return '';
	}
	if (length === 1) {
		return sqls[0];
	}
	let logic = !wo._logic ? 'AND' : (wo._logic as string).toUpperCase();
	let whereSql = sqls.join(` ${logic} `);
	return !isChild ? whereSql : `(${whereSql})`;
}
export function getWhereSql(asPrefix: string, wo: WhereOptions): string {
	if (asPrefix && !asPrefix.endsWith('.')) asPrefix = `${asPrefix}.`;
	return _getWhereSql(asPrefix, wo, false);
}

// 使用示例
// const where: WhereGroup = {
// 	name: ['like', '%John%'],
// 	age: ['between', [18, 30]],
// 	_logic: 'OR',
// 	address: {
// 		city: 'New York',
// 		_logic: 'AND',
// 		zip: ['!=', null],
// 	},
// };

// const whereSql = getWhereSql('',where);
// console.log(whereSql);
