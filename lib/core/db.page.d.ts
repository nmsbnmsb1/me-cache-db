export type PageQuery = (querySql: string) => Promise<any>;
export interface PageData {
    count: number;
    page: number;
    pageSize: number;
    totalPages: number;
    datas: any[];
}
export declare function doPage(page: number, pageSize: number, countField: string, selectSql: string, query: PageQuery): Promise<PageData>;
