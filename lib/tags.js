function createTagMap(list) {
  const map = new Map();
  list.forEach(tag => map.set(tag.Key, tag.Value));
  return map;
}

export { createTagMap };
