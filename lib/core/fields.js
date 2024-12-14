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
;
function pickFields(fields, modifier) {
    let fs;
    if (typeof fields === 'string') {
        fs = fields.split(',');
    }
    else if (Array.isArray(fields)) {
        fs = fields.slice();
    }
    else if (fields.fields) {
        fs = typeof fields.fields === 'string' ? fields.fields.split(',') : fields.fields.slice();
        modifier = fields.fieldsModifier;
    }
    if (modifier) {
        for (let n in modifier) {
            let tmp = n.split(',');
            if (modifier[n] === 'override') {
                fs = tmp;
                break;
            }
            for (let f of tmp) {
                let index = fs.indexOf(f);
                if (modifier[n] === true && index < 0) {
                    fs.push(f);
                }
                else if (modifier[n] === false && index >= 0) {
                    fs.splice(index, 1);
                }
            }
        }
    }
    return fs;
}
function filterDataFields(data, fields, modifier) {
    let fs = pickFields(fields, modifier);
    for (let k in data) {
        if (fs.indexOf(k) < 0) {
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
            else {
                this.m[scheme] = pickFields(this.base, config);
            }
        }
    }
    getBase() {
        return this.base.slice();
    }
    getFields(fields) {
        return typeof fields === 'string' && this.m[fields] ? this.m[fields].slice() : pickFields(fields);
    }
    getFieldsOptions(fields) {
        return { fields: this.getFields(fields) };
    }
    filterDataFields(data, fields) {
        return filterDataFields(data, this.getFields(fields));
    }
}
exports.FieldScheme = FieldScheme;
//# sourceMappingURL=fields.js.map