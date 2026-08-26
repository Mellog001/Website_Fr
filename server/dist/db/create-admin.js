"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const database_1 = __importDefault(require("../config/database"));
const hash_1 = require("../common/utils/hash");
const uuid_1 = require("uuid");
const readline_1 = __importDefault(require("readline"));
const rl = readline_1.default.createInterface({
    input: process.stdin,
    output: process.stdout,
});
function question(prompt) {
    return new Promise((resolve) => {
        rl.question(prompt, resolve);
    });
}
async function createAdmin() {
    try {
        const [rows] = await database_1.default.execute("SELECT id, email FROM users WHERE role = 'ADMIN' LIMIT 1");
        if (rows.length > 0) {
            console.error(`An administrator already exists: ${rows[0].email}`);
            process.exit(1);
        }
        const email = (await question('Admin email: ')).trim();
        const password = await question('Admin password: ');
        if (!email || !password) {
            throw new Error('Email and password are required.');
        }
        if (password.length < 8) {
            throw new Error('Admin password must be at least 8 characters.');
        }
        const [existing] = await database_1.default.execute('SELECT id FROM users WHERE email = ?', [email]);
        if (existing.length > 0) {
            throw new Error('A user with this email already exists.');
        }
        const passwordHash = await (0, hash_1.hashPassword)(password);
        const id = (0, uuid_1.v4)();
        await database_1.default.execute(`INSERT INTO users
        (id, email, password_hash, role, is_email_verified)
       VALUES (?, ?, ?, 'ADMIN', TRUE)`, [id, email, passwordHash]);
        console.log('');
        console.log('=================================');
        console.log('Admin account created successfully');
        console.log('=================================');
        console.log(`Email: ${email}`);
        console.log('Role: ADMIN');
        console.log('Email verification: automatic');
        console.log('');
        process.exit(0);
    }
    catch (error) {
        console.error('');
        console.error('Failed to create admin:');
        console.error(error.message);
        process.exit(1);
    }
    finally {
        rl.close();
    }
}
createAdmin();
//# sourceMappingURL=create-admin.js.map