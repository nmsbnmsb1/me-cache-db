export type IOnTrigger = (body: any) => Promise<any>;

export class Trigger {
	private static map: { [name: string]: IOnTrigger[] } = {};

	public static set(name: string, onTrigger: IOnTrigger) {
		let arr = Trigger.map[name];
		if (!arr) arr = Trigger.map[name] = [];
		if (arr.indexOf(onTrigger) < 0) {
			arr.push(onTrigger);
		}
	}
	public static async do(name: string, body?: any) {
		// console.log(name);
		let arr = Trigger.map[name];
		// console.log(arr);
		if (!arr || arr.length <= 0) return;
		//
		let ps = [];
		for (let l of arr) {
			ps.push(l(body));
		}
		await Promise.all(ps);
	}
}
