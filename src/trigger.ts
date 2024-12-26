export type IOnTrigger = (body: any) => Promise<any>;

const TriggerMap: { [name: string]: IOnTrigger[] } = {};

export const Trigger = {
	set(name: string, onTrigger: IOnTrigger) {
		let arr = TriggerMap[name];
		if (!arr) arr = TriggerMap[name] = [];
		if (arr.indexOf(onTrigger) < 0) {
			arr.push(onTrigger);
		}
	},
	async do(name: string, body?: any) {
		// console.log(name);
		let arr = TriggerMap[name];
		// console.log(arr);
		if (!arr || arr.length <= 0) return;
		//
		let ps = [];
		for (let l of arr) {
			ps.push(l(body));
		}
		await Promise.all(ps);
	},
};
