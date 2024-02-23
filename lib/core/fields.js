"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.filterDataFields = exports.pickFields = exports.Tag = exports.tagField = exports.getBaseTagStore = exports.TAG_Preset = exports.TAG_COMMON = exports.TAG_FULL = exports.cutAs = exports.attachAs = exports.hasAs = void 0;
function hasAs(as, asField) {
    return asField.startsWith(`${as}_`);
}
exports.hasAs = hasAs;
function attachAs(as, field) {
    return `${as}_${field}`;
}
exports.attachAs = attachAs;
function cutAs(as, asField) {
    return asField.substring(as.length + 1);
}
exports.cutAs = cutAs;
exports.TAG_FULL = 'full';
exports.TAG_COMMON = 'common';
exports.TAG_Preset = 'preset';
function getBaseTagStore(options) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u, _v;
    let store = {};
    if ((options === null || options === void 0 ? void 0 : options.id) !== false) {
        let tags = [exports.TAG_FULL];
        if ((_a = options === null || options === void 0 ? void 0 : options.id) === null || _a === void 0 ? void 0 : _a.common)
            tags.push(exports.TAG_COMMON);
        if ((_b = options === null || options === void 0 ? void 0 : options.id) === null || _b === void 0 ? void 0 : _b.preset)
            tags.push(exports.TAG_Preset);
        if ((_c = options === null || options === void 0 ? void 0 : options.id) === null || _c === void 0 ? void 0 : _c.others)
            tags.push(...(_d = options === null || options === void 0 ? void 0 : options.id) === null || _d === void 0 ? void 0 : _d.others);
        tagField(store, ((_e = options === null || options === void 0 ? void 0 : options.id) === null || _e === void 0 ? void 0 : _e.fieldName) || 'id', tags);
    }
    if ((options === null || options === void 0 ? void 0 : options.createdAt) !== false) {
        let tags = [exports.TAG_FULL];
        if ((_f = options === null || options === void 0 ? void 0 : options.createdAt) === null || _f === void 0 ? void 0 : _f.common)
            tags.push(exports.TAG_COMMON);
        if ((_g = options === null || options === void 0 ? void 0 : options.createdAt) === null || _g === void 0 ? void 0 : _g.preset)
            tags.push(exports.TAG_Preset);
        if ((_h = options === null || options === void 0 ? void 0 : options.createdAt) === null || _h === void 0 ? void 0 : _h.others)
            tags.push(...(_j = options === null || options === void 0 ? void 0 : options.createdAt) === null || _j === void 0 ? void 0 : _j.others);
        tagField(store, ((_k = options === null || options === void 0 ? void 0 : options.createdAt) === null || _k === void 0 ? void 0 : _k.fieldName) || 'createdAt', tags);
    }
    if ((options === null || options === void 0 ? void 0 : options.updatedAt) !== false) {
        let tags = [exports.TAG_FULL];
        if ((_l = options === null || options === void 0 ? void 0 : options.updatedAt) === null || _l === void 0 ? void 0 : _l.common)
            tags.push(exports.TAG_COMMON);
        if ((_m = options === null || options === void 0 ? void 0 : options.updatedAt) === null || _m === void 0 ? void 0 : _m.preset)
            tags.push(exports.TAG_Preset);
        if ((_o = options === null || options === void 0 ? void 0 : options.updatedAt) === null || _o === void 0 ? void 0 : _o.others)
            tags.push(...(_p = options === null || options === void 0 ? void 0 : options.updatedAt) === null || _p === void 0 ? void 0 : _p.others);
        tagField(store, ((_q = options === null || options === void 0 ? void 0 : options.updatedAt) === null || _q === void 0 ? void 0 : _q.fieldName) || 'updatedAt', tags);
    }
    if ((options === null || options === void 0 ? void 0 : options.deletedAt) !== false) {
        let tags = [exports.TAG_FULL];
        if ((_r = options === null || options === void 0 ? void 0 : options.deletedAt) === null || _r === void 0 ? void 0 : _r.common)
            tags.push(exports.TAG_COMMON);
        if ((_s = options === null || options === void 0 ? void 0 : options.deletedAt) === null || _s === void 0 ? void 0 : _s.preset)
            tags.push(exports.TAG_Preset);
        if ((_t = options === null || options === void 0 ? void 0 : options.deletedAt) === null || _t === void 0 ? void 0 : _t.others)
            tags.push(...(_u = options === null || options === void 0 ? void 0 : options.deletedAt) === null || _u === void 0 ? void 0 : _u.others);
        tagField(store, ((_v = options === null || options === void 0 ? void 0 : options.deletedAt) === null || _v === void 0 ? void 0 : _v.fieldName) || 'deletedAt', tags);
    }
    return store;
}
exports.getBaseTagStore = getBaseTagStore;
function tagField(store, fieldName, tags) {
    for (let tag of tags) {
        let t = store[tag] || (store[tag] = []);
        if (t.indexOf(fieldName) < 0) {
            fieldName === 'id' ? t.unshift(fieldName) : t.push(fieldName);
        }
    }
}
exports.tagField = tagField;
function Tag(store, ...tags) {
    return (target, fieldName) => {
        tags.push(exports.TAG_FULL);
        tags.push(exports.TAG_Preset);
        tagField(store, fieldName, tags);
    };
}
exports.Tag = Tag;
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
exports.pickFields = pickFields;
function filterDataFields(data, fields, modifier) {
    let fs = pickFields(fields, modifier);
    for (let k in data) {
        if (fs.indexOf(k) < 0) {
            delete data[k];
        }
    }
    return data;
}
exports.filterDataFields = filterDataFields;
//# sourceMappingURL=fields.js.map