import intl from "react-intl-universal"
import { connect } from "react-redux"
import { createSelector } from "reselect"
import { RootState } from "../../scripts/reducer"
import SourcesTab from "../../components/settings/sources"
import {
    addSource,
    RSSSource,
    updateSource,
    deleteSource,
    SourceOpenTarget,
    deleteSources,
    toggleSourceHidden,
} from "../../scripts/models/source"
import {
    importOPML,
    exportOPML,
    addSourceToGroup,
    removeSourceFromGroup,
} from "../../scripts/models/group"
import { AppDispatch, validateFavicon, parseRSS } from "../../scripts/utils"
import { saveSettings, toggleSettings } from "../../scripts/models/app"
import { SyncService } from "../../schema-types"

const getSources = (state: RootState) => state.sources
const getGroups = (state: RootState) => state.groups
const getServiceOn = (state: RootState) =>
    state.service.type !== SyncService.None
const getSIDs = (state: RootState) => state.app.settings.sids

const mapStateToProps = createSelector(
    [getSources, getGroups, getServiceOn, getSIDs],
    (sources, groups, serviceOn, sids) => ({
        sources: sources,
        groups: groups.map((g, i) => ({ ...g, index: i })),
        serviceOn: serviceOn,
        sids: sids,
    })
)

const mapDispatchToProps = (dispatch: AppDispatch) => {
    return {
        acknowledgeSIDs: () => dispatch(toggleSettings(true)),
        addSource: (url: string) => dispatch(addSource(url)),
        addToGroup: (groupIndex: number, sid: number) =>
            dispatch(addSourceToGroup(groupIndex, sid)),
        removeFromGroup: (groupIndex: number, sids: number[]) =>
            dispatch(removeSourceFromGroup(groupIndex, sids)),
        updateSourceName: (source: RSSSource, name: string) => {
            dispatch(updateSource({ ...source, name: name } as RSSSource))
        },
        updateSourceUrl: async (
            source: RSSSource,
            url: string
        ): Promise<boolean> => {
            dispatch(saveSettings())
            let success = false
            try {
                await parseRSS(url)
                await dispatch(updateSource({ ...source, url } as RSSSource))
                success = true
            } catch (e) {
                window.utils.showErrorBox(
                    intl.get("sources.badUrl"),
                    e && e.code === 201 ? intl.get("sources.exist") : String(e)
                )
            }
            dispatch(saveSettings())
            return success
        },
        updateSourceIcon: async (source: RSSSource, iconUrl: string) => {
            dispatch(saveSettings())
            if (await validateFavicon(iconUrl)) {
                dispatch(updateSource({ ...source, iconurl: iconUrl }))
            } else {
                window.utils.showErrorBox(intl.get("sources.badIcon"), "")
            }
            dispatch(saveSettings())
        },
        updateSourceOpenTarget: (
            source: RSSSource,
            target: SourceOpenTarget
        ) => {
            dispatch(
                updateSource({ ...source, openTarget: target } as RSSSource)
            )
        },
        updateFetchFrequency: (source: RSSSource, frequency: number) => {
            dispatch(
                updateSource({
                    ...source,
                    fetchFrequency: frequency,
                } as RSSSource)
            )
        },
        deleteSource: (source: RSSSource) => dispatch(deleteSource(source)),
        deleteSources: (sources: RSSSource[]) =>
            dispatch(deleteSources(sources)),
        importOPML: () => dispatch(importOPML()),
        exportOPML: () => dispatch(exportOPML()),
        toggleSourceHidden: (source: RSSSource) =>
            dispatch(toggleSourceHidden(source)),
        toggleSourceImageOnly: (source: RSSSource) => {
            dispatch(
                updateSource({
                    ...source,
                    imageOnly: !source.imageOnly,
                } as RSSSource)
            )
        },
    }
}

const SourcesTabContainer = connect(
    mapStateToProps,
    mapDispatchToProps
)(SourcesTab)
export default SourcesTabContainer
