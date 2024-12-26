"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Trigger = void 0;
const TriggerMap = {};
exports.Trigger = {
    set(name, onTrigger) {
        let arr = TriggerMap[name];
        if (!arr)
            arr = TriggerMap[name] = [];
        if (arr.indexOf(onTrigger) < 0) {
            arr.push(onTrigger);
        }
    },
    async do(name, body) {
        let arr = TriggerMap[name];
        if (!arr || arr.length <= 0)
            return;
        let ps = [];
        for (let l of arr) {
            ps.push(l(body));
        }
        await Promise.all(ps);
    },
};
//# sourceMappingURL=trigger.js.map