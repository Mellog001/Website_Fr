import pool from '../../src/config/database';

/**
 * Truncate all MySQL tables in the schema safely
 */
export async function cleanDatabase() {
  const tableNames = [
    'submissions',
    'assessments',
    'materials',
    'modules',
    'payments',
    'enrollments',
    'sessions',
    'tutor_competency_tests',
    'courses',
    'tutor_profiles',
    'subjects',
    'users',
  ];

  try {
    await pool.execute('SET FOREIGN_KEY_CHECKS = 0');
    for (const tableName of tableNames) {
      await pool.execute(`TRUNCATE TABLE \`${tableName}\``);
    }
    await pool.execute('SET FOREIGN_KEY_CHECKS = 1');
  } catch (error) {
    console.error('❌ Failed to clean database during tests setup:', error);
    throw error;
  }
}

export default { cleanDatabase };
