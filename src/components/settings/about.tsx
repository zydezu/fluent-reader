import * as React from "react"
import intl from "react-intl-universal"
import { Stack, Link } from "@fluentui/react"

type ShortcutRow = [string, string]

class AboutTab extends React.Component {
    shortcutTable = (title: string, rows: ShortcutRow[]) => (
        <>
            <h4>{title}</h4>
            <table className="shortcuts-table">
                <thead>
                    <tr>
                        <th>{intl.get("shortcuts.key")}</th>
                        <th>{intl.get("shortcuts.function")}</th>
                    </tr>
                </thead>
                <tbody>
                    {rows.map(([keys, fn]) => (
                        <tr key={keys}>
                            <td>
                                {keys.split(" ").map(k => (
                                    <kbd key={k}>{k}</kbd>
                                ))}
                            </td>
                            <td>{fn}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </>
    )

    render = () => (
        <div className="tab-body">
            <Stack className="settings-about" horizontalAlign="center">
                <img src="icons/logo.svg" style={{ width: 120, height: 120 }} />
                <h3 style={{ fontWeight: 600 }}>Fluent Reader</h3>
                <small>
                    {intl.get("settings.version")} {window.utils.getVersion()}
                </small>
                <p className="settings-hint">
                    Originally created by Haoyuan Liu, forked by zydezu.
                </p>
                <Stack
                    horizontal
                    horizontalAlign="center"
                    tokens={{ childrenGap: 12 }}>
                    <small>
                        <Link
                            onClick={() =>
                                window.utils.openExternal(
                                    "https://github.com/zydezu/fluent-reader"
                                )
                            }>
                            {intl.get("settings.openSource")}
                        </Link>
                    </small>
                    <small>
                        <Link
                            onClick={() =>
                                window.utils.openExternal(
                                    "https://github.com/zydezu/fluent-reader/issues"
                                )
                            }>
                            {intl.get("settings.feedback")}
                        </Link>
                    </small>
                </Stack>
            </Stack>

            <div className="about-shortcuts">
                <h3>{intl.get("shortcuts.title")}</h3>
                {this.shortcutTable(intl.get("shortcuts.global"), [
                    ["Tab", intl.get("shortcuts.switchFocus")],
                    ["F1", intl.get("shortcuts.toggleMenu")],
                    ["F2", intl.get("shortcuts.toggleSearch")],
                    ["F5", intl.get("nav.refresh")],
                    ["F6", intl.get("nav.markAllRead")],
                    ["F7", intl.get("shortcuts.toggleNotifications")],
                    ["F8", intl.get("shortcuts.toggleViews")],
                    ["F9", intl.get("shortcuts.openSettings")],
                ])}
                {this.shortcutTable(intl.get("shortcuts.articleList"), [
                    ["↑ ↓ ← →", intl.get("shortcuts.navigateFocus")],
                    ["Enter Space", intl.get("shortcuts.openDefault")],
                    ["B", intl.get("shortcuts.openExternally")],
                    ["M", intl.get("shortcuts.markReadUnread")],
                    ["S", intl.get("shortcuts.starUnstar")],
                    ["H", intl.get("shortcuts.hideUnhide")],
                ])}
                {this.shortcutTable(intl.get("shortcuts.articleView"), [
                    ["Esc", intl.get("shortcuts.dismiss")],
                    ["← →", intl.get("shortcuts.prevNext")],
                    ["W", intl.get("shortcuts.loadFull")],
                    ["L", intl.get("shortcuts.loadWebpage")],
                    ["B", intl.get("shortcuts.openExternally")],
                    ["M", intl.get("shortcuts.markReadUnread")],
                    ["S", intl.get("shortcuts.starUnstar")],
                    ["H", intl.get("shortcuts.hideUnhide")],
                ])}
            </div>
        </div>
    )
}

export default AboutTab
