import locales from "./i18n/_locales"
import { ThemeSettings } from "../schema-types"

export function getFontFamilyForLocale(locale: string): string {
    switch (locale) {
        case "zh-CN":
            return '"Segoe UI", "Source Han Sans SC Regular", "Microsoft YaHei", sans-serif'
        case "zh-TW":
            return '"Segoe UI", "Source Han Sans TC Regular", "Microsoft JhengHei", sans-serif'
        case "ja":
            return '"Segoe UI", "Source Han Sans JP Regular", "Yu Gothic UI", sans-serif'
        case "ko":
            return '"Segoe UI", "Source Han Sans KR Regular", "Malgun Gothic", sans-serif'
        default:
            return '"Segoe UI", "Source Han Sans Regular", sans-serif'
    }
}

export function setThemeSettings(theme: ThemeSettings) {
    window.settings.setThemeSettings(theme)
}
export function getThemeSettings(): ThemeSettings {
    return window.settings.getThemeSettings()
}

let autoLoadMoreEnabled: boolean = window.settings.getAutoLoadMore()
export function setAutoLoadMore(enabled: boolean) {
    window.settings.setAutoLoadMore(enabled)
    autoLoadMoreEnabled = enabled
}
export function isAutoLoadMoreEnabled(): boolean {
    return autoLoadMoreEnabled
}

export function getCurrentLocale() {
    let locale = window.settings.getCurrentLocale()
    if (locale in locales) return locale
    locale = locale.split("-")[0]
    return locale in locales ? locale : "en-US"
}

export async function exportAll() {
    await window.db.exportAll()
}

export async function importAll(): Promise<boolean> {
    return await window.db.importAll()
}


let currentAppFont: string = ""
function applyBodyFont() { document.body.style.fontFamily = currentAppFont || "" }

export function getAccentColor(): string { return window.settings.getAccentColor() }
export function setAccentColor(color: string) { window.settings.setAccentColor(color) }

export function getAppFont(): string { return window.settings.getAppFont() }
export function setAppFont(font: string) {
    window.settings.setAppFont(font)
    currentAppFont = font
    applyBodyFont()
}

export function getFadeAnimationSpeed(): number { return window.settings.getFadeAnimationSpeed() }
export function setFadeAnimationSpeed(speed: number) {
    window.settings.setFadeAnimationSpeed(speed)
    document.documentElement.style.setProperty("--fade-speed-multiplier", String(speed))
}

currentAppFont = getAppFont()
document.documentElement.style.setProperty("--fade-speed-multiplier", String(getFadeAnimationSpeed()))
