"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.stopJobProcessor = exports.startJobProcessor = void 0;
/**
 * This file previously contained a BullMQ Worker.
 * The BullMQ / Redis stack has been removed.
 *
 * Job processing is now handled by the MySQL-backed job processor.
 * See: src/jobs/job-processor.ts
 */
var job_processor_1 = require("../job-processor");
Object.defineProperty(exports, "startJobProcessor", { enumerable: true, get: function () { return job_processor_1.startJobProcessor; } });
Object.defineProperty(exports, "stopJobProcessor", { enumerable: true, get: function () { return job_processor_1.stopJobProcessor; } });
//# sourceMappingURL=payment.worker.js.map