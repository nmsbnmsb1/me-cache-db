"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getLeftJoinSql = exports.sanitizeSQL = exports.escape = exports.toBoolean = void 0;
const fields_1 = require("./fields");
function toBoolean(b) {
    if (typeof b === 'number')
        return b === 0 ? 0 : 1;
    if (typeof b === 'boolean')
        return b === true ? 1 : 0;
    return b ? 1 : 0;
}
exports.toBoolean = toBoolean;
function escape(str) {
    if (!str)
        return '';
    return str.replace(/[\0\n\r\b\t\\'"\x1a]/g, (s) => {
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
exports.escape = escape;
function sanitizeSQL(sql) {
    return sql.replace(/[\r\n]/g, '').replace(/\s+/g, ' ');
}
exports.sanitizeSQL = sanitizeSQL;
function getLeftJoinSql(options) {
    let tableMap = {};
    for (let option of options) {
        tableMap[option.tableName] = option;
    }
    let selectSql = '';
    let fromSql = '';
    let whereSql = '';
    let orderSql = '';
    for (let option of options) {
        let { as, needFields } = option;
        if (!needFields) {
            option.needFields = (0, fields_1.pickFields)(option);
        }
        let { tableName, on, where, order } = option;
        {
            let nfields = [...needFields];
            if (as) {
                for (let i = 0; i < nfields.length; i++) {
                    nfields[i] = `${as}.${nfields[i]} as ${as}_${nfields[i]}`;
                }
            }
            selectSql = `${!selectSql ? '' : ','}${nfields.join(',')}`;
        }
        let asPrefix = !as ? '' : `${as}.`;
        {
            let tsql = `${tableName}${!as ? '' : ` as ${as}`}`;
            if (!fromSql) {
                fromSql = tsql;
            }
            else {
                for (let field in on) {
                    let { tableName, onField } = on[field];
                    fromSql = `(${fromSql}) left join ${tsql} on ${asPrefix}${field} = ${!tableMap[tableName].as ? '' : `${tableMap[tableName].as}.`}${onField}`;
                }
            }
        }
        {
            if (typeof where === 'string') {
                whereSql = where;
            }
            else if (typeof where === 'function') {
                whereSql = where();
            }
            else {
                for (let field in where) {
                    let wsql;
                    let v = where[field];
                    if (field === '__set') {
                        wsql = `(${v})`;
                    }
                    else {
                        wsql = `${asPrefix}${field}`;
                        if (Array.isArray(v)) {
                            wsql = `${wsql} in ('${v.join("','")}')`;
                        }
                        else {
                            wsql = `${wsql}='${v}'`;
                        }
                    }
                    whereSql = `${!whereSql ? '' : ' and '}${wsql}`;
                }
            }
        }
        if (order) {
            if (typeof order === 'string') {
                orderSql = order;
            }
            else if (typeof order === 'function') {
                orderSql = order();
            }
            else {
                for (let field in order) {
                    let osql;
                    let v = order[field];
                    if (field === '__set') {
                        osql = `${v}`;
                    }
                    else {
                        osql = `${asPrefix}${field} ${v}`;
                    }
                    orderSql = `${!orderSql ? '' : ' , '}${osql}`;
                }
            }
        }
    }
    return `select ${selectSql} from ${fromSql} where ${whereSql} ${orderSql ? `order by ${orderSql}` : ''}`;
}
exports.getLeftJoinSql = getLeftJoinSql;
//# sourceMappingURL=db.js.map