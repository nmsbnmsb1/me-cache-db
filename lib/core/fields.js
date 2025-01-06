"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FieldScheme = void 0;
exports.hasAs = hasAs;
exports.attachAs = attachAs;
exports.cutAs = cutAs;
exports.pickFields = pickFields;
exports.filterDataFields = filterDataFields;
function hasAs(as, asField) {
    return asField.startsWith(`${as}_`);
}
function attachAs(as, field) {
    return `${as}_${field}`;
}
function cutAs(as, asField) {
    return asField.substring(as.length + 1);
}
function pickFields(base, modifier) {
    let result;
    let baseFields = base;
    if (base.base) {
        baseFields = base.base;
    }
    if (typeof baseFields === 'string') {
        result = baseFields.split(',');
    }
    else if (Array.isArray(baseFields)) {
        result = baseFields.slice();
    }
    if (!modifier && base.modifier) {
        modifier = base.modifier;
    }
    if (modifier) {
        for (let n in modifier) {
            let tmp = n.split(',');
            if (modifier[n] === 'override') {
                result = tmp;
                break;
            }
            for (let f of tmp) {
                let index = result.indexOf(f);
                if (modifier[n] === true && index < 0) {
                    result.push(f);
                }
                else if (modifier[n] === false && index >= 0) {
                    result.splice(index, 1);
                }
            }
        }
    }
    return result;
}
function filterDataFields(data, base, modifier) {
    let result = pickFields(base, modifier);
    for (let k in data) {
        if (result.indexOf(k) < 0) {
            delete data[k];
        }
    }
    return data;
}
class FieldScheme {
    constructor(base, m) {
        this.base = typeof base === 'string' ? base.split(',') : base;
        this.m = {};
        for (let scheme in m) {
            let config = m[scheme];
            if (typeof config === 'string')
                this.m[scheme] = config.split(',');
            else if (Array.isArray(config))
                this.m[scheme] = config;
            else
                this.m[scheme] = pickFields(this.base, config);
        }
    }
    getBase(modifier) {
        return !modifier ? this.base.slice() : pickFields(this.base, modifier);
    }
    getFields(fields) {
        if (typeof fields === 'string') {
            if (this.m[fields])
                return this.m[fields].slice();
            return fields.split(',');
        }
        if (Array.isArray(fields))
            return fields.slice();
        if (fields.base && fields.modifier)
            return pickFields(fields);
        return pickFields(this.base, fields);
    }
    getFieldsOptions(fields) {
        return { fields: this.getFields(fields) };
    }
    getDbFieldsOptions(fields) {
        return { dbFields: this.getFields(fields) };
    }
    filterDataFields(data, fields) {
        return filterDataFields(data, this.getFields(fields));
    }
}
exports.FieldScheme = FieldScheme;
//# sourceMappingURL=fields.js.map