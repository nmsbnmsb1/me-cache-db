const Model = require('./../../me-models/lib').default;
const Mysql = require('./../../me-models-mysql/lib').default;
Model.setCommon({ logConnect: true, logSql: true, logger: (msg) => console.log(msg) });
Model.addConfig(
	'mysql',
	{
		handle: Mysql,
		host: 'localhost', // host
		port: 3306, // 端口
		user: 'root', // 用户名
		password: '11111111', // 密码
		//
		database: 'tjxx', // 数据库
		connectionLimit: 1, // 连接池的连接个数，默认为 1
		prefix: '', // 数据表前缀，如果一个数据库里有多个项目，那项目之间的数据表可以通过前缀来区分
		acquireWaitTimeout: 0, // 等待连接的超时时间，避免获取不到连接一直卡在那里，开发环境下有用
		reuseDB: false, // 是否复用数据库连接，事务的时候可能会用到
		charset: 'utf8mb4',
	},
	true
);

module.exports = {
	async queryBySql(sql) {
		return Model.get('urls').query(sql);
	},
};
