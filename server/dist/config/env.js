"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.env = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
const zod_1 = require("zod");
dotenv_1.default.config();
const envSchema = zod_1.z.object({
    PORT: zod_1.z.coerce.number().default(5000),
    NODE_ENV: zod_1.z.enum(['development', 'production', 'test']).default('development'),
    DATABASE_URL: zod_1.z.string().url(),
    JWT_ACCESS_SECRET: zod_1.z.string().min(32),
    JWT_REFRESH_SECRET: zod_1.z.string().min(32),
    REDIS_URL: zod_1.z.string().url().default('redis://localhost:6379'),
    // AWS S3 / Cloudflare R2
    AWS_ACCESS_KEY_ID: zod_1.z.string(),
    AWS_SECRET_ACCESS_KEY: zod_1.z.string(),
    AWS_REGION: zod_1.z.string().default('us-east-1'),
    AWS_S3_BUCKET_NAME: zod_1.z.string(),
    AWS_S3_ENDPOINT: zod_1.z.string().optional(), // For Cloudflare R2 or MinIO compatibility
    // M-Pesa Daraja
    MPESA_CONSUMER_KEY: zod_1.z.string(),
    MPESA_CONSUMER_SECRET: zod_1.z.string(),
    MPESA_SHORTCODE: zod_1.z.string().default('174379'),
    MPESA_PASSKEY: zod_1.z.string(),
    MPESA_CALLBACK_URL: zod_1.z.string().url(),
    MPESA_ENVIRONMENT: zod_1.z.enum(['sandbox', 'production']).default('sandbox'),
    // Email SMTP
    SMTP_HOST: zod_1.z.string().default('smtp.sendgrid.net'),
    SMTP_PORT: zod_1.z.coerce.number().default(587),
    SMTP_USER: zod_1.z.string(),
    SMTP_PASS: zod_1.z.string(),
    EMAIL_FROM: zod_1.z.string().email().default('no-reply@educonnect.com')
});
const _env = envSchema.safeParse(process.env);
if (!_env.success) {
    console.error('❌ Invalid environment variables configuration:', JSON.stringify(_env.error.format(), null, 2));
    process.exit(1);
}
exports.env = _env.data;
//# sourceMappingURL=env.js.map