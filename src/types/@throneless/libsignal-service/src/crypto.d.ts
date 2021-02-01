export function decryptProfile(data: ArrayBuffer, key: ArrayBuffer): Promise<ArrayBuffer>;

export function decryptProfileName(encryptedProfileName: string, key: ArrayBuffer): Promise<{
    given: ArrayBuffer,
    family: ArrayBuffer|null,
}>;

export function base64ToArrayBuffer(base64string: string): ArrayBuffer;
