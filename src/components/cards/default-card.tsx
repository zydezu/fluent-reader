import * as React from "react"
import { Card } from "./card"
import CardInfo from "./info"
import Highlights from "./highlights"
import { SourceTextDirection } from "../../scripts/models/source"
import { ProxiedImage } from "../utils/proxied-image"
import { DEFAULT_CARD_BG_SIZE, DEFAULT_CARD_HEAD_SIZE } from "./thumbnail-sizes"

// Cached in-memory like resizeMode in proxied-image.tsx, so every card
// render doesn't need a sync IPC round trip. Unlike that cache, mounted
// cards subscribe to changes so toggling the setting updates them
// immediately instead of only affecting cards rendered after a restart.
let blurBackground: boolean = window.settings.getCardBlurBackground()
const blurBackgroundListeners = new Set<() => void>()
export const setBlurBackground = (enabled: boolean) => {
    blurBackground = enabled
    blurBackgroundListeners.forEach(listener => listener())
}

const useBlurBackground = () => {
    const [value, setValue] = React.useState(blurBackground)
    React.useEffect(() => {
        const listener = () => setValue(blurBackground)
        blurBackgroundListeners.add(listener)
        return () => {
            blurBackgroundListeners.delete(listener)
        }
    }, [])
    return value
}

const className = (props: Card.Props) => {
    let cn = ["card", "default-card"]
    if (props.item.snippet && props.item.thumb) cn.push("transform")
    if (props.item.hidden) cn.push("hidden")
    if (props.source.textDir === SourceTextDirection.RTL) cn.push("rtl")
    return cn.join(" ")
}

const DefaultCard: React.FunctionComponent<Card.Props> = props => {
    const showBlurBackground = useBlurBackground()
    return (
        <div
            className={className(props)}
            {...Card.bindEventsToProps(props)}
            data-iid={props.item._id}
            data-is-focusable>
            {props.item.thumb && showBlurBackground ? (
                <ProxiedImage
                    className="bg"
                    src={props.item.thumb}
                    resize={DEFAULT_CARD_BG_SIZE}
                />
            ) : null}
            <div className="bg"></div>
            {props.item.thumb ? (
                <ProxiedImage
                    className="head"
                    src={props.item.thumb}
                    resize={DEFAULT_CARD_HEAD_SIZE}
                />
            ) : null}
            <CardInfo source={props.source} item={props.item} />
            <h3 className="title">
                <Highlights text={props.item.title} filter={props.filter} title />
            </h3>
            <p className={"snippet" + (props.item.thumb ? "" : " show")}>
                <Highlights text={props.item.snippet} filter={props.filter} />
            </p>
        </div>
    )
}

export default DefaultCard
