const { getFieldWhereSql, getWhereSql } = require('../lib/core/db.where');

function check(sql, expected) {
	if (sql === expected) console.log('✅', sql);
	else console.error('❌', `${sql}, expected:  ${expected}`);
}

(async () => {
	let sql;
	let expected;
	//ParseSearchParam IS NULL
	check(getFieldWhereSql('id', null), '`id` IS NULL');
	check(getFieldWhereSql('id', ['!=', null]), '`id` IS NOT NULL');
	check(getFieldWhereSql('id', ['is', null]), '`id` IS NULL');
	check(getFieldWhereSql('id', ['is not', null]), '`id` IS NOT NULL');
	//ParseSearchParam Eq
	check(getFieldWhereSql('id', 10), '`id` = 10');
	check(getFieldWhereSql('id', 'uuid'), "`id` = 'uuid'");
	check(getFieldWhereSql('id', ['!=', 10]), '`id` != 10');
	check(getFieldWhereSql('id', ['!=', 'uuid']), "`id` != 'uuid'");
	//ParseSearchParam LIKE/NOT LIKE
	check(getFieldWhereSql('id', ['not like', 'daniel']), "`id` NOT LIKE 'daniel'");
	check(getFieldWhereSql('id', ['like', '%daniel%']), "`id` LIKE '%daniel%'");
	check(getFieldWhereSql('id', ['like', ['%dan%', '%iel%']]), "`id` LIKE '%dan%' OR `id` LIKE '%iel%'");
	//ParseSearchParam IN/NOT IN
	check(getFieldWhereSql('id', ['in', [1, 2, 'a']]), "`id` IN (1,2,'a')");
	check(getFieldWhereSql('id', ['not in', [1, 2, 'a']]), "`id` NOT IN (1,2,'a')");
	//ParseSearchParam BETWEEN/NOT BETWEEN
	check(getFieldWhereSql('id', ['BETWEEN', [1, 2]]), '`id` BETWEEN 1 AND 2');
	check(getFieldWhereSql('id', ['NOT BETWEEN', [1, 2]]), '`id` NOT BETWEEN 1 AND 2');
	check(getFieldWhereSql('id', [ '>', 0, 'or', '<', 10 ]), '`id` > 0 OR `id` < 10');
	check(getFieldWhereSql('id', [ 'IN', [] ]), "");
	check(getFieldWhereSql('id', [ 'IN', [1, 2, 'a'],'<', 10, '=', null ]), "`id` IN (1,2,'a') AND `id` < 10 AND `id` IS NULL");
	//ParseWhere
	check(getWhereSql('', { id: 10, name: 'daniel' }), "`id` = 10 AND `name` = 'daniel'");
	check(getWhereSql('', { id: 10, _logic: 'OR', name: 'daniel' }), "`id` = 10 OR `name` = 'daniel'");
	check(
		getWhereSql('', { id: 10, name: 'daniel', _child1: { age: 30, _logic: 'OR', sex: '2' } }),
		"`id` = 10 AND `name` = 'daniel' AND (`age` = 30 OR `sex` = '2')"
	);
	check(
		getWhereSql('b', { id: 10, name: 'daniel', _child1: { age: 30, _logic: 'OR', sex: ['in', ['2', '4']] } }),
		"`b.id` = 10 AND `b.name` = 'daniel' AND (`b.age` = 30 OR `b.sex` IN ('2','4'))"
	);
	check(
		getWhereSql('c', {
			name: ['like', '%John%'],
			age: ['(','between', [18, 30],')'],
			_logic: 'OR',
			address: {
				city: 'New York',
				_logic: 'AND',
				zip: ['!=', null],
			},
		}),
		"`c.name` LIKE '%John%' OR ( `c.age` BETWEEN 18 AND 30 ) OR (`c.city` = 'New York' AND `c.zip` IS NOT NULL)"
	);
	check(getWhereSql('x', { status: null, uid: [ 'NOT IN', [] ] }),"`x.status` IS NULL");
})();
