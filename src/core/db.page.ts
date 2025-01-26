export type PageQuery = (querySql: string) => Promise<any>;

export interface PageData<T = any> {
	count: number;
	page: number;
	pageSize: number;
	totalPages: number;
	datas: T[];
}

export async function doPage<T = any>(
	page: number,
	pageSize: number,
	countField: string,
	selectSql: string,
	query: PageQuery
) {
	let totalCount: number;
	let rs: any;
	//如果分页查询
	if (pageSize > 0) {
		let countData = await query(`select COUNT(${countField}) as count from (${selectSql}) as a`);
		if (!countData || countData.length === 0 || countData[0].count <= 0) {
			totalCount = 0;
		} else {
			totalCount = countData[0].count;
			rs = await query(`${selectSql} limit ${(page - 1) * pageSize},${pageSize}`);
		}
	} else {
		rs = await query(`${selectSql}`);
		totalCount = rs.length;
	}
	return {
		count: totalCount,
		page,
		pageSize,
		totalPages: pageSize <= 0 ? 1 : Math.ceil(totalCount / pageSize),
		datas: rs || [],
	} as PageData<T>;
}
