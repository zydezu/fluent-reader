import { connect } from "react-redux"
import {
    initIntl,
    saveSettings,
    setupAutoFetch,
} from "../../scripts/models/app"
import * as db from "../../scripts/db"
import AppTab from "../../components/settings/app"
import { importAll } from "../../scripts/settings"
import { updateUnreadCounts } from "../../scripts/models/source"
import { AppDispatch } from "../../scripts/utils"

const mapDispatchToProps = (dispatch: AppDispatch) => ({
    setLanguage: (option: string) => {
        window.settings.setLocaleSettings(option)
        dispatch(initIntl())
    },
    setFetchInterval: (interval: number) => {
        window.settings.setFetchInterval(interval)
        dispatch(setupAutoFetch())
    },
    deleteArticles: async (days: number) => {
        dispatch(saveSettings())
        let date = new Date()
        date.setTime(date.getTime() - days * 86400000)
        await db.itemsDB
            .delete()
            .from(db.items)
            .where(db.items.date.lt(date))
            .exec()
        await dispatch(updateUnreadCounts())
        dispatch(saveSettings())
    },
    removeDuplicates: async (): Promise<number> => {
        dispatch(saveSettings())
        const allItems = (await db.itemsDB
            .select(
                db.items._id,
                db.items.source,
                db.items.link,
                db.items.title,
                db.items.date
            )
            .from(db.items)
            .exec()) as {
            _id: number
            source: number
            link: string
            title: string
            date: Date
        }[]
        // Keep the earliest-inserted copy per (source, link) — same identity
        // used by the fetch-time dedup check — and drop the rest.
        allItems.sort((a, b) => a._id - b._id)
        const seen = new Set<string>()
        const duplicateIds: number[] = []
        for (const item of allItems) {
            const key = item.link
                ? `${item.source}|${item.link}`
                : `${item.source}|${item.title}|${new Date(
                      item.date
                  ).getTime()}`
            if (seen.has(key)) {
                duplicateIds.push(item._id)
            } else {
                seen.add(key)
            }
        }
        if (duplicateIds.length > 0) {
            await db.itemsDB
                .delete()
                .from(db.items)
                .where(db.items._id.in(duplicateIds))
                .exec()
            await dispatch(updateUnreadCounts())
        }
        dispatch(saveSettings())
        return duplicateIds.length
    },
    importAll: async () => {
        dispatch(saveSettings())
        let cancelled = await importAll()
        if (cancelled) dispatch(saveSettings())
    },
})

const AppTabContainer = connect(null, mapDispatchToProps)(AppTab)
export default AppTabContainer
