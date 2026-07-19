// Resizes thumbnails locally: fetches bytes via the main process (so the
// canvas isn't cross-origin-tainted), then decodes/downscales/re-encodes in
// a Worker so the renderer's main thread stays free while scrolling.
// Results are cached by url+size so Fluent UI's virtualized card list can
// remount the same card repeatedly without redoing the work.

const CACHE_LIMIT = 400

const cache = new Map<string, Promise<string>>()
let worker: Worker | null = null
let nextId = 1
const pending = new Map<
    number,
    { resolve: (url: string) => void; reject: (err: any) => void }
>()

function getWorker(): Worker {
    if (!worker) {
        worker = new Worker("image-resize-worker.js")
        worker.onmessage = (e: MessageEvent) => {
            const { id, blob, error } = e.data
            const p = pending.get(id)
            if (!p) return
            pending.delete(id)
            if (error) {
                p.reject(new Error(error))
            } else {
                p.resolve(URL.createObjectURL(blob))
            }
        }
        worker.onerror = () => {
            for (const p of pending.values()) {
                p.reject(new Error("image-resize-worker failed to run"))
            }
            pending.clear()
        }
    }
    return worker
}

const evictIfNeeded = () => {
    if (cache.size < CACHE_LIMIT) return
    const oldestKey = cache.keys().next().value
    if (oldestKey === undefined) return
    cache
        .get(oldestKey)
        ?.then(url => URL.revokeObjectURL(url))
        .catch(() => {})
    cache.delete(oldestKey)
}

export function resizeImageLocally(
    src: string,
    width: number,
    height: number
): Promise<string> {
    const key = `${src}|${width}x${height}`
    const cached = cache.get(key)
    if (cached) return cached

    const promise = window.utils
        .fetchImageBytes(src)
        .then(
            ({ bytes, type }) =>
                new Promise<string>((resolve, reject) => {
                    const id = nextId++
                    pending.set(id, { resolve, reject })
                    getWorker().postMessage(
                        { id, bytes, type, width, height },
                        [bytes.buffer]
                    )
                })
        )

    promise.catch(() => cache.delete(key))
    evictIfNeeded()
    cache.set(key, promise)
    return promise
}
