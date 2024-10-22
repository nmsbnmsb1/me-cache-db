"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toBoolean = toBoolean;
exports.escape = escape;
exports.sanitizeSQL = sanitizeSQL;
function toBoolean(b) {
    if (typeof b === 'number')
        return b === 0 ? 0 : 1;
    if (typeof b === 'boolean')
        return b === true ? 1 : 0;
    return b ? 1 : 0;
}
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
function sanitizeSQL(sql) {
    return sql.replace(/[\r\n]/g, '').replace(/\s+/g, ' ');
}
//# sourceMappingURL=db.utils.js.map