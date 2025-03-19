const inMemoryCache = {};

const inMemoryCacheModule = {
  get: (key) => {
    return inMemoryCache[key];
  },
  set: (key, value) => {
    inMemoryCache[key] = value;
  },
  delete: (key) => {
    delete inMemoryCache[key];
  },
  exists: (key) => {
    return inMemoryCache.hasOwnProperty(key);
  },
  clear: () => {
    Object.keys(inMemoryCache).forEach((key) => {
      delete inMemoryCache[key];
    });
  },
};

export default inMemoryCacheModule;
