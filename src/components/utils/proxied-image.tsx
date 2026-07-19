import * as React from "react"
import { ThumbnailResizeMode } from "../../schema-types"
import { resizeImageLocally } from "./local-resize"

const IMAGE_PROXY = "https://images.weserv.nl/?url="
const BLANK_IMAGE =
    "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBTAA7"

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

    React.useEffect(() => {
        if (mode !== ThumbnailResizeMode.Local) return
        let cancelled = false
        const { width, height } = scaledSize(resize)
        resizeImageLocally(originalSrc, width, height)
            .then(url => {
                if (!cancelled) setSrc(url)
            })
            .catch(() => {
                if (!cancelled) setSrc(originalSrc)
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
            src={src}
            onError={handleError}
        />
    )
}
