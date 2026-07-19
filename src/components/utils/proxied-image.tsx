import * as React from "react"
import { ThumbnailResizeMode } from "../../schema-types"
import { resizeImageLocally } from "./local-resize"

const IMAGE_PROXY = "https://images.weserv.nl/?url="
// Generated via canvas instead of a hand-copied data URI - canvas pixels are
// transparent (0,0,0,0) by default, so this is guaranteed to actually be
// transparent (unlike several "known" 1x1 transparent GIF snippets floating
// around online, which turn out to encode an opaque white pixel instead).
const BLANK_IMAGE = (() => {
    const canvas = document.createElement("canvas")
    canvas.width = 1
    canvas.height = 1
    return canvas.toDataURL()
})()

// Cached in-memory so every card render doesn't need a sync IPC round trip.
// Kept in sync with the store via setResizeMode when the setting changes.
let resizeMode: ThumbnailResizeMode = window.settings.getThumbnailResizeMode()
export const setResizeMode = (mode: ThumbnailResizeMode) => {
    resizeMode = mode
}

// Whether a thumbnail that fails to load directly (dead link, CORS block,
// timeout, etc.) should be retried through images.weserv.nl as a last
// resort, rather than just staying broken.
let errorFallbackProxy: boolean =
    window.settings.getImageErrorFallbackProxy()
export const setErrorFallbackProxy = (enabled: boolean) => {
    errorFallbackProxy = enabled
}

interface Resize {
    width: number
    height: number
}

interface Props extends React.ImgHTMLAttributes<HTMLImageElement> {
    src: string
    // Thumbnails can be downscaled before loading instead of decoding the
    // full-resolution source for a small card image. How/if this
    // happens is controlled by the "Thumbnail resizing" app setting.
    resize?: Resize
}

const scaledSize = (resize: Resize) => {
    const scale = Math.min(window.devicePixelRatio || 1, 2)
    return {
        width: Math.round(resize.width * scale),
        height: Math.round(resize.height * scale),
    }
}

const buildProxySrc = (src: string, resize: Resize) => {
    const { width, height } = scaledSize(resize)
    return `${IMAGE_PROXY}${encodeURIComponent(
        src
    )}&w=${width}&h=${height}&fit=cover&q=75`
}

export const ProxiedImage: React.FunctionComponent<Props> = ({
    src: originalSrc,
    resize,
    className,
    ...rest
}) => {
    const mode = resize ? resizeMode : ThumbnailResizeMode.Off

    const [src, setSrc] = React.useState(() => {
        if (mode === ThumbnailResizeMode.Proxy) return buildProxySrc(originalSrc, resize)
        if (mode === ThumbnailResizeMode.Local) return BLANK_IMAGE
        return originalSrc
    })
    const [usedProxy, setUsedProxy] = React.useState(
        mode === ThumbnailResizeMode.Proxy
    )
    // Only meaningful in Local mode: true while the worker is still
    // decoding/resizing, used to show a skeleton placeholder instead of
    // the blank pixel.
    const [isLoading, setIsLoading] = React.useState(
        mode === ThumbnailResizeMode.Local
    )
    // True once the browser has actually painted the current src, used to
    // fade the image in instead of having it pop in abruptly. Reset to
    // false whenever src is swapped out for something new (resize result,
    // proxy fallback, etc.) so the replacement also fades in.
    const [loaded, setLoaded] = React.useState(false)
    const imgRef = React.useRef<HTMLImageElement>(null)

    // <img>'s load event doesn't bubble, and for an already-cached image the
    // browser can fire it before React finishes attaching the onLoad
    // listener - missing it would leave the image stuck at opacity 0
    // forever. Catch that by checking img.complete right after the src is
    // committed to the DOM.
    React.useLayoutEffect(() => {
        const img = imgRef.current
        if (
            src !== BLANK_IMAGE &&
            img &&
            img.complete &&
            img.naturalWidth > 0
        ) {
            setLoaded(true)
        }
    }, [src])

    React.useEffect(() => {
        if (mode !== ThumbnailResizeMode.Local) return
        let cancelled = false
        setIsLoading(true)
        const { width, height } = scaledSize(resize)
        resizeImageLocally(originalSrc, width, height)
            .then(url => {
                if (!cancelled) {
                    setSrc(url)
                    setIsLoading(false)
                    setLoaded(false)
                }
            })
            .catch(() => {
                if (!cancelled) {
                    setSrc(originalSrc)
                    setIsLoading(false)
                    setLoaded(false)
                }
            })
        return () => {
            cancelled = true
        }
        // resize is a fresh object per render but its contents never change
        // per callsite, so keying off originalSrc/mode alone is intentional.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [originalSrc, mode])

    const handleLoad = () => {
        if (src !== BLANK_IMAGE) setLoaded(true)
    }

    const handleError = () => {
        if (!usedProxy) {
            if (errorFallbackProxy) {
                setSrc(IMAGE_PROXY + encodeURIComponent(originalSrc))
                setUsedProxy(true)
                setLoaded(false)
            }
        } else if (mode !== ThumbnailResizeMode.Off) {
            // Resized source failed - fall back to the original image.
            setSrc(originalSrc)
            setLoaded(false)
        }
    }

    const classes = [
        className,
        isLoading ? "img-skeleton" : null,
        !isLoading ? "img-fade-in" : null,
        !isLoading && loaded ? "img-loaded" : null,
    ]
        .filter(Boolean)
        .join(" ")

    return (
        <img
            ref={imgRef}
            loading="lazy"
            decoding="async"
            {...rest}
            className={classes}
            src={src}
            onLoad={handleLoad}
            onError={handleError}
        />
    )
}
