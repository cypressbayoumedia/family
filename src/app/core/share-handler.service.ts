import { Injectable } from '@angular/core';

@Injectable({
    providedIn: 'root'
})
export class ShareHandlerService {

    constructor() { }

    async checkForSharedFile(): Promise<File | null> {
        try {
            const cache = await caches.open('share-target-cache');
            const response = await cache.match('shared-file');

            if (response) {
                const blob = await response.blob();
                await cache.delete('shared-file'); // Clear it after reading
                return new File([blob], 'shared-image.png', { type: blob.type });
            }
            return null;
        } catch (err) {
            console.error('Error reading shared file:', err);
            return null;
        }
    }

    async checkForSharedMetadata(): Promise<{ title?: string, text?: string } | null> {
        try {
            const cache = await caches.open('share-target-cache');
            const response = await cache.match('shared-metadata');

            if (response) {
                const data = await response.json();
                await cache.delete('shared-metadata');
                return data;
            }
            return null;
        } catch (err) {
            console.error('Error reading shared metadata:', err);
            return null;
        }
    }
}
