import { connect } from "react-redux"
import {
    initIntl,
    saveSettings,
    setupAutoFetch,
} from "../../scripts/models/app"
import { database, itemsTable } from "../../scripts/db"
import { lt, sql, inArray } from "drizzle-orm"
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
        await database.delete(itemsTable).where(lt(itemsTable.date, date))
        // DELETE leaves reusable pages allocated; explicit cleanup should release them.
        await database.run(sql`VACUUM`)
        await dispatch(updateUnreadCounts())
        dispatch(saveSettings())
    },
    importAll: async () => {
        dispatch(saveSettings())
        let cancelled = await importAll()
        if (cancelled) dispatch(saveSettings())
    },
    removeDuplicates: async (): Promise<number> => {
        dispatch(saveSettings())
        const allItems = await database
            .select({
                _id: itemsTable._id,
                source: itemsTable.source,
                link: itemsTable.link,
                title: itemsTable.title,
                date: itemsTable.date,
            })
            .from(itemsTable)
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
            await database
                .delete(itemsTable)
                .where(inArray(itemsTable._id, duplicateIds))
            await dispatch(updateUnreadCounts())
        }
        dispatch(saveSettings())
        return duplicateIds.length
    },
})

const AppTabContainer = connect(null, mapDispatchToProps)(AppTab)
export default AppTabContainer
