"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getFieldWhereSql = getFieldWhereSql;
exports.getWhereSql = getWhereSql;
function getValueSql(v) {
    if (v === null || v === undefined) {
        return 'NULL';
    }
    if (typeof v === 'string') {
        v = v.replace(/\\/g, '\\\\');
        v = v.replace(/'/g, "''");
        return `'${v}'`;
    }
    if (Array.isArray(v)) {
        return v.map(getValueSql).join(',');
    }
    return `${v}`;
}
function getFieldWhereSql(field, where) {
    if (where === null || where === undefined) {
        return `\`${field}\` IS NULL`;
    }
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
    if (typeof where === 'object') {
        let wc = where;
        let logic = !wc._logic ? 'AND' : wc._logic.toUpperCase();
        let conditions = [];
        for (let op in wc) {
            if (op !== '_logic') {
                let vv = wc[op];
                conditions.push(`\`${field}\` ${op} ${getValueSql(vv)}`);
            }
        }
        return conditions.join(` ${logic} `);
    }
    return `\`${field}\` = ${getValueSql(where)}`;
}
function _getWhereSql(asPrefix, wo, isChild) {
    let sqls = [];
    for (let field in wo) {
        if (field === '_logic')
            continue;
        let where = wo[field];
        if (typeof where === 'object' && !Array.isArray(where)) {
            sqls.push(_getWhereSql(asPrefix, where, true));
        }
        else {
            sqls.push(getFieldWhereSql(`${asPrefix}${field}`, where));
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