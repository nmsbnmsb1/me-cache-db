import { IFields } from './fields';
import { IWhere } from './db.where';
export type SqlStatement = string | (() => string);
export interface IOn {
    [field: string]: {
        tableName: string;
        onField: string;
    };
}
export type OrderDefinition = 'ASC' | 'DESC';
export interface IOrder {
    [field: string]: OrderDefinition | string;
}
export interface ISqlOptions extends IFields {
    tableName: string;
    on?: IOn;
    where?: SqlStatement | IWhere;
    order?: SqlStatement | IOrder;
}
export declare function getLeftJoinSql(options: ISqlOptions[]): string;
