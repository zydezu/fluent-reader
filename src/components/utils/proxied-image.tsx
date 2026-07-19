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
                }
            })
            .catch(() => {
                if (!cancelled) {
                    setSrc(originalSrc)
                    setIsLoading(false)
                }
            })
        return () => {
            cancelled = true
        }
        // resize is a fresh object per render but its contents never change
        // per callsite, so keying off originalSrc/mode alone is intentional.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [originalSrc, mode])

    const handleError = () => {
        if (!usedProxy) {
            setSrc(IMAGE_PROXY + encodeURIComponent(originalSrc))
            setUsedProxy(true)
        } else if (mode !== ThumbnailResizeMode.Off) {
            // Resized source failed - fall back to the original image.
            setSrc(originalSrc)
        }
    }

    return (
        <img
            loading="lazy"
            decoding="async"
            {...rest}
            className={
                isLoading
                    ? `${className || ""} img-skeleton`.trim()
                    : className
            }
            src={src}
            onError={handleError}
        />
    )
}
