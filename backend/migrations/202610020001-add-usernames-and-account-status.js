export const up = async (db) => {
  await db.collection('users').createIndex({ username: 1 }, { unique: true, sparse: true });
  await db.collection('users').updateMany({ active: { $exists: false } }, { $set: { active: true } });
};

export const down = async (db) => {
  try {
    await db.collection('users').dropIndex('username_1');
  } catch (error) {
    if (error.codeName !== 'IndexNotFound') throw error;
  }
};