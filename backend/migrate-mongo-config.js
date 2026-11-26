import 'dotenv/config';

if (!process.env.MONGODB_URI) {
  throw new Error('MONGODB_URI is required to run database migrations.');
}

export default {
  mongodb: {
    url: process.env.MONGODB_URI,
    options: {},
  },
  migrationsDir: 'migrations',
  changelogCollectionName: 'schema_migrations',
  lockCollectionName: 'schema_migrations_lock',
  migrationFileExtension: '.js',
  moduleSystem: 'esm',
};