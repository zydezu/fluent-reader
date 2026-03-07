import * as React from "react"

const IMAGE_PROXY = "https://images.weserv.nl/?url="

interface Props extends React.ImgHTMLAttributes<HTMLImageElement> {
    src: string
}

export const ProxiedImage: React.FunctionComponent<Props> = (props) => {
    const [src, setSrc] = React.useState(props.src)
    const [usedProxy, setUsedProxy] = React.useState(false)

    const handleError = () => {
        if (!usedProxy) {
            setSrc(IMAGE_PROXY + encodeURIComponent(props.src))
            setUsedProxy(true)
        }
    }

    return <img {...props} src={src} onError={handleError} />
}
