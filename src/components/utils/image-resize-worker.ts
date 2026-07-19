// Runs in a dedicated Worker (see local-resize.ts). Receives raw image
// bytes already fetched by the main process (to avoid canvas-tainting from
// cross-origin fetches) and returns a downscaled, re-encoded Blob.
interface ResizeRequest {
    id: number
    bytes: Uint8Array
    type: string
    width: number
    height: number
}

const worker = self as unknown as {
    postMessage: (message: any, transfer?: Transferable[]) => void
    onmessage: (event: MessageEvent<ResizeRequest>) => void
}

worker.onmessage = async event => {
    const { id, bytes, type, width, height } = event.data
    try {
        const blob = new Blob([bytes], { type: type || "application/octet-stream" })
        const bitmap = await createImageBitmap(blob)

        // Mimic CSS object-fit: cover - scale to cover the target box, then
        // center-crop the overflow, instead of stretching to the exact
        // width/height (which distorts anything that isn't already the
        // target aspect ratio).
        const scale = Math.max(width / bitmap.width, height / bitmap.height)
        const sw = width / scale
        const sh = height / scale
        const sx = (bitmap.width - sw) / 2
        const sy = (bitmap.height - sh) / 2

        const canvas = new OffscreenCanvas(width, height)
        const ctx = canvas.getContext("2d")
        ctx.drawImage(bitmap, sx, sy, sw, sh, 0, 0, width, height)
        bitmap.close()
        const resized = await canvas.convertToBlob({
            type: "image/jpeg",
            quality: 0.85,
        })
        worker.postMessage({ id, blob: resized })
    } catch (err) {
        worker.postMessage({ id, error: String(err) })
    }
}
