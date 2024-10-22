"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getLeftJoinSql = getLeftJoinSql;
const fields_1 = require("./fields");
const db_where_1 = require("./db.where");
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
        if (!needFields)
            needFields = option.needFields = (0, fields_1.pickFields)(option);
        let { tableName, on, where, order } = option;
        let asPrefix = !as ? '' : `${as}.`;
        {
            if (!as) {
                selectSql = `${!selectSql ? '' : ','}\`${needFields.join(`\`,\``)}\``;
            }
            else {
                for (let i = 0; i < needFields.length; i++) {
                    selectSql += `${!selectSql ? '' : ','}${as}.${needFields[i]} as \`${as}_${needFields[i]}\``;
                }
            }
        }
        {
            let tsql = `\`${tableName}\`${!as ? '' : ` as ${as}`}`;
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
        if (where) {
            if (typeof where === 'string') {
                whereSql = where;
            }
            else if (typeof where === 'function') {
                whereSql = where();
            }
            else {
                whereSql = (0, db_where_1.getWhereSql)(asPrefix, where);
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
                    let v = order[field];
                    let osql = `\`${asPrefix}${field}\` ${v}`;
                    orderSql = `${!orderSql ? '' : ', '}${osql}`;
                }
            }
        }
    }
    return `select ${selectSql} from ${fromSql} ${whereSql ? `where ${whereSql}` : ''} ${orderSql ? `order by ${orderSql}` : ''}`;
}
//# sourceMappingURL=db.js.map