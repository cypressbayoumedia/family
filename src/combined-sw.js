importScripts('./ngsw-worker.js');

self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    // Intercept the share target POST request
    if (event.request.method === 'POST' && url.pathname === '/share-target') {
        event.respondWith(handleShareTarget(event.request));
        return;
    }

    // Find the Angular SW fetch handler (it's usually the last one registered by importScripts)
    // However, importScripts executes code immediately. ngsw-worker registers its own listeners.
    // We don't need to manually call it. We just need to NOT call respondWith if it's not our target.
    // BUT, if we don't call respondWith, the browser checks other listeners.
    // The NGSW Fetch listener will catch everything else.
});

async function handleShareTarget(request) {
    try {
        const formData = await request.formData();
        const media = formData.get('media'); // 'media' matches the name in manifest
        const title = formData.get('title');
        const text = formData.get('text');

        // Store in Cache API so client can read it
        const cache = await caches.open('share-target-cache');

        if (media) {
            await cache.put('shared-file', new Response(media));
        }

        // Store metadata if needed, for simplicity let's just use query params for text
        // But text can be long. Let's store metadata in cache too.
        const metadata = JSON.stringify({ title, text });
        await cache.put('shared-metadata', new Response(metadata));

        // Redirect to the app
        return Response.redirect('/create-post?shared=true', 303);
    } catch (err) {
        console.error('Share target failed', err);
        return Response.redirect('/', 303);
    }
}
