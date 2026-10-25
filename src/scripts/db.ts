import intl from "react-intl-universal"
import lf from "lovefield"
import Datastore from "nedb"
import { drizzle } from "drizzle-orm/sqlite-proxy"
import { sourcesTable, itemsTable } from "../db/schema"
import type { StoredRule } from "../schema-types"
import { RSSSource } from "./models/source"
import { RSSItem } from "./models/item"

export { itemsTable, sourcesTable } from "../db/schema"

export const database = drizzle(
    async (sql, params, method) => {
        const rows = await globalThis.db.execute(sql, params, method)
        return { rows: rows as unknown[][] }
    },
    { schema: { sourcesTable, itemsTable } }
)

const sdbSchema = lf.schema.create("sourcesDB", 4)
sdbSchema
    .createTable("sources")
    .addColumn("sid", lf.Type.INTEGER)
    .addPrimaryKey(["sid"], false)
    .addColumn("url", lf.Type.STRING)
    .addColumn("iconurl", lf.Type.STRING)
    .addColumn("name", lf.Type.STRING)
    .addColumn("openTarget", lf.Type.NUMBER)
    .addColumn("lastFetched", lf.Type.DATE_TIME)
    .addColumn("serviceRef", lf.Type.STRING)
    .addColumn("fetchFrequency", lf.Type.NUMBER)
    .addColumn("rules", lf.Type.OBJECT)
    .addColumn("textDir", lf.Type.NUMBER)
    .addColumn("hidden", lf.Type.BOOLEAN)
    .addColumn("imageOnly", lf.Type.BOOLEAN)
    .addNullable(["iconurl", "serviceRef", "rules"])
    .addIndex("idxURL", ["url"], true)

const idbSchema = lf.schema.create("itemsDB", 1)
idbSchema
    .createTable("items")
    .addColumn("_id", lf.Type.INTEGER)
    .addPrimaryKey(["_id"], true)
    .addColumn("source", lf.Type.INTEGER)
    .addColumn("title", lf.Type.STRING)
    .addColumn("link", lf.Type.STRING)
    .addColumn("date", lf.Type.DATE_TIME)
    .addColumn("fetchedDate", lf.Type.DATE_TIME)
    .addColumn("thumb", lf.Type.STRING)
    .addColumn("content", lf.Type.STRING)
    .addColumn("snippet", lf.Type.STRING)
    .addColumn("creator", lf.Type.STRING)
    .addColumn("hasRead", lf.Type.BOOLEAN)
    .addColumn("starred", lf.Type.BOOLEAN)
    .addColumn("hidden", lf.Type.BOOLEAN)
    .addColumn("notify", lf.Type.BOOLEAN)
    .addColumn("serviceRef", lf.Type.STRING)
    .addNullable(["thumb", "creator", "serviceRef"])
    .addIndex("idxDate", ["date"], false, lf.Order.DESC)
    .addIndex("idxService", ["serviceRef"], false)

let sourcesDB: lf.Database
let sources: lf.schema.Table
let itemsDB: lf.Database
let items: lf.schema.Table

async function onUpgradeSourceDB(rawDb: lf.raw.BackStore) {
    const version = rawDb.getVersion()
    if (version < 2) {
        await rawDb.addTableColumn("sources", "textDir", 0)
    }
    if (version < 3) {
        await rawDb.addTableColumn("sources", "hidden", false)
    }
    if (version < 4) {
        await rawDb.addTableColumn("sources", "imageOnly", false)
    }
}

const MIGRATION_BATCH = 50

export async function init() {
    if (globalThis.settings.getDBVersion() === "sqlite") return

    // Lovefield is kept around solely as the legacy source of the one-time
    // migration: connect (which also runs the NeDB → Lovefield import for
    // pre-0.8 installs), move everything into SQLite, then drop it.
    sourcesDB = await sdbSchema.connect({ onUpgrade: onUpgradeSourceDB })
    sources = sourcesDB.getSchema().table("sources")
    itemsDB = await idbSchema.connect()
    items = itemsDB.getSchema().table("items")

    try {
        if (window.settings.getNeDBStatus()) {
            await migrateNeDB()
        }
        await migrateLovefieldToSQLite()
    } catch (err) {
        window.utils.showErrorBox(
            "An error has occured during update. Please report this error on GitHub.",
            String(err)
        )
        window.utils.closeWindow()
    }
}

async function migrateLovefieldToSQLite() {
    try {
        const sourcesData = (await sourcesDB
            .select()
            .from(sources)
            .exec()) as Record<string, unknown>[]
        const itemsData = (await itemsDB.select().from(items).exec()) as Record<
            string,
            unknown
        >[]

        // Extract rules from sources before stripping them - they move to
        // electron-store instead of SQLite.
        const storedRules: StoredRule[] = []
        const sourcesForDB = sourcesData.map(source => {
            const rules = source.rules as Record<string, unknown>[] | undefined
            if (rules && Array.isArray(rules)) {
                rules.forEach((rule, idx) => {
                    const filter = rule.filter as Record<string, unknown>
                    const actions = rule.actions as Record<string, boolean>
                    storedRules.push({
                        id: `${source.sid as number}-${idx}`,
                        target: { type: "source", sid: source.sid as number },
                        filter: (filter?.type as number) ?? 0,
                        search: (filter?.search as string) ?? "",
                        match: rule.match as boolean,
                        actions: Object.entries(actions || {}).map(
                            ([t, f]) => `${t}-${f}`
                        ),
                    })
                })
            }
            return {
                sid: source.sid as number,
                url: source.url as string,
                iconurl: (source.iconurl as string) || null,
                name: source.name as string,
                openTarget: (source.openTarget as number) || 0,
                lastFetched: source.lastFetched as Date,
                serviceRef: (source.serviceRef as string) || null,
                fetchFrequency: (source.fetchFrequency as number) || 0,
                textDir: (source.textDir as number) || 0,
                hidden: (source.hidden as boolean) || false,
                imageOnly: (source.imageOnly as boolean) || false,
            }
        })

        // Roll back failed batches. Conflict handling also recovers old partial
        // migrations and a crash between the commit and saving dbVersion.
        await database.transaction(async tx => {
            for (let i = 0; i < sourcesForDB.length; i += MIGRATION_BATCH) {
                await tx
                    .insert(sourcesTable)
                    .values(sourcesForDB.slice(i, i + MIGRATION_BATCH))
                    .onConflictDoNothing({ target: sourcesTable.sid })
            }
            for (let i = 0; i < itemsData.length; i += MIGRATION_BATCH) {
                const chunk = itemsData.slice(i, i + MIGRATION_BATCH)
                await tx
                    .insert(itemsTable)
                    .values(
                        chunk.map(item => ({
                            _id: item._id as number,
                            source: item.source as number,
                            title: (item.title as string) || "",
                            link: (item.link as string) || "",
                            date: item.date as Date,
                            fetchedDate: item.fetchedDate as Date,
                            thumb: (item.thumb as string) || null,
                            content: (item.content as string) || "",
                            snippet: (item.snippet as string) || "",
                            creator: (item.creator as string) || null,
                            hasRead: (item.hasRead as boolean) || false,
                            starred: (item.starred as boolean) || false,
                            hidden: (item.hidden as boolean) || false,
                            notify: (item.notify as boolean) || false,
                            serviceRef: (item.serviceRef as string) || null,
                        }))
                    )
                    .onConflictDoNothing({ target: itemsTable._id })
            }
        })

        await globalThis.settings.setSourceRules(storedRules)
        await globalThis.settings.setDBVersion("sqlite")
    } finally {
        sourcesDB.close()
        itemsDB.close()
    }

    // Delete legacy data only after the migration and its completion marker succeed.
    globalThis.indexedDB.deleteDatabase("sourcesDB")
    globalThis.indexedDB.deleteDatabase("itemsDB")
}

async function migrateNeDB() {
    try {
        const sdb = new Datastore<RSSSource>({
            filename: "sources",
            autoload: true,
            onload: err => {
                if (err) window.console.log(err)
            },
        })
        const idb = new Datastore<RSSItem>({
            filename: "items",
            autoload: true,
            onload: err => {
                if (err) window.console.log(err)
            },
        })
        const sourceDocs = await new Promise<RSSSource[]>(resolve => {
            sdb.find({}, (_, docs) => {
                resolve(docs)
            })
        })
        const itemDocs = await new Promise<RSSItem[]>(resolve => {
            idb.find({}, (_, docs) => {
                resolve(docs)
            })
        })
        const sRows = sourceDocs.map(doc => {
            if (doc.serviceRef !== undefined)
                doc.serviceRef = String(doc.serviceRef)
            // @ts-ignore
            delete doc._id
            if (!doc.fetchFrequency) doc.fetchFrequency = 0
            doc.textDir = 0
            doc.hidden = false
            doc.imageOnly = false
            return sources.createRow(doc)
        })
        const iRows = itemDocs.map(doc => {
            if (doc.serviceRef !== undefined)
                doc.serviceRef = String(doc.serviceRef)
            if (!doc.title) doc.title = intl.get("article.untitled")
            if (!doc.content) doc.content = ""
            if (!doc.snippet) doc.snippet = ""
            delete doc._id
            doc.starred = Boolean(doc.starred)
            doc.hidden = Boolean(doc.hidden)
            doc.notify = Boolean(doc.notify)
            return items.createRow(doc)
        })
        await Promise.all([
            sourcesDB.insert().into(sources).values(sRows).exec(),
            itemsDB.insert().into(items).values(iRows).exec(),
        ])
        window.settings.setNeDBStatus(false)
        sdb.remove({}, { multi: true }, () => {
            sdb.persistence.compactDatafile()
        })
        idb.remove({}, { multi: true }, () => {
            idb.persistence.compactDatafile()
        })
    } catch (err) {
        window.utils.showErrorBox(
            "An error has occured during update. Please report this error on GitHub.",
            String(err)
        )
        window.utils.closeWindow()
    }
}
