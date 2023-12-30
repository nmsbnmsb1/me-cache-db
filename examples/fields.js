const Fields = require('../lib/core/fields');

(async () => {
	//
	console.log(Fields.hasAs(`a`, `uuid`));
	console.log(Fields.hasAs(`a`, `a_uuid`));
	//
	console.log(Fields.attachAs(`a`, `uuid`));
	//
	console.log(Fields.cutAs(`a`, `a_uuid`));
	//
	console.log(Fields.pickFields(`id,uuid,phone,sex,name`, { 'uuid2,name2': true }));
	console.log(Fields.pickFields(`id,uuid,phone,sex,name`, { 'uuid,name,sex2': false }));
	console.log(Fields.pickFields(`id,uuid,phone,sex,name`, { 'uuid2,name2': true, uuid: 'override' }));
})();
