const slugify = (value) => value
  .normalize('NFKD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/(^-|-$)/g, '');

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const ensureCategory = async (db, name, type) => {
  const cleanName = name.trim();
  const slug = `${type}-${slugify(cleanName)}`;
  await db.collection('categories').updateOne(
    { slug },
    { $setOnInsert: { name: cleanName, slug, type, description: '', createdAt: new Date(), updatedAt: new Date() } },
    { upsert: true }
  );
  return db.collection('categories').findOne({ slug });
};

export const up = async (db) => {
  const artists = db.collection('artists');
  const albums = db.collection('albums');
  const categories = db.collection('categories');
  const musics = db.collection('musics');
  const news = db.collection('news');

  await db.collection('users').createIndex({ email: 1 }, { unique: true });
  await artists.createIndex({ slug: 1 });
  await artists.createIndex({ name: 'text' });
  await albums.createIndex({ artistId: 1, title: 1 });
  await categories.createIndex({ slug: 1 }, { unique: true });
  await musics.createIndex({ title: 'text', artist: 'text' });
  await musics.createIndex({ artistId: 1 });
  await musics.createIndex({ albumId: 1 });
  await musics.createIndex({ categoryId: 1 });
  await musics.createIndex({ publishedAt: -1 });
  await news.createIndex({ title: 'text', category: 'text' });
  await news.createIndex({ categoryId: 1 });
  await db.collection('favorites').createIndex({ userId: 1, musicId: 1 }, { unique: true });
  await db.collection('favorites').createIndex({ userId: 1, createdAt: -1 });
  await db.collection('playlists').createIndex({ userId: 1, updatedAt: -1 });

  for await (const music of musics.find({})) {
    const artistName = typeof music.artist === 'string' ? music.artist.trim() : '';
    let artist = music.artistId ? await artists.findOne({ _id: music.artistId }) : null;

    if (!artist && artistName) {
      artist = await artists.findOne({ name: { $regex: `^${escapeRegex(artistName)}$`, $options: 'i' } });
      if (!artist) {
        const result = await artists.insertOne({
          name: artistName,
          slug: slugify(artistName),
          genre: music.genre || '',
          country: 'Mali',
          image: music.image || '',
          bio: '',
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        artist = { _id: result.insertedId, name: artistName };
      }
    }

    if (!artist) continue;

    const set = {
      artistId: artist._id,
      artist: artist.name,
      audioFile: music.audioFile || music.audioUrl || '',
      coverArt: music.coverArt || music.image || '',
      publishedAt: music.publishedAt || music.createdAt || new Date(),
      playCount: Number.isFinite(music.playCount) ? music.playCount : 0,
    };

    if (typeof music.album === 'string' && music.album.trim()) {
      let album = music.albumId ? await albums.findOne({ _id: music.albumId }) : null;
      if (!album) {
        album = await albums.findOne({ title: music.album.trim(), artistId: artist._id });
      }
      if (!album) {
        const result = await albums.insertOne({
          title: music.album.trim(),
          artistId: artist._id,
          artist: artist.name,
          coverArt: music.coverArt || music.image || '',
          releaseDate: null,
          description: '',
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        album = { _id: result.insertedId };
      }
      set.albumId = album._id;
    }

    if (typeof music.genre === 'string' && music.genre.trim()) {
      const category = await ensureCategory(db, music.genre, 'genre');
      set.categoryId = category._id;
    }

    await musics.updateOne({ _id: music._id }, { $set: set });
  }

  for await (const item of news.find({ category: { $type: 'string', $ne: '' } })) {
    const category = await ensureCategory(db, item.category, 'news');
    await news.updateOne(
      { _id: item._id },
      { $set: { categoryId: category._id, publishedAt: item.publishedAt || item.createdAt || new Date() } }
    );
  }
};

export const down = async (db) => {
  const indexNames = {
    artists: ['slug_1'],
    albums: ['artistId_1_title_1'],
    categories: ['slug_1'],
    musics: ['artistId_1', 'albumId_1', 'categoryId_1', 'publishedAt_-1'],
    news: ['categoryId_1'],
    favorites: ['userId_1_musicId_1', 'userId_1_createdAt_-1'],
    playlists: ['userId_1_updatedAt_-1'],
  };

  for (const [collectionName, names] of Object.entries(indexNames)) {
    const collection = db.collection(collectionName);
    for (const name of names) {
      try {
        await collection.dropIndex(name);
      } catch (error) {
        if (error.codeName !== 'IndexNotFound') throw error;
      }
    }
  }

  await db.collection('musics').updateMany({}, { $unset: { artistId: '', albumId: '', categoryId: '' } });
  await db.collection('news').updateMany({}, { $unset: { categoryId: '' } });
};