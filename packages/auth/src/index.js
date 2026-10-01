import * as bcrypt from 'bcrypt';
export async function comparePassword(plainText, hash) {
    if (!plainText || !hash)
        return false;
    return bcrypt.compare(plainText, hash);
}
export async function hashPassword(plainText) {
    const salt = await bcrypt.genSalt(12);
    return bcrypt.hash(plainText, salt);
}
//# sourceMappingURL=index.js.map