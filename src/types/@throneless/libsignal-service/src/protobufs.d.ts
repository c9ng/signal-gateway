interface Type {
    name: string,
    options: {[key: string]: any},
}

export function lookupType(type: string): Type|null;
