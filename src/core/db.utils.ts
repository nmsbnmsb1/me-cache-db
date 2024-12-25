export function toBoolean(b: any) {
	if (typeof b === 'number') return b === 0 ? 0 : 1;
	if (typeof b === 'boolean') return b === true ? 1 : 0;
	return b ? 1 : 0;
}
// biome-ignore lint/suspicious/noShadowRestrictedNames: 就使用这个名称
export function escape(str: string) {
	if (!str) return '';
	// str = mysql.escape(str);
	// biome-ignore lint/suspicious/noControlCharactersInRegex: 1
	return str.replace(/[\0\n\r\b\t\\'"\x1a]/g, (s: string) => {
		switch (s) {
			case '\0':
				return '\\0';
			case '\n':
				return '\\n';
			case '\r':
				return '\\r';
			case '\b':
				return '\\b';
			case '\t':
				return '\\t';
			case '\x1a':
				return '\\Z';
			default:
				return '\\' + s;
		}
	});
}
export function sanitizeSQL(sql: string) {
	// 移除回车符和换行符，替换连续的空白字符为单个空格
	return sql.replace(/[\r\n]/g, '').replace(/\s+/g, ' ');
}
