"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WhereLogicValueEnum = exports.WhereLogicRangeEnum = exports.WhereOperatorEnum = void 0;
exports.getFieldWhereSql = getFieldWhereSql;
exports.getWhereSql = getWhereSql;
exports.WhereOperatorEnum = [
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
];
exports.WhereLogicRangeEnum = ['(', ')'];
exports.WhereLogicValueEnum = ['AND', 'and', 'OR', 'or'];
function getValueSql(v) {
    if (v === null) {
        return 'NULL';
    }
    if (typeof v === 'string') {
        v = v.replace(/\\/g, '\\\\');
        v = v.replace(/'/g, "''");
        return `'${v}'`;
    }
    return `${v}`;
}
function getFieldWhereSql(field, where) {
    if (!Array.isArray(where)) {
        return where === null || where === undefined
            ? `\`${field}\` IS NULL`
            : `\`${field}\` = ${getValueSql(where)}`;
    }
    if (!where.length)
        return '';
    let sqls = [];
    for (let i = 0; i < where.length; i++) {
        let op = where[i];
        if (exports.WhereOperatorEnum.includes(op)) {
            op = op.toUpperCase();
            let v = where[++i];
            let genSql;
            if (v == null || v === undefined) {
                if (op === '=' || op === 'IS') {
                    genSql = `\`${field}\` IS NULL`;
                }
                else if (op === '!=' || op === 'IS NOT') {
                    genSql = `\`${field}\` IS NOT NULL`;
                }
            }
            else if (!Array.isArray(v)) {
                genSql = `\`${field}\` ${op} ${getValueSql(v)}`;
            }
            else if (v.length) {
                if (op === 'LIKE' || op === 'NOT LIKE') {
                    genSql = v.map((vv) => `\`${field}\` ${op} '${vv}'`).join(' OR ');
                }
                else if (op === 'IN' || op === 'NOT IN') {
                    genSql = `\`${field}\` ${op} (${v.map(getValueSql).join(',')})`;
                }
                else if (op === 'BETWEEN' || op === 'NOT BETWEEN') {
                    genSql = `\`${field}\` ${op} ${getValueSql(v[0])} AND ${getValueSql(v[1])}`;
                }
            }
            if (genSql) {
                sqls.push(genSql);
                let nextOp = where[i + 1];
                if (nextOp && exports.WhereOperatorEnum.includes(nextOp)) {
                    sqls.push('AND');
                }
            }
        }
        else if (exports.WhereLogicRangeEnum.includes(op)) {
            sqls.push(op);
        }
        else if (exports.WhereLogicValueEnum.includes(op)) {
            sqls.push(op.toUpperCase());
        }
    }
    return sqls.length ? sqls.join(' ') : '';
}
function _getWhereSql(asPrefix, wo, isChild) {
    let sqls = [];
    for (let field in wo) {
        if (field === '_logic')
            continue;
        let where = wo[field];
        let fieldSql;
        if (typeof where === 'object' && !Array.isArray(where)) {
            fieldSql = _getWhereSql(asPrefix, where, true);
        }
        else {
            fieldSql = getFieldWhereSql(`${asPrefix}${field}`, where);
        }
        if (fieldSql) {
            sqls.push(fieldSql);
        }
    }
    let length = sqls.length;
    if (length <= 0) {
        return '';
    }
    if (length === 1) {
        return sqls[0];
    }
    let logic = !wo._logic ? 'AND' : wo._logic.toUpperCase();
    let whereSql = sqls.join(` ${logic} `);
    return !isChild ? whereSql : `(${whereSql})`;
}
function getWhereSql(asPrefix, wo) {
    if (asPrefix && !asPrefix.endsWith('.'))
        asPrefix = `${asPrefix}.`;
    return _getWhereSql(asPrefix, wo, false);
}
//# sourceMappingURL=db.where.js.map