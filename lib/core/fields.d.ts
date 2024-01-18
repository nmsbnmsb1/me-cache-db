export interface IAs {
    as?: string;
}
export declare function hasAs(as: string, asField: string): boolean;
export declare function attachAs(as: string, field: string): string;
export declare function cutAs(as: string, asField: string): string;
export declare const TAG_FULL = "full";
export declare const TAG_COMMON = "common";
export declare const TAG_Preset = "preset";
export interface ITagStore {
    [TAG_FULL]: string[];
    [TAG_COMMON]: string[];
    [TAG_Preset]: string[];
    [tagName: string]: string[];
}
export declare function getBaseTagStore(options?: {
    id?: {
        fieldName?: string;
        common?: boolean;
        preset?: boolean;
        others?: string[];
    } | false;
    createdAt?: {
        fieldName?: string;
        common?: boolean;
        preset?: boolean;
        others?: string[];
    } | false;
    updatedAt?: {
        fieldName?: string;
        common?: boolean;
        preset?: boolean;
        others?: string[];
    } | false;
    deletedAt?: {
        fieldName?: string;
        common?: boolean;
        preset?: boolean;
        others?: string[];
    } | false;
}): ITagStore;
export declare function Tag(store: ITagStore, ...tags: string[]): (target: any, fieldName: string) => void;
export interface IFieldsModifier {
    [name: string]: boolean | 'override';
}
export interface IFields extends IAs {
    fields?: string | string[];
    fieldsModifier?: IFieldsModifier;
    needFields?: string[];
}
export declare function pickFields(fields: string | string[] | IFields, modifier?: IFieldsModifier): string[];
export declare function filterDataFields(data: any, fields: string | string[] | IFields, modifier?: IFieldsModifier): any;
