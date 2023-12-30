"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Trigger = void 0;
class Trigger {
    static set(name, onTrigger) {
        let arr = Trigger.map[name];
        if (!arr)
            arr = Trigger.map[name] = [];
        if (arr.indexOf(onTrigger) < 0) {
            arr.push(onTrigger);
        }
    }
    static async do(name, body) {
        let arr = Trigger.map[name];
        if (!arr || arr.length <= 0)
            return;
        let ps = [];
        for (let l of arr) {
            ps.push(l(body));
        }
        await Promise.all(ps);
    }
}
exports.Trigger = Trigger;
Trigger.map = {};
//# sourceMappingURL=trigger.js.map