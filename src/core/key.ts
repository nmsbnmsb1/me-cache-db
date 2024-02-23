export interface INameKey {
	ns: string;
	nn: string;
}

export interface IPkFieldKey {
	ns: string;
	pkfield: string;
}

export interface IDataKey {
	ns: string;
	nn?: string;
	pkfield?: string;
}
