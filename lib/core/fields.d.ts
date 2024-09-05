export interface IAs {
    as?: string;
}
export declare function hasAs(as: string, asField: string): boolean;
export declare function attachAs(as: string, field: string): string;
export declare function cutAs(as: string, asField: string): string;
export interface IFieldsModifier {
    [name: string]: boolean | 'override';
}
export interface IFields extends IAs {
    fields?: string | string[];
    fieldsModifier?: IFieldsModifier;
    needFields?: string[];
}
export type Fields = string | string[] | IFields;
export declare function pickFields(fields: Fields, modifier?: IFieldsModifier): string[];
export declare function filterDataFields(data: any, fields: Fields, modifier?: IFieldsModifier): any;
export declare class FieldScheme {
    private m;
    constructor(m: {
        [scheme: string]: string;
    });
    getFields(fields: Fields): IFields;
    pickFields(fields: Fields): string[];
    filterDataFields(data: any, fields: Fields): string;
}
