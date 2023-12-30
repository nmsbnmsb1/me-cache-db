const path = require('path');
const { initCache, sel } = require('../lib');
const { JSONCache } = require('../lib/cache/json');
const Model = require('./db');

//初始化
initCache(JSONCache.CID, { [JSONCache.CID]: new JSONCache(path.resolve('./examples/json')) });

//测试
(async () => {
	let datas = [
		{ ur_role_uuid: '2001-3e9e6e35adc64eae848f05cf96898d51', ds_role_uuid: '2001-3e9e6e35adc64eae848f05cf96898d51' },
		{ ur_role_uuid: '2001-3e9e6e35adc64eae848f05cf96898d51', ds_role_uuid: '2001-3e9e6e35adc64eae848f05cf96898d51' },
	];
	let sds = [
		{ ns: 'ur', pkfield: 'role_uuid', as: 'ur', fields: 'uuid,role_uuid,role_id' },
		{ ns: 'ds', pkfield: 'role_uuid', as: 'ds', fields: 'sex,photo,intro' },
	];
	let selector = async () => {
		let data = await Model.queryBySql(
			`select 
				ur.uuid as ur_uuid,ur.role_uuid as ur_role_uuid,ur.role_id as ur_role_id,
				ds.uuid as ds_uuid,ds.role_uuid as ds_role_uuid,ds.sex as ds_sex,ds.photo as ds_photo,ds.intro as ds_intro,ds.description as ds_description
				from user_role as ur left join user_role_profile as ds on ur.role_uuid = ds.role_uuid 
				where ur.role_uuid in ('2001-3e9e6e35adc64eae848f05cf96898d51') 
			`
		);
		return [{ ...data[0] }, { ...data[0] }];
	};
	//
	//
	datas = await sel(JSONCache.CID, datas, sds, selector);
	//
	console.log('result', datas);
})();
