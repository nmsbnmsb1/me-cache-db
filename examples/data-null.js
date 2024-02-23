const { initCache, sel } = require('../lib');
const { NullCache } = require('../lib/cache/null');
//初始化
initCache(NullCache.CID, { [NullCache.CID]: new NullCache() });

//测试
(async () => {
	let datas = [
		{ u_uuid: '3e9e6e35adc64eae996f05cf96898d51', xs_uuid: '3e9e6e35adc64eae996f05cf96898d51' },
		{ u_uuid: '3e9e6e35adc64eae996f05cf96898d52', xs_uuid: '3e9e6e35adc64eae996f05cf96898d52' },
	];
	let dds = [
		{ ns: 'u', pkfield: 'uuid', as: 'u', fields: 'uuid,name' },
		{ ns: 'xs', pkfield: 'uuid', as: 'xs', fields: 'sex,photo,intro' },
	];
	let selector = async () => {
		console.log('selector');
		return [
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
	};
	//
	datas = await sel(NullCache.CID, datas, dds, selector);
	//
	console.log('result', datas);
})();
