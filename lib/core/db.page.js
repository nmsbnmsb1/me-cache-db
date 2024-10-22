"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.doPage = doPage;
async function doPage(page, pageSize, countField, sql, query) {
    let totalCount;
    let rs;
    if (pageSize > 0) {
        let countData = await query(`select COUNT(${countField}) as count from (${sql}) as a`);
        if (!countData || countData.length === 0 || countData[0].count <= 0) {
            totalCount = 0;
        }
        else {
            totalCount = countData[0].count;
            rs = await query(`${sql} limit ${(page - 1) * pageSize},${pageSize}`);
        }
    }
    else {
        rs = await query(`${sql}`);
        totalCount = rs.length;
    }
    return {
        count: totalCount,
        page,
        pageSize,
        totalPages: pageSize <= 0 ? 1 : Math.ceil(totalCount / pageSize),
        datas: rs || [],
    };
}
//# sourceMappingURL=db.page.js.map