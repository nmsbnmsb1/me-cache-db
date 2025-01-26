export type PageQuery = (querySql: string) => Promise<any>;
export interface PageData<T = any> {
    count: number;
    page: number;
    pageSize: number;
    totalPages: number;
    datas: T[];
}
export declare function doPage<T = any>(page: number, pageSize: number, countField: string, selectSql: string, query: PageQuery): Promise<PageData<T>>;
