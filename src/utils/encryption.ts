import crypto from 'crypto';

const ALGORITHM = 'aes-256-cbc';

export const encrypt = (text: string): string => {
    const key = process.env.ENCRYPTION_KEY;
    if (!key) throw new Error('Missing ENCRYPTION_KEY environment variable');

    const keyBuffer = crypto.createHash('sha256').update(String(key)).digest();

    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(ALGORITHM, keyBuffer, iv);

    let encrypted = cipher.update(text);
    encrypted = Buffer.concat([encrypted, cipher.final()]);

    return iv.toString('hex') + ':' + encrypted.toString('hex');
};

export const decrypt = (text: string): string => {
    const key = process.env.ENCRYPTION_KEY;
    if (!key) throw new Error('Missing ENCRYPTION_KEY environment variable');

    const keyBuffer = crypto.createHash('sha256').update(String(key)).digest();

    const textParts = text.split(':');
    const iv = Buffer.from(textParts.shift()!, 'hex');
    const encryptedText = Buffer.from(textParts.join(':'), 'hex');

    const decipher = crypto.createDecipheriv(ALGORITHM, keyBuffer, iv);

    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);

    return decrypted.toString();
};
