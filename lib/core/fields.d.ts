export interface As {
    as?: string;
}
export declare function hasAs(as: string, asField: string): boolean;
export declare function attachAs(as: string, field: string): string;
export declare function cutAs(as: string, asField: string): string;
export interface FieldsModifier {
    [name: string]: boolean | 'override';
}
export interface FieldsPicker {
    base: string | string[];
    modifier: FieldsModifier;
}
export type Fields = string | string[] | FieldsPicker;
export declare function pickFields(base: Fields, modifier?: FieldsModifier): string[];
export declare function filterDataFields(data: any, base: Fields, modifier?: FieldsModifier): any;
export declare class FieldScheme {
    private base;
    private m;
    constructor(base: string | string[], m: {
        [scheme: string]: string | string[] | FieldsModifier;
    });
    getBase(modifier?: FieldsModifier): string[];
    getFields(fields: string | string[] | FieldsModifier | FieldsPicker): string[];
    getFieldsOptions(fields: string | string[] | FieldsModifier | FieldsPicker): FieldsOptions;
    getDbFieldsOptions(fields: string | string[] | FieldsModifier | FieldsPicker): FieldsOptions;
    filterDataFields(data: any, fields: string | string[] | FieldsModifier | FieldsPicker): string;
}
export interface FieldsOptions extends As {
    fields?: Fields;
    dbFields?: Fields;
}
