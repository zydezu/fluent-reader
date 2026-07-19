import * as db from "./db"
import {
    IPartialTheme,
    loadTheme,
    ThemeGenerator,
    themeRulesStandardCreator,
    BaseSlots,
    getColorFromString,
} from "@fluentui/react"
import locales from "./i18n/_locales"
import { ThemeSettings } from "../schema-types"
import intl from "react-intl-universal"
import { SourceTextDirection } from "./models/source"

const DEFAULT_ACCENT_COLOR = "#0078d4"

const darkNeutralPalette = {
    neutralLighterAlt: "#282828",
    neutralLighter: "#313131",
    neutralLight: "#3f3f3f",
    neutralQuaternaryAlt: "#484848",
    neutralQuaternary: "#4f4f4f",
    neutralTertiaryAlt: "#6d6d6d",
    neutralTertiary: "#c8c8c8",
    neutralSecondary: "#d0d0d0",
    neutralSecondaryAlt: "#d2d0ce",
    neutralPrimaryAlt: "#dadada",
    neutralPrimary: "#ffffff",
    neutralDark: "#f4f4f4",
    black: "#f8f8f8",
    white: "#1f1f1f",
}
// Fallback accent shades, used when the user hasn't customized the accent
// color - matches Fluent's built-in accent so the app looks the same as
// before this setting existed.
const defaultDarkThemePalette = {
    themePrimary: "#3a96dd",
    themeLighterAlt: "#020609",
    themeLighter: "#091823",
    themeLight: "#112d43",
    themeTertiary: "#235a85",
    themeSecondary: "#3385c3",
    themeDarkAlt: "#4ba0e1",
    themeDark: "#65aee6",
    themeDarker: "#8ac2ec",
    accent: "#3a96dd",
}

// Generates the full set of Fluent theme-color shades (themePrimary through
// themeDarker) from a single base color, using Fluent's own Theme Designer
// algorithm - setting only themePrimary would leave every other shade
// (hover/pressed states, etc.) stuck on Fluent's default blue.
function generateAccentPalette(color: string, isDark: boolean) {
    const themeRules = themeRulesStandardCreator()
    ThemeGenerator.insureSlots(themeRules, isDark)
    ThemeGenerator.setSlot(
        themeRules[BaseSlots[BaseSlots.primaryColor]],
        getColorFromString(color),
        isDark,
        true,
        true
    )
    const json = ThemeGenerator.getThemeAsJson(themeRules)
    return {
        themePrimary: json.themePrimary,
        themeLighterAlt: json.themeLighterAlt,
        themeLighter: json.themeLighter,
        themeLight: json.themeLight,
        themeTertiary: json.themeTertiary,
        themeSecondary: json.themeSecondary,
        themeDarkAlt: json.themeDarkAlt,
        themeDark: json.themeDark,
        themeDarker: json.themeDarker,
        accent: json.themePrimary,
    }
}

let currentLocale = "default"
let currentAppFont = ""

function localeFontStack(locale: string): string {
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
            return '"Inter", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, "Open Sans", "Helvetica Neue", sans-serif'
    }
}

// The user's chosen app font (if any) takes priority, falling back to the
// locale-appropriate stack (which itself ends in generic system fonts).
function resolveFontFamily(): string {
    const stack = localeFontStack(currentLocale)
    return currentAppFont ? `"${currentAppFont}", ${stack}` : stack
}

// Applied directly to <body> (rather than only Fluent's theme) so plain
// HTML text - card titles, snippets, etc. - picks up the font too, not just
// Fluent-managed components. Inline style wins over the static CSS rules in
// global.css regardless of :lang() matching.
function applyBodyFont() {
    document.body.style.fontFamily = resolveFontFamily()
}

const fontStyle = () => ({
    defaultFontStyle: {
        fontFamily: resolveFontFamily(),
    },
})

let lightTheme: IPartialTheme = fontStyle()
let darkTheme: IPartialTheme = {
    ...fontStyle(),
    palette: { ...darkNeutralPalette, ...defaultDarkThemePalette },
}

function buildThemes(accentColor: string) {
    const themePalette = accentColor
        ? generateAccentPalette(accentColor, false)
        : defaultDarkThemePalette
    const darkThemePalette = accentColor
        ? generateAccentPalette(accentColor, true)
        : defaultDarkThemePalette
    lightTheme = {
        ...fontStyle(),
        palette: { ...themePalette },
    }
    darkTheme = {
        ...fontStyle(),
        palette: { ...darkNeutralPalette, ...darkThemePalette },
    }
}

function applyAccentCssVars(color: string) {
    const root = document.documentElement.style
    const resolved = color || DEFAULT_ACCENT_COLOR
    root.setProperty("--primary", resolved)
    root.setProperty(
        "--primary-dark",
        generateAccentPalette(resolved, false).themeDark
    )
}

export function setAccentColor(color: string) {
    window.settings.setAccentColor(color)
    buildThemes(color)
    applyThemeSettings()
    applyAccentCssVars(color)
}
export function getAccentColor(): string {
    return window.settings.getAccentColor()
}

export function setAppFont(font: string) {
    window.settings.setAppFont(font)
    currentAppFont = font
    buildThemes(getAccentColor())
    applyThemeSettings()
    applyBodyFont()
}
export function getAppFont(): string {
    return window.settings.getAppFont()
}

// Cached in-memory (rather than a sync IPC call per read) since this is
// checked on every scroll event in the feed views.
let autoLoadMoreEnabled: boolean = window.settings.getAutoLoadMore()
export function setAutoLoadMore(enabled: boolean) {
    window.settings.setAutoLoadMore(enabled)
    autoLoadMoreEnabled = enabled
}
export function isAutoLoadMoreEnabled(): boolean {
    return autoLoadMoreEnabled
}

currentAppFont = getAppFont()
buildThemes(getAccentColor())
applyAccentCssVars(getAccentColor())

export function setThemeDefaultFont(locale: string) {
    currentLocale = locale
    buildThemes(getAccentColor())
    applyBodyFont()
    applyThemeSettings()
}
export function setThemeSettings(theme: ThemeSettings) {
    window.settings.setThemeSettings(theme)
    applyThemeSettings()
}
export function getThemeSettings(): ThemeSettings {
    return window.settings.getThemeSettings()
}
export function applyThemeSettings() {
    loadTheme(window.settings.shouldUseDarkColors() ? darkTheme : lightTheme)
}
window.settings.addThemeUpdateListener(shouldDark => {
    loadTheme(shouldDark ? darkTheme : lightTheme)
})

export function getCurrentLocale() {
    let locale = window.settings.getCurrentLocale()
    if (locale in locales) return locale
    locale = locale.split("-")[0]
    return locale in locales ? locale : "en-GB"
}

export async function exportAll() {
    const filters = [{ name: intl.get("app.frData"), extensions: ["frdata"] }]
    const write = await window.utils.showSaveDialog(
        filters,
        "*/Fluent_Reader_Backup.frdata"
    )
    if (write) {
        let output = window.settings.getAll()
        output["lovefield"] = {
            sources: await db.sourcesDB.select().from(db.sources).exec(),
            items: await db.itemsDB.select().from(db.items).exec(),
        }
        write(JSON.stringify(output), intl.get("settings.writeError"))
    }
}

export async function importAll() {
    const filters = [{ name: intl.get("app.frData"), extensions: ["frdata"] }]
    let data = await window.utils.showOpenDialog(filters)
    if (!data) return true
    let confirmed = await window.utils.showMessageBox(
        intl.get("app.restore"),
        intl.get("app.confirmImport"),
        intl.get("confirm"),
        intl.get("cancel"),
        true,
        "warning"
    )
    if (!confirmed) return true
    let configs = JSON.parse(data)
    await db.sourcesDB.delete().from(db.sources).exec()
    await db.itemsDB.delete().from(db.items).exec()
    if (configs.nedb) {
        let openRequest = window.indexedDB.open("NeDB")
        configs.useNeDB = true
        openRequest.onsuccess = () => {
            let db = openRequest.result
            let objectStore = db
                .transaction("nedbdata", "readwrite")
                .objectStore("nedbdata")
            let requests = Object.entries(configs.nedb).map(([key, value]) => {
                return objectStore.put(value, key)
            })
            let promises = requests.map(
                req =>
                    new Promise<void>((resolve, reject) => {
                        req.onsuccess = () => resolve()
                        req.onerror = () => reject()
                    })
            )
            Promise.all(promises).then(() => {
                delete configs.nedb
                window.settings.setAll(configs)
            })
        }
    } else {
        const sRows = configs.lovefield.sources.map(s => {
            s.lastFetched = new Date(s.lastFetched)
            if (!s.textDir) s.textDir = SourceTextDirection.LTR
            if (!s.hidden) s.hidden = false
            return db.sources.createRow(s)
        })
        const iRows = configs.lovefield.items.map(i => {
            i.date = new Date(i.date)
            i.fetchedDate = new Date(i.fetchedDate)
            return db.items.createRow(i)
        })
        await db.sourcesDB.insert().into(db.sources).values(sRows).exec()
        await db.itemsDB.insert().into(db.items).values(iRows).exec()
        delete configs.lovefield
        window.settings.setAll(configs)
    }
    return false
}
