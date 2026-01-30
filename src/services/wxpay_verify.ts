import fs from 'fs';
import crypto from 'crypto';
import { config } from '../config/index';

export function loadPlatformPublicKey(): string | null {
  const p = config.wechat.platformCertPath;
  if (!p) return null;
  try { return fs.readFileSync(p, 'utf8'); } catch { return null; }
}

export function verifySignature(timestamp: string, nonce: string, body: string, signature: string, platformPublicKeyPem: string): boolean {
  const message = `${timestamp}\n${nonce}\n${body}\n`;
  const verifier = crypto.createVerify('RSA-SHA256');
  verifier.update(message);
  verifier.end();
  try {
    const ok = verifier.verify(platformPublicKeyPem, signature, 'base64');
    return ok;
  } catch {
    return false;
  }
}

