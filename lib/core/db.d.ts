import { type FieldsOptions } from './fields';
import { type WhereOptions } from './db.where';
export type SqlStatement = string | (() => string);
export interface OnOptions {
    [field: string]: {
        tableName: string;
        onField: string;
    };
}
export type OrderDefinition = 'ASC' | 'DESC';
export interface OrderOptions {
    [field: string]: OrderDefinition | string;
}
export interface SqlOptions extends FieldsOptions {
    tableName: string;
    on?: OnOptions;
    where?: SqlStatement | WhereOptions;
    order?: SqlStatement | OrderOptions;
}
export declare function getLeftJoinSql(options: SqlOptions[]): string;
