const { initCache, List } = require('../lib');
const { RedisCache } = require('../lib/cache/redis');
const Model = require('./db');

//初始化
initCache(RedisCache.CID, { [RedisCache.CID]: new RedisCache() });

(async () => {
	let listKey = { ns: 'dss', listName: 'test' };
	let sds = [
		{ ns: 'ur', pkfield: 'role_uuid', as: 'ur', fields: 'uuid,role_uuid,role_id' },
		{ ns: 'ds', pkfield: 'role_uuid', as: 'ds', fields: 'sex,photo,intro' },
	];
	let selector = async () => {
		let datas = await Model.queryBySql(
			`select 
			ur.uuid as ur_uuid,ur.role_uuid as ur_role_uuid,ur.role_id as ur_role_id,
			ds.uuid as ds_uuid,ds.role_uuid as ds_role_uuid,ds.sex as ds_sex,ds.photo as ds_photo,ds.intro as ds_intro,ds.description as ds_description
			from user_role as ur left join user_role_profile as ds on ur.role_uuid = ds.role_uuid 
			where ur.role_uuid in ('2001-3e9e6e35adc64eae848f05cf96898d51') 
			`
		);
		//return { count: 0, datas: [] };
		return { count: datas.length, datas: [{ ...datas[0] }] };
	};
	let build = (data) => {
		return { data };
	};
	let buildAsync = async (data) => {
		return { data };
	};
	//
	let list = new List(RedisCache.CID, listKey, sds, selector, { build: buildAsync });
	let result = await list.sel(1, 0, 'ASC');
	console.log('result1', result.datas);
	result = await list.sel(1, 1);
	console.log('result2', result);
	result = await list.sel(1, 1, 'DESC');
	console.log('result3', result);

	await list.del(true);
})();
