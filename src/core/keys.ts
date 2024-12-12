export interface NameKey {
	ns: string;
	nn: string;
}

export interface PkFieldKey {
	ns: string;
	pkfield: string;
}

export interface DataKey {
	ns: string;
	nn?: string;
	pkfield?: string;
}
