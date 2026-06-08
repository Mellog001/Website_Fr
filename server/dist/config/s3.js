"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.s3Client = void 0;
const client_s3_1 = require("@aws-sdk/client-s3");
const env_1 = require("./env");
exports.s3Client = new client_s3_1.S3Client({
    credentials: {
        accessKeyId: env_1.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: env_1.env.AWS_SECRET_ACCESS_KEY,
    },
    region: env_1.env.AWS_REGION,
    ...(env_1.env.AWS_S3_ENDPOINT ? {
        endpoint: env_1.env.AWS_S3_ENDPOINT,
        forcePathStyle: true, // Required for custom S3 providers like Cloudflare R2/MinIO
    } : {}),
});
//# sourceMappingURL=s3.js.map