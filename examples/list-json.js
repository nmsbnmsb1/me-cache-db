const path = require('path');
const { initCache, List } = require('../lib');
const { JSONCache } = require('../lib/cache/json');

//初始化
initCache(JSONCache.CID, { [JSONCache.CID]: new JSONCache(path.resolve('./examples/json')) });

(async () => {
	let listKey = { ns: 'list', nn: 'test' };
	let ldds = [
		{ ns: 'u', pkfield: 'uuid', as: 'u', fields: 'uuid,name' },
		{ ns: 'xs', pkfield: 'uuid', as: 'xs', fields: 'sex,photo,intro' },
	];
	let selector = async (page, pageSize, order, ldds) => {
		console.log('doSelect');
		//return { count: 0, datas: [] };
		let datas = [
			{
				u_id: 1,
				u_uuid: '3e9e6e35adc64eae996f05cf96898d51',
				u_name: 'u1',
				u_password: 'password1',
				//
				xs_id: 10,
				xs_uuid: '3e9e6e35adc64eae996f05cf96898d51',
				xs_sex: 1,
				xs_photo: 'photo1',
				xs_intro: 'hihi',
			},
			{
				u_id: 2,
				u_uuid: '3e9e6e35adc64eae996f05cf96898d52',
				u_name: 'u2',
				u_password: 'password2',
				//
				xs_id: 11,
				xs_uuid: '3e9e6e35adc64eae996f05cf96898d52',
				xs_sex: 2,
				xs_photo: 'photo2',
				xs_intro: 'hihihi',
			},
		];
		let count = datas.length;
		if (pageSize <= 0) return { count, datas };
		return { count: datas.length, datas: datas.slice(0, pageSize) };
	};
	let build = (data) => {
		return { data };
	};
	let buildAsync = async (data) => {
		return { data };
	};
	//
	let list = new List(JSONCache.CID, listKey, ldds, selector, build);
	let result = await list.sel(1, 0, 'ASC');
	console.log('result1', result);
	result = await list.sel(1, 1, 'ASC');
	console.log('result2', result);
	result = await list.sel(1, 1, 'DESC', undefined, false);
	console.log('result3', result);
	// //
	await list.del(true);
})();
