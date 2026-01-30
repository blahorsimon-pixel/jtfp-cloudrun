import crypto from 'crypto';

export interface WxNotifyResource {
  original_type: string;
  algorithm: string; // AEAD_AES_256_GCM
  ciphertext: string;
  associated_data?: string;
  nonce: string;
}

export function decryptResource(resource: WxNotifyResource, apiV3Key: string): any {
  const { ciphertext, nonce, associated_data } = resource;
  const key = Buffer.from(apiV3Key, 'utf8');
  const associatedData = associated_data ? Buffer.from(associated_data, 'utf8') : undefined;
  const cipherBuffer = Buffer.from(ciphertext, 'base64');
  const dataLen = cipherBuffer.length - 16; // last 16 bytes is auth tag
  const data = cipherBuffer.subarray(0, dataLen);
  const authTag = cipherBuffer.subarray(dataLen);
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(nonce, 'utf8'));
  if (associatedData) decipher.setAAD(associatedData);
  decipher.setAuthTag(authTag);
  const decrypted = Buffer.concat([decipher.update(data), decipher.final()]);
  const json = JSON.parse(decrypted.toString('utf8'));
  return json;
}

