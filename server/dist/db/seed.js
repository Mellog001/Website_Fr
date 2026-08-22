"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const uuid_1 = require("uuid");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const database_1 = __importDefault(require("../config/database"));
async function main() {
    console.log('🌱 Starting database seeding...');
    // 1. Create Core Subjects
    const subjects = [
        { id: (0, uuid_1.v4)(), name: 'Mathematics', code: 'MATH', description: 'Algebra, Geometry, Calculus and statistics' },
        { id: (0, uuid_1.v4)(), name: 'Physics', code: 'PHYS', description: 'Mechanics, Electromagnetism, Thermodynamics and quantum basics' },
        { id: (0, uuid_1.v4)(), name: 'Chemistry', code: 'CHEM', description: 'Organic, Inorganic, Physical chemistry and lab works' },
        { id: (0, uuid_1.v4)(), name: 'Biology', code: 'BIOL', description: 'Cell biology, Genetics, Evolution and ecology' },
        { id: (0, uuid_1.v4)(), name: 'Computer Science', code: 'CSCI', description: 'Programming, Data structures, Algorithms and databases' },
        { id: (0, uuid_1.v4)(), name: 'English Literature', code: 'ENGL', description: 'Classical literature, Creative writing and literary analysis' },
    ];
    console.log('Seeding subjects...');
    for (const subject of subjects) {
        await database_1.default.execute(`INSERT INTO subjects (id, name, code, description) VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE name = VALUES(name)`, [subject.id, subject.name, subject.code, subject.description]);
    }
    console.log(`✅ Successfully seeded ${subjects.length} subjects.`);
    // 2. Create Platform Admin Account
    const adminEmail = 'admin@educonnect.com';
    const rawAdminPassword = 'AdminSecurePassword2026!';
    const hashedPassword = await bcryptjs_1.default.hash(rawAdminPassword, 12);
    const adminId = (0, uuid_1.v4)();
    console.log(`Seeding Administrator profile [${adminEmail}]...`);
    await database_1.default.execute(`INSERT INTO users (id, email, password_hash, role) VALUES (?, ?, ?, 'ADMIN')
     ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash), role = 'ADMIN'`, [adminId, adminEmail, hashedPassword]);
    console.log('✅ Seed completed successfully!');
    console.log('--------------------------------------------------');
    console.log(`🔑 Administrator Email   : ${adminEmail}`);
    console.log(`🔑 Administrator Password: ${rawAdminPassword}`);
    console.log('--------------------------------------------------');
}
main()
    .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
})
    .finally(async () => {
    await database_1.default.end();
});
//# sourceMappingURL=seed.js.map