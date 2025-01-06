//增加where模块
export type WhereOperator =
	| '>'
	| '>='
	| '<'
	| '<='
	| '='
	| '!='
	| 'is'
	| 'is not'
	| 'like'
	| 'not like'
	| 'in'
	| 'between';
export type WhereValue = null | undefined | string | number;
export type WhereMultiValue = WhereValue[];
export type WhereOP = [WhereOperator, WhereValue | WhereMultiValue];
export interface WhereLogic {
	_logic?: string;
}
export type WhereComposite = WhereLogic & {
	[key in WhereOperator]?: WhereValue | WhereMultiValue;
};
export type Where = WhereValue | WhereOP | WhereComposite;
export interface WhereOptions extends WhereLogic {
	[field: string]: Where;
}

function getValueSql(v: WhereValue | WhereMultiValue): string {
	if (v === null || v === undefined) {
		return 'NULL';
	}
	if (typeof v === 'string') {
		// 将反斜杠转义为双反斜杠
		v = v.replace(/\\/g, '\\\\');
		// 将单引号转义为两个单引号
		v = v.replace(/'/g, "''");
		return `'${v}'`;
	}
	if (Array.isArray(v)) {
		return v.map(getValueSql).join(',');
	}
	return `${v}`;
}

// 解析OP
export function getFieldWhereSql(field: string, where: Where): string {
	//null | undefined
	if (where === null || where === undefined) {
		return `\`${field}\` IS NULL`;
	}
	//WhereOP
	if (Array.isArray(where)) {
		let [op, v] = where;
		let operator = op.toUpperCase();
		if (operator === '!=' && (v == null || v === undefined)) {
			return `\`${field}\` IS NOT NULL`;
		}
		if (!Array.isArray(v)) {
			return `\`${field}\` ${operator} ${getValueSql(v)}`;
		}
		if (operator === 'LIKE' || operator === 'NOT LIKE') {
			return v.map((vv) => `\`${field}\` ${operator} '${vv}'`).join(' OR ');
		}
		if (operator === 'IN' || operator === 'NOT IN') {
			return `\`${field}\` ${operator} (${v.map(getValueSql).join(',')})`;
		}
		if (operator === 'BETWEEN' || operator === 'NOT BETWEEN') {
			return `\`${field}\` ${operator} ${getValueSql(v[0])} AND ${getValueSql(v[1])}`;
		}
	}
	//WhereComposite
	if (typeof where === 'object') {
		let wc = where as WhereComposite;
		let logic = !wc._logic ? 'AND' : wc._logic.toUpperCase();
		let conditions: string[] = [];
		for (let op in wc) {
			if (op !== '_logic') {
				let vv = wc[op as WhereOperator];
				conditions.push(`\`${field}\` ${op} ${getValueSql(vv)}`);
			}
		}
		return conditions.join(` ${logic} `);
	}
	//Other types
	if (where === null || where === undefined) {
		return `\`${field}\` is NULL`;
	}
	if (Array.isArray(where)) {
		return `\`${field}\` in ${getValueSql(where as any)}`;
	}
	return `\`${field}\` = ${getValueSql(where as any)}`;
}

function _getWhereSql(asPrefix: string, wo: WhereOptions, isChild: boolean): string {
	let sqls: string[] = [];
	//遍历所有的where条件
	for (let field in wo) {
		if (field === '_logic') continue;
		//
		let where = wo[field];
		//如果是嵌套where
		if (typeof where === 'object' && !Array.isArray(where)) {
			sqls.push(_getWhereSql(asPrefix, where as any, true));
		} else {
			sqls.push(getFieldWhereSql(`${asPrefix}${field}`, where));
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
