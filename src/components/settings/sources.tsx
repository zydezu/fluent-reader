import * as React from "react"
import intl from "react-intl-universal"
import {
    Label,
    DefaultButton,
    TextField,
    Stack,
    PrimaryButton,
    DetailsList,
    IColumn,
    SelectionMode,
    Selection,
    IChoiceGroupOption,
    ChoiceGroup,
    IDropdownOption,
    Dropdown,
    MessageBar,
    MessageBarType,
    Toggle,
    Separator,
    IconButton,
    Spinner,
    SpinnerSize,
} from "@fluentui/react"
import {
    SourceState,
    RSSSource,
    SourceOpenTarget,
} from "../../scripts/models/source"
import { SourceGroup } from "../../schema-types"
import { urlTest } from "../../scripts/utils"
import DangerButton from "../utils/danger-button"

const UNGROUPED_KEY = -1

type SourcesTabProps = {
    sources: SourceState
    groups: SourceGroup[]
    serviceOn: boolean
    sids: number[]
    acknowledgeSIDs: () => void
    addSource: (url: string) => Promise<number>
    addToGroup: (groupIndex: number, sid: number) => void
    removeFromGroup: (groupIndex: number, sids: number[]) => void
    updateSourceName: (source: RSSSource, name: string) => void
    updateSourceIcon: (source: RSSSource, iconUrl: string) => Promise<void>
    updateSourceUrl: (source: RSSSource, url: string) => Promise<boolean>
    updateSourceOpenTarget: (
        source: RSSSource,
        target: SourceOpenTarget
    ) => void
    updateFetchFrequency: (source: RSSSource, frequency: number) => void
    deleteSource: (source: RSSSource) => void
    deleteSources: (sources: RSSSource[]) => void
    importOPML: () => void
    exportOPML: () => void
    toggleSourceHidden: (source: RSSSource) => void
    onManageGroup: (groupIndex: number) => void
}

type SourcesTabState = {
    [formName: string]: any
} & {
    selectedSource: RSSSource
    selectedSources: RSSSource[]
    newSourceGroup: number
    bulkGroupIndex: number
    urlSaving: boolean
}

const enum EditDropdownKeys {
    Name = "n",
    Icon = "i",
    Url = "u",
    Group = "g",
}

class SourcesTab extends React.Component<SourcesTabProps, SourcesTabState> {
    selection: Selection

    constructor(props) {
        super(props)
        this.state = {
            newUrl: "",
            newSourceName: "",
            newSourceGroup: null,
            selectedSource: null,
            selectedSources: null,
            bulkGroupIndex: null,
            urlSaving: false,
        }
        this.selection = new Selection({
            getKey: s => (s as RSSSource).sid,
            onSelectionChanged: () => {
                let count = this.selection.getSelectedCount()
                let sources = count
                    ? (this.selection.getSelection() as RSSSource[])
                    : null
                this.setState({
                    selectedSource: count === 1 ? sources[0] : null,
                    selectedSources: count > 1 ? sources : null,
                    newSourceName: count === 1 ? sources[0].name : "",
                    newSourceIcon: count === 1 ? sources[0].iconurl || "" : "",
                    newSourceUrl: count === 1 ? sources[0].url : "",
                    sourceEditOption: EditDropdownKeys.Name,
                    bulkGroupIndex: null,
                })
            },
        })
    }

    componentDidMount = () => {
        this.selectSIDs()
    }

    componentDidUpdate = (prevProps: SourcesTabProps) => {
        if (this.props.sids !== prevProps.sids) {
            this.selectSIDs()
        }
    }

    selectSIDs = () => {
        if (this.props.sids.length > 0) {
            for (let sid of this.props.sids) {
                this.selection.setKeySelected(String(sid), true, false)
            }
            this.props.acknowledgeSIDs()
        }
    }

    groupOf = (sid: number): SourceGroup | null => {
        return this.props.groups.find(g => g.sids.includes(sid)) || null
    }

    groupIndexOf = (sid: number): number => {
        const group = this.groupOf(sid)
        return group && group.isMultiple ? group.index : UNGROUPED_KEY
    }

    columns = (): IColumn[] => [
        {
            key: "favicon",
            name: intl.get("icon"),
            fieldName: "name",
            isIconOnly: true,
            iconName: "ImagePixel",
            minWidth: 16,
            maxWidth: 16,
            onRender: (s: RSSSource) =>
                s.iconurl && <img src={s.iconurl} className="favicon" />,
        },
        {
            key: "name",
            name: intl.get("name"),
            fieldName: "name",
            minWidth: 180,
            data: "string",
            isRowHeader: true,
        },
        {
            key: "group",
            name: intl.get("sources.group"),
            minWidth: 110,
            maxWidth: 150,
            data: "string",
            onRender: (s: RSSSource) => {
                const group = this.groupOf(s.sid)
                return group && group.isMultiple ? (
                    <span
                        className="settings-link"
                        onClick={e => {
                            e.stopPropagation()
                            this.props.onManageGroup(group.index)
                        }}>
                        {group.name}
                    </span>
                ) : (
                    <span style={{ color: "var(--neutralSecondary)" }}>
                        {intl.get("sources.ungrouped")}
                    </span>
                )
            },
        },
        {
            key: "url",
            name: "URL",
            fieldName: "url",
            minWidth: 220,
            data: "string",
        },
    ]

    groupOptions = (): IDropdownOption[] =>
        this.props.groups
            .filter(g => g.isMultiple)
            .map(g => ({ key: g.index, text: g.name }))

    groupOptionsWithUngrouped = (): IDropdownOption[] => [
        { key: UNGROUPED_KEY, text: intl.get("sources.ungrouped") },
        ...this.groupOptions(),
    ]

    onNewSourceGroupChange = (_, option: IDropdownOption) => {
        this.setState({
            newSourceGroup: option ? (option.key as number) : null,
        })
    }

    sourceEditOptions = (): IDropdownOption[] => [
        { key: EditDropdownKeys.Name, text: intl.get("name") },
        { key: EditDropdownKeys.Icon, text: intl.get("icon") },
        { key: EditDropdownKeys.Url, text: "URL" },
        { key: EditDropdownKeys.Group, text: intl.get("sources.group") },
    ]

    onSourceEditOptionChange = (_, option: IDropdownOption) => {
        this.setState({ sourceEditOption: option.key as string })
    }

    fetchFrequencyOptions = (): IDropdownOption[] => [
        { key: "0", text: intl.get("sources.unlimited") },
        { key: "15", text: intl.get("time.minute", { m: 15 }) },
        { key: "30", text: intl.get("time.minute", { m: 30 }) },
        { key: "60", text: intl.get("time.hour", { h: 1 }) },
        { key: "120", text: intl.get("time.hour", { h: 2 }) },
        { key: "180", text: intl.get("time.hour", { h: 3 }) },
        { key: "360", text: intl.get("time.hour", { h: 6 }) },
        { key: "720", text: intl.get("time.hour", { h: 12 }) },
        { key: "1440", text: intl.get("time.day", { d: 1 }) },
    ]

    onFetchFrequencyChange = (_, option: IDropdownOption) => {
        let frequency = parseInt(option.key as string)
        this.props.updateFetchFrequency(this.state.selectedSource, frequency)
        this.setState({
            selectedSource: {
                ...this.state.selectedSource,
                fetchFrequency: frequency,
            } as RSSSource,
        })
    }

    sourceOpenTargetChoices = (): IChoiceGroupOption[] => [
        {
            key: String(SourceOpenTarget.Local),
            text: intl.get("sources.rssText"),
        },
        {
            key: String(SourceOpenTarget.FullContent),
            text: intl.get("article.loadFull"),
        },
        {
            key: String(SourceOpenTarget.Webpage),
            text: intl.get("sources.loadWebpage"),
        },
        {
            key: String(SourceOpenTarget.External),
            text: intl.get("openExternal"),
        },
    ]

    updateSourceName = () => {
        let newName = this.state.newSourceName.trim()
        this.props.updateSourceName(this.state.selectedSource, newName)
        this.setState({
            selectedSource: {
                ...this.state.selectedSource,
                name: newName,
            } as RSSSource,
        })
    }

    updateSourceIcon = () => {
        let newIcon = this.state.newSourceIcon.trim()
        this.props.updateSourceIcon(this.state.selectedSource, newIcon)
        this.setState({
            selectedSource: { ...this.state.selectedSource, iconurl: newIcon },
        })
    }

    saveSourceUrl = async () => {
        const newUrl = this.state.newSourceUrl.trim()
        this.setState({ urlSaving: true })
        const success = await this.props.updateSourceUrl(
            this.state.selectedSource,
            newUrl
        )
        this.setState(state => ({
            urlSaving: false,
            selectedSource: success
                ? ({ ...state.selectedSource, url: newUrl } as RSSSource)
                : state.selectedSource,
        }))
    }

    onSourceGroupChange = (_, option: IDropdownOption) => {
        const sid = this.state.selectedSource.sid
        const key = option.key as number
        if (key === UNGROUPED_KEY) {
            const currentIndex = this.groupIndexOf(sid)
            if (currentIndex !== UNGROUPED_KEY) {
                this.props.removeFromGroup(currentIndex, [sid])
            }
        } else {
            this.props.addToGroup(key, sid)
        }
    }

    moveSelectedToGroup = () => {
        const key = this.state.bulkGroupIndex
        for (let source of this.state.selectedSources) {
            if (key === UNGROUPED_KEY) {
                const currentIndex = this.groupIndexOf(source.sid)
                if (currentIndex !== UNGROUPED_KEY) {
                    this.props.removeFromGroup(currentIndex, [source.sid])
                }
            } else {
                this.props.addToGroup(key, source.sid)
            }
        }
        this.setState({ bulkGroupIndex: null })
    }

    handleInputChange = event => {
        const name: string = event.target.name
        this.setState({ [name]: event.target.value })
    }

    addSource = (event: React.FormEvent) => {
        event.preventDefault()
        let trimmed = this.state.newUrl.trim()
        if (urlTest(trimmed)) {
            let groupIndex = this.state.newSourceGroup
            this.props
                .addSource(trimmed)
                .then(sid => {
                    if (groupIndex !== null) {
                        this.props.addToGroup(groupIndex, sid)
                    }
                })
                .catch(() => {})
        }
    }

    onOpenTargetChange = (_, option: IChoiceGroupOption) => {
        let newTarget = parseInt(option.key) as SourceOpenTarget
        this.props.updateSourceOpenTarget(this.state.selectedSource, newTarget)
        this.setState({
            selectedSource: {
                ...this.state.selectedSource,
                openTarget: newTarget,
            } as RSSSource,
        })
    }

    onToggleHidden = () => {
        this.props.toggleSourceHidden(this.state.selectedSource)
        this.setState({
            selectedSource: {
                ...this.state.selectedSource,
                hidden: !this.state.selectedSource.hidden,
            } as RSSSource,
        })
    }

    render = () => (
        <div className="tab-body">
            {this.props.serviceOn && (
                <MessageBar messageBarType={MessageBarType.info}>
                    {intl.get("sources.serviceWarning")}
                </MessageBar>
            )}
            <Label>{intl.get("sources.opmlFile")}</Label>
            <Stack horizontal>
                <Stack.Item>
                    <PrimaryButton
                        onClick={this.props.importOPML}
                        text={intl.get("sources.import")}
                    />
                </Stack.Item>
                <Stack.Item>
                    <DefaultButton
                        onClick={this.props.exportOPML}
                        text={intl.get("sources.export")}
                    />
                </Stack.Item>
            </Stack>

            <Separator />

            <form onSubmit={this.addSource}>
                <Label htmlFor="newUrl">{intl.get("sources.add")}</Label>
                <Stack horizontal>
                    <Stack.Item grow>
                        <TextField
                            onGetErrorMessage={v =>
                                urlTest(v.trim())
                                    ? ""
                                    : intl.get("sources.badUrl")
                            }
                            validateOnLoad={false}
                            placeholder={intl.get("sources.inputUrl")}
                            value={this.state.newUrl}
                            id="newUrl"
                            name="newUrl"
                            onChange={this.handleInputChange}
                        />
                    </Stack.Item>
                    <Stack.Item>
                        <Dropdown
                            placeholder={intl.get("groups.chooseGroup")}
                            selectedKey={this.state.newSourceGroup}
                            options={this.groupOptions()}
                            onChange={this.onNewSourceGroupChange}
                            style={{ width: 150 }}
                        />
                    </Stack.Item>
                    <Stack.Item>
                        <PrimaryButton
                            disabled={!urlTest(this.state.newUrl.trim())}
                            type="submit"
                            text={intl.get("add")}
                        />
                    </Stack.Item>
                </Stack>
            </form>

            <Separator />

            <DetailsList
                compact={Object.keys(this.props.sources).length >= 10}
                items={Object.values(this.props.sources)}
                columns={this.columns()}
                getKey={s => s.sid}
                setKey="selected"
                selection={this.selection}
                selectionMode={SelectionMode.multiple}
            />

            {this.state.selectedSource && (
                <div className="settings-card">
                    {this.state.selectedSource.serviceRef && (
                        <MessageBar messageBarType={MessageBarType.info}>
                            {intl.get("sources.serviceManaged")}
                        </MessageBar>
                    )}
                    <Label>{intl.get("sources.selected")}</Label>
                    <Stack horizontal wrap verticalAlign="start">
                        <Stack.Item>
                            <Dropdown
                                options={this.sourceEditOptions()}
                                selectedKey={this.state.sourceEditOption}
                                onChange={this.onSourceEditOptionChange}
                                style={{ width: 120 }}
                            />
                        </Stack.Item>
                        {this.state.sourceEditOption ===
                            EditDropdownKeys.Name && (
                            <>
                                <Stack.Item grow>
                                    <TextField
                                        onGetErrorMessage={v =>
                                            v.trim().length == 0
                                                ? intl.get("emptyName")
                                                : ""
                                        }
                                        validateOnLoad={false}
                                        placeholder={intl.get("sources.name")}
                                        value={this.state.newSourceName}
                                        name="newSourceName"
                                        onChange={this.handleInputChange}
                                    />
                                </Stack.Item>
                                <Stack.Item>
                                    <DefaultButton
                                        disabled={
                                            this.state.newSourceName.trim()
                                                .length == 0
                                        }
                                        onClick={this.updateSourceName}
                                        text={intl.get("sources.editName")}
                                    />
                                </Stack.Item>
                            </>
                        )}
                        {this.state.sourceEditOption ===
                            EditDropdownKeys.Icon && (
                            <>
                                <Stack.Item grow>
                                    <TextField
                                        onGetErrorMessage={v =>
                                            urlTest(v.trim())
                                                ? ""
                                                : intl.get("sources.badUrl")
                                        }
                                        validateOnLoad={false}
                                        placeholder={intl.get(
                                            "sources.inputUrl"
                                        )}
                                        value={this.state.newSourceIcon}
                                        name="newSourceIcon"
                                        onChange={this.handleInputChange}
                                    />
                                </Stack.Item>
                                <Stack.Item>
                                    <DefaultButton
                                        disabled={
                                            !urlTest(
                                                this.state.newSourceIcon.trim()
                                            )
                                        }
                                        onClick={this.updateSourceIcon}
                                        text={intl.get("edit")}
                                    />
                                </Stack.Item>
                            </>
                        )}
                        {this.state.sourceEditOption ===
                            EditDropdownKeys.Url && (
                            <>
                                <Stack.Item grow>
                                    <TextField
                                        disabled={
                                            !!this.state.selectedSource
                                                .serviceRef
                                        }
                                        onGetErrorMessage={v =>
                                            urlTest(v.trim())
                                                ? ""
                                                : intl.get("sources.badUrl")
                                        }
                                        validateOnLoad={false}
                                        value={this.state.newSourceUrl}
                                        name="newSourceUrl"
                                        onChange={this.handleInputChange}
                                    />
                                </Stack.Item>
                                {!this.state.selectedSource.serviceRef && (
                                    <Stack.Item>
                                        <DefaultButton
                                            disabled={
                                                this.state.urlSaving ||
                                                !urlTest(
                                                    this.state.newSourceUrl.trim()
                                                ) ||
                                                this.state.newSourceUrl.trim() ===
                                                    this.state.selectedSource
                                                        .url
                                            }
                                            onClick={this.saveSourceUrl}
                                            text={intl.get("sources.changeUrl")}
                                        />
                                    </Stack.Item>
                                )}
                                {this.state.urlSaving && (
                                    <Stack.Item
                                        verticalFill
                                        align="center">
                                        <Spinner size={SpinnerSize.small} />
                                    </Stack.Item>
                                )}
                                <Stack.Item>
                                    <IconButton
                                        iconProps={{ iconName: "Copy" }}
                                        title={intl.get("context.copy")}
                                        onClick={() =>
                                            window.utils.writeClipboard(
                                                this.state.selectedSource.url
                                            )
                                        }
                                    />
                                </Stack.Item>
                            </>
                        )}
                        {this.state.sourceEditOption ===
                            EditDropdownKeys.Group && (
                            <>
                                <Stack.Item grow>
                                    <Dropdown
                                        placeholder={intl.get(
                                            "groups.chooseGroup"
                                        )}
                                        selectedKey={this.groupIndexOf(
                                            this.state.selectedSource.sid
                                        )}
                                        options={this.groupOptionsWithUngrouped()}
                                        onChange={this.onSourceGroupChange}
                                    />
                                </Stack.Item>
                                <Stack.Item>
                                    <DefaultButton
                                        disabled={
                                            this.groupIndexOf(
                                                this.state.selectedSource.sid
                                            ) === UNGROUPED_KEY
                                        }
                                        onClick={() =>
                                            this.props.onManageGroup(
                                                this.groupIndexOf(
                                                    this.state.selectedSource
                                                        .sid
                                                )
                                            )
                                        }
                                        text={intl.get("sources.manageGroup")}
                                    />
                                </Stack.Item>
                            </>
                        )}
                    </Stack>
                    {this.state.sourceEditOption === EditDropdownKeys.Url && (
                        <span className="settings-hint up">
                            {intl.get("sources.urlHint")}
                        </span>
                    )}
                    {!this.state.selectedSource.serviceRef && (
                        <>
                            <Label>{intl.get("sources.fetchFrequency")}</Label>
                            <Stack>
                                <Stack.Item>
                                    <Dropdown
                                        options={this.fetchFrequencyOptions()}
                                        selectedKey={
                                            this.state.selectedSource
                                                .fetchFrequency
                                                ? String(
                                                      this.state.selectedSource
                                                          .fetchFrequency
                                                  )
                                                : "0"
                                        }
                                        onChange={this.onFetchFrequencyChange}
                                        style={{ width: 200 }}
                                    />
                                </Stack.Item>
                            </Stack>
                        </>
                    )}
                    <ChoiceGroup
                        label={intl.get("sources.openTarget")}
                        options={this.sourceOpenTargetChoices()}
                        selectedKey={String(
                            this.state.selectedSource.openTarget
                        )}
                        onChange={this.onOpenTargetChange}
                    />
                    <Stack horizontal verticalAlign="baseline">
                        <Stack.Item grow>
                            <Label>{intl.get("sources.hidden")}</Label>
                        </Stack.Item>
                        <Stack.Item>
                            <Toggle
                                checked={this.state.selectedSource.hidden}
                                onChange={this.onToggleHidden}
                            />
                        </Stack.Item>
                    </Stack>
                    {!this.state.selectedSource.serviceRef && (
                        <Stack horizontal>
                            <Stack.Item>
                                <DangerButton
                                    onClick={() =>
                                        this.props.deleteSource(
                                            this.state.selectedSource
                                        )
                                    }
                                    key={this.state.selectedSource.sid}
                                    text={intl.get("sources.delete")}
                                />
                            </Stack.Item>
                            <Stack.Item>
                                <span className="settings-hint">
                                    {intl.get("sources.deleteWarning")}
                                </span>
                            </Stack.Item>
                        </Stack>
                    )}
                </div>
            )}
            {this.state.selectedSources &&
                (this.state.selectedSources.filter(s => s.serviceRef).length ===
                0 ? (
                    <div className="settings-card">
                        <Label>{intl.get("sources.selectedMulti")}</Label>
                        <Stack horizontal wrap verticalAlign="start">
                            <Stack.Item>
                                <Dropdown
                                    placeholder={intl.get(
                                        "groups.chooseGroup"
                                    )}
                                    selectedKey={this.state.bulkGroupIndex}
                                    options={this.groupOptionsWithUngrouped()}
                                    onChange={(_, option) =>
                                        this.setState({
                                            bulkGroupIndex: option
                                                ? (option.key as number)
                                                : null,
                                        })
                                    }
                                    style={{ width: 200 }}
                                />
                            </Stack.Item>
                            <Stack.Item>
                                <DefaultButton
                                    disabled={
                                        this.state.bulkGroupIndex === null
                                    }
                                    onClick={this.moveSelectedToGroup}
                                    text={intl.get("sources.moveToGroup")}
                                />
                            </Stack.Item>
                            <Stack.Item>
                                <DangerButton
                                    onClick={() =>
                                        this.props.deleteSources(
                                            this.state.selectedSources
                                        )
                                    }
                                    text={intl.get("sources.delete")}
                                />
                            </Stack.Item>
                        </Stack>
                        <span className="settings-hint">
                            {intl.get("sources.deleteWarning")}
                        </span>
                    </div>
                ) : (
                    <MessageBar messageBarType={MessageBarType.info}>
                        {intl.get("sources.serviceManaged")}
                    </MessageBar>
                ))}
        </div>
    )
}

export default SourcesTab
