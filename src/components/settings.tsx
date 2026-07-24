import * as React from "react"
import intl from "react-intl-universal"
import { AnimationClassNames } from "@fluentui/react/lib/Styling"
import AboutTab from "./settings/about"
import {
    Pivot,
    PivotItem,
    Spinner,
    FocusTrapZone,
    CommandBarButton,
} from "@fluentui/react"
import SourcesTabContainer from "../containers/settings/sources-container"
import GroupsTabContainer from "../containers/settings/groups-container"
import AppTabContainer from "../containers/settings/app-container"
import RulesTabContainer from "../containers/settings/rules-container"
import ServiceTabContainer from "../containers/settings/service-container"
import { initTouchBarWithTexts } from "../scripts/utils"

type SettingsProps = {
    display: boolean
    blocked: boolean
    exitting: boolean
    sids: number[]
    close: () => void
}

type SettingsState = {
    activeTab: string
    focusGroupIndex: number
}

const enum SettingsTabKeys {
    Sources = "sources",
    Grouping = "grouping",
    Rules = "rules",
    Service = "service",
    App = "app",
    About = "about",
}

class Settings extends React.Component<SettingsProps, SettingsState> {
    constructor(props) {
        super(props)
        this.state = {
            activeTab: SettingsTabKeys.Sources,
            focusGroupIndex: null,
        }
    }

    onKeyDown = (event: KeyboardEvent) => {
        if (event.key === "Escape" && !this.props.exitting) this.props.close()
    }

    componentDidUpdate = (prevProps: SettingsProps) => {
        if (this.props.display !== prevProps.display) {
            if (this.props.display) {
                if (window.utils.platform === "darwin")
                    window.utils.destroyTouchBar()
                document.body.addEventListener("keydown", this.onKeyDown)
                this.setState({ activeTab: SettingsTabKeys.Sources })
            } else {
                if (window.utils.platform === "darwin") initTouchBarWithTexts()
                document.body.removeEventListener("keydown", this.onKeyDown)
            }
        }
        if (
            this.props.sids !== prevProps.sids &&
            this.props.sids.length > 0
        ) {
            this.setState({ activeTab: SettingsTabKeys.Sources })
        }
    }

    onTabClick = (item: { props: { itemKey?: string } }) => {
        this.setState({ activeTab: item.props.itemKey })
    }

    goToGroup = (groupIndex: number) => {
        this.setState({
            activeTab: SettingsTabKeys.Grouping,
            focusGroupIndex: groupIndex,
        })
    }

    clearGroupFocus = () => {
        this.setState({ focusGroupIndex: null })
    }

    render = () =>
        this.props.display && (
            <div
                className="settings-container"
                onClick={this.props.close}>
                <div
                    className={"settings " + AnimationClassNames.slideUpIn20}
                    onClick={e => e.stopPropagation()}>
                    <CommandBarButton
                        className="settings-close"
                        disabled={this.props.exitting}
                        title={intl.get("settings.exit")}
                        iconProps={{ iconName: "Cancel" }}
                        onClick={this.props.close}
                    />
                    {this.props.blocked && (
                        <FocusTrapZone
                            isClickableOutsideFocusTrap={true}
                            className="loading">
                            <Spinner
                                label={intl.get("settings.fetching")}
                                tabIndex={0}
                            />
                        </FocusTrapZone>
                    )}
                    <Pivot
                        selectedKey={this.state.activeTab}
                        onLinkClick={this.onTabClick}>
                        <PivotItem
                            itemKey={SettingsTabKeys.Sources}
                            headerText={intl.get("settings.sources")}
                            itemIcon="Source">
                            <h2 className="settings-header">
                                {intl.get("settings.sources")}
                            </h2>
                            <SourcesTabContainer
                                onManageGroup={this.goToGroup}
                            />
                        </PivotItem>
                        <PivotItem
                            itemKey={SettingsTabKeys.Grouping}
                            headerText={intl.get("settings.grouping")}
                            itemIcon="GroupList">
                            <h2 className="settings-header">
                                {intl.get("settings.grouping")}
                            </h2>
                            <GroupsTabContainer
                                focusGroupIndex={this.state.focusGroupIndex}
                                onFocusGroupHandled={this.clearGroupFocus}
                            />
                        </PivotItem>
                        <PivotItem
                            itemKey={SettingsTabKeys.Rules}
                            headerText={intl.get("settings.rules")}
                            itemIcon="FilterSettings">
                            <h2 className="settings-header">
                                {intl.get("settings.rules")}
                            </h2>
                            <RulesTabContainer />
                        </PivotItem>
                        <PivotItem
                            itemKey={SettingsTabKeys.Service}
                            headerText={intl.get("settings.service")}
                            itemIcon="CloudImportExport">
                            <h2 className="settings-header">
                                {intl.get("settings.service")}
                            </h2>
                            <ServiceTabContainer />
                        </PivotItem>
                        <PivotItem
                            itemKey={SettingsTabKeys.App}
                            headerText={intl.get("settings.app")}
                            itemIcon="Settings">
                            <h2 className="settings-header">
                                {intl.get("settings.app")}
                            </h2>
                            <AppTabContainer />
                        </PivotItem>
                        <PivotItem
                            itemKey={SettingsTabKeys.About}
                            headerText={intl.get("settings.about")}
                            itemIcon="Info">
                            <h2 className="settings-header">
                                {intl.get("settings.about")}
                            </h2>
                            <AboutTab />
                        </PivotItem>
                    </Pivot>
                </div>
            </div>
        )
}

export default Settings
