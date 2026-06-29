const CACHE_NAME = 'vytal-cache-v1';
const ASSETS = ['/vytal/index.html', '/vytal/manifest.json'];

self.addEventListener('install', function(e){
  e.waitUntil(caches.open(CACHE_NAME).then(function(cache){
    return cache.addAll(ASSETS);
  }));
});

self.addEventListener('activate', function(e){
  e.waitUntil(caches.keys().then(function(keys){
    return Promise.all(keys.filter(function(k){ return k !== CACHE_NAME; }).map(function(k){ return caches.delete(k); }));
  }));
});

self.addEventListener('fetch', function(e){
  if(e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request).then(function(cached){
      if(cached) return cached;
      return fetch(e.request).then(function(res){
        if(res.ok && e.request.url.indexOf('/vytal/') !== -1){
          const clone = res.clone();
          caches.open(CACHE_NAME).then(function(cache){ cache.put(e.request, clone); });
        }
        return res;
      }).catch(function(){ return cached; });
    })
  );
});
