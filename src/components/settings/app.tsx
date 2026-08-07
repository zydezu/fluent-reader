import * as React from "react"
import intl from "react-intl-universal"
import {
  urlTest,
  byteToMB,
  calculateItemSize,
  getSearchEngineName,
} from "../../scripts/utils"
import {
  ThemeSettings,
  SearchEngines,
  ThumbnailResizeMode,
  ProxyImageFormat,
} from "../../schema-types"
import {
  getThemeSettings,
  setThemeSettings,
  getAccentColor,
  setAccentColor,
  getAppFont,
  setAppFont,
  isAutoLoadMoreEnabled,
  setAutoLoadMore,
  getFadeAnimationSpeed,
  setFadeAnimationSpeed,
  exportAll,
} from "../../scripts/settings"
import {
  Stack,
  Label,
  Toggle,
  TextField,
  DefaultButton,
  ChoiceGroup,
  IChoiceGroupOption,
  Dropdown,
  IDropdownOption,
  PrimaryButton,
  ToggleBase,
  Callout,
  ColorPicker,
  IColor,
} from "@fluentui/react"
import DangerButton from "../utils/danger-button"
import {
  setResizeMode,
  setErrorFallbackProxy,
  setProxyFormat,
} from "../utils/proxied-image"
import { setBlurBackground } from "../cards/default-card"

type AppTabProps = {
  setLanguage: (option: string) => void
  setFetchInterval: (interval: number) => void
  deleteArticles: (days: number) => Promise<void>
  removeDuplicates: () => Promise<number>
  importAll: () => Promise<void>
}

type AppTabState = {
  pacStatus: boolean
  pacUrl: string
  themeSettings: ThemeSettings
  itemSize: string
  cacheSize: string
  deleteIndex: string
  duplicatesStatus: string
  removingDuplicates: boolean
  iconStatus: boolean
  thumbnailResizeMode: ThumbnailResizeMode
  accentColor: string
  accentPickerOpen: boolean
  appFont: string
  appFontFilter: string
  appFontPickerOpen: boolean
  imageErrorFallbackProxy: boolean
  autoLoadMore: boolean
  cardBlurBackground: boolean
  thumbnailProxyFormat: ProxyImageFormat
  fadeAnimationSpeed: number
}

class AppTab extends React.Component<AppTabProps, AppTabState> {
  colorButtonRef = React.createRef<HTMLDivElement>()
  fontButtonRef = React.createRef<HTMLDivElement>()

  constructor(props) {
    super(props)
    this.state = {
      pacStatus: window.settings.getProxyStatus(),
      pacUrl: window.settings.getProxy(),
      themeSettings: getThemeSettings(),
      itemSize: null,
      cacheSize: null,
      deleteIndex: null,
      duplicatesStatus: null,
      removingDuplicates: false,
      iconStatus: window.settings.getIconStatus(),
      thumbnailResizeMode: window.settings.getThumbnailResizeMode(),
      accentColor: getAccentColor(),
      accentPickerOpen: false,
      appFont: getAppFont(),
      appFontFilter: "",
      appFontPickerOpen: false,
      imageErrorFallbackProxy: window.settings.getImageErrorFallbackProxy(),
      autoLoadMore: isAutoLoadMoreEnabled(),
      cardBlurBackground: window.settings.getCardBlurBackground(),
      thumbnailProxyFormat: window.settings.getThumbnailProxyFormat(),
      fadeAnimationSpeed: getFadeAnimationSpeed(),
    }
    this.getItemSize()
    this.getCacheSize()
  }

  getCacheSize = () => {
    window.utils.getCacheSize().then(size => {
      this.setState({ cacheSize: byteToMB(size) })
    })
  }
  getItemSize = () => {
    calculateItemSize().then(size => {
      this.setState({ itemSize: byteToMB(size) })
    })
  }

  clearCache = () => {
    window.utils.clearCache().then(() => {
      this.getCacheSize()
    })
  }

  themeChoices = (): IChoiceGroupOption[] => [
    { key: ThemeSettings.Default, text: intl.get("followSystem") },
    { key: ThemeSettings.Light, text: intl.get("app.lightTheme") },
    { key: ThemeSettings.Dark, text: intl.get("app.darkTheme") },
  ]

  fetchIntervalOptions = (): IDropdownOption[] => [
    { key: 0, text: intl.get("app.never") },
    { key: 10, text: intl.get("time.minute", { m: 10 }) },
    { key: 15, text: intl.get("time.minute", { m: 15 }) },
    { key: 20, text: intl.get("time.minute", { m: 20 }) },
    { key: 30, text: intl.get("time.minute", { m: 30 }) },
    { key: 45, text: intl.get("time.minute", { m: 45 }) },
    { key: 60, text: intl.get("time.hour", { h: 1 }) },
  ]
  onFetchIntervalChanged = (item: IDropdownOption) => {
    this.props.setFetchInterval(item.key as number)
  }

  toggleIcon = () => {
    window.settings.toggleIconStatus()
    this.setState({ iconStatus: window.settings.getIconStatus() })
  }

  thumbnailResizeChoices = (): IChoiceGroupOption[] => [
    { key: ThumbnailResizeMode.Off, text: "Off" },
    { key: ThumbnailResizeMode.Proxy, text: "Via image proxy" },
    { key: ThumbnailResizeMode.Local, text: "Locally" },
  ]

  onThumbnailResizeModeChange = (_, option: IChoiceGroupOption) => {
    const mode = option.key as ThumbnailResizeMode
    window.settings.setThumbnailResizeMode(mode)
    setResizeMode(mode)
    this.setState({ thumbnailResizeMode: mode })
  }

  toggleImageErrorFallbackProxy = () => {
    const next = !this.state.imageErrorFallbackProxy
    window.settings.setImageErrorFallbackProxy(next)
    setErrorFallbackProxy(next)
    this.setState({ imageErrorFallbackProxy: next })
  }

  toggleCardBlurBackground = () => {
    const next = !this.state.cardBlurBackground
    window.settings.setCardBlurBackground(next)
    setBlurBackground(next)
    this.setState({ cardBlurBackground: next })
  }

  fadeAnimationSpeedOptions = (): IDropdownOption[] => [
    { key: 0, text: "Off" },
    { key: 0.5, text: "Fast" },
    { key: 1, text: "Normal" },
    { key: 1.75, text: "Slow" },
  ]
  onFadeAnimationSpeedChanged = (item: IDropdownOption) => {
    const speed = item.key as number
    setFadeAnimationSpeed(speed)
    this.setState({ fadeAnimationSpeed: speed })
  }

  thumbnailProxyFormatChoices = (): IChoiceGroupOption[] => [
    { key: ProxyImageFormat.Original, text: "Original format" },
    { key: ProxyImageFormat.WebP, text: "WebP" },
  ]

  onThumbnailProxyFormatChange = (_, option: IChoiceGroupOption) => {
    const format = option.key as ProxyImageFormat
    window.settings.setThumbnailProxyFormat(format)
    setProxyFormat(format)
    this.setState({ thumbnailProxyFormat: format })
  }

  toggleAutoLoadMore = () => {
    const next = !this.state.autoLoadMore
    setAutoLoadMore(next)
    this.setState({ autoLoadMore: next })
  }

  searchEngineOptions = (): IDropdownOption[] =>
    [
      SearchEngines.Google,
      SearchEngines.Bing,
      SearchEngines.Baidu,
      SearchEngines.DuckDuckGo,
    ].map(engine => ({
      key: engine,
      text: getSearchEngineName(engine),
    }))
  onSearchEngineChanged = (item: IDropdownOption) => {
    window.settings.setSearchEngine(item.key as number)
  }

  deleteOptions = (): IDropdownOption[] => [
    { key: "7", text: intl.get("app.daysAgo", { days: 7 }) },
    { key: "14", text: intl.get("app.daysAgo", { days: 14 }) },
    { key: "21", text: intl.get("app.daysAgo", { days: 21 }) },
    { key: "28", text: intl.get("app.daysAgo", { days: 28 }) },
    { key: "0", text: intl.get("app.deleteAll") },
  ]

  deleteChange = (_, item: IDropdownOption) => {
    this.setState({ deleteIndex: item ? String(item.key) : null })
  }

  confirmDelete = () => {
    this.setState({ itemSize: null })
    this.props
      .deleteArticles(parseInt(this.state.deleteIndex))
      .then(() => this.getItemSize())
  }

  removeDuplicates = () => {
    this.setState({ removingDuplicates: true, duplicatesStatus: null })
    this.props.removeDuplicates().then(count => {
      this.setState({
        removingDuplicates: false,
        duplicatesStatus:
          count > 0
            ? intl.get("app.duplicatesRemoved", { count })
            : intl.get("app.noDuplicates"),
      })
      this.getItemSize()
    })
  }

  languageOptions = (): IDropdownOption[] => [
    { key: "default", text: intl.get("followSystem") },
    { key: "de", text: "Deutsch" },
    { key: "en-US", text: "English (US)" },
    { key: "en-GB", text: "English (UK)" },
    { key: "es", text: "Español" },
    { key: "cs", text: "Čeština" },
    { key: "fr-FR", text: "Français" },
    { key: "it", text: "Italiano" },
    { key: "nl", text: "Nederlands" },
    { key: "pt-BR", text: "Português do Brasil" },
    { key: "pt-PT", text: "Português de Portugal" },
    { key: "fi-FI", text: "Suomi" },
    { key: "sv", text: "Svenska" },
    { key: "tr", text: "Türkçe" },
    { key: "uk", text: "Українська" },
    { key: "ru", text: "Русский" },
    { key: "ko", text: "한글" },
    { key: "ja", text: "日本語" },
    { key: "zh-CN", text: "中文（简体）" },
    { key: "zh-TW", text: "中文（繁體）" },
  ]

  toggleStatus = () => {
    window.settings.toggleProxyStatus()
    this.setState({
      pacStatus: window.settings.getProxyStatus(),
      pacUrl: window.settings.getProxy(),
    })
  }

  handleInputChange = event => {
    const name: string = event.target.name
    // @ts-ignore
    this.setState({ [name]: event.target.value.trim() })
  }

  setUrl = (event: React.FormEvent) => {
    event.preventDefault()
    if (urlTest(this.state.pacUrl))
      window.settings.setProxy(this.state.pacUrl)
  }

  onThemeChange = (_, option: IChoiceGroupOption) => {
    setThemeSettings(option.key as ThemeSettings)
    this.setState({ themeSettings: option.key as ThemeSettings })
  }

  filteredFontList = (): string[] => {
    const filter = this.state.appFontFilter.trim().toLowerCase()
    if (filter === "") return window.fontList
    return window.fontList.filter(font =>
      font.toLowerCase().includes(filter)
    )
  }
  toggleFontPicker = () => {
    this.setState({
      appFontPickerOpen: !this.state.appFontPickerOpen,
      appFontFilter: "",
    })
  }
  onAppFontFilterChange = (_, value: string) => {
    this.setState({ appFontFilter: value || "" })
  }
  selectAppFont = (font: string) => {
    setAppFont(font)
    this.setState({
      appFont: font,
      appFontPickerOpen: false,
      appFontFilter: "",
    })
  }

  toggleColorPicker = () => {
    this.setState({ accentPickerOpen: !this.state.accentPickerOpen })
  }
  onAccentColorChange = (_, color: IColor) => {
    const hex = "#" + color.hex
    setAccentColor(hex)
    this.setState({ accentColor: hex })
  }
  resetAccentColor = () => {
    setAccentColor("")
    this.setState({ accentColor: "", accentPickerOpen: false })
  }

  render = () => (
    <div className="tab-body">
      <div className="settings-category">General</div>

      <Label>{intl.get("app.language")}</Label>
      <Stack horizontal>
        <Stack.Item>
          <Dropdown
            defaultSelectedKey={window.settings.getLocaleSettings()}
            options={this.languageOptions()}
            onChanged={option =>
              this.props.setLanguage(String(option.key))
            }
            style={{ width: 200 }}
          />
        </Stack.Item>
      </Stack>

      <Label>{intl.get("app.fetchInterval")}</Label>
      <Stack horizontal>
        <Stack.Item>
          <Dropdown
            defaultSelectedKey={window.settings.getFetchInterval()}
            options={this.fetchIntervalOptions()}
            onChanged={this.onFetchIntervalChanged}
            style={{ width: 200 }}
          />
        </Stack.Item>
      </Stack>

      <Toggle
        label="Automatically load more articles when scrolling to the end"
        checked={this.state.autoLoadMore}
        onChanged={this.toggleAutoLoadMore} />

      <Label>{intl.get("searchEngine.name")}</Label>
      <Stack horizontal>
        <Stack.Item>
          <Dropdown
            defaultSelectedKey={window.settings.getSearchEngine()}
            options={this.searchEngineOptions()}
            onChanged={this.onSearchEngineChanged}
            style={{ width: 200 }}
          />
        </Stack.Item>
      </Stack>

      <hr className="settings-divider" />
      <div className="settings-category">Appearance</div>

      <ChoiceGroup
        label={intl.get("app.theme")}
        options={this.themeChoices()}
        onChange={this.onThemeChange}
        selectedKey={this.state.themeSettings}
      />

      <Label>Accent color</Label>
      <Stack horizontal verticalAlign="center" tokens={{ childrenGap: 8 }}>
        <Stack.Item>
          <div
            ref={this.colorButtonRef}
            className="accent-color-swatch"
            style={{
              backgroundColor: this.state.accentColor || "#0078d4",
            }}
            onClick={this.toggleColorPicker}
          />
        </Stack.Item>
        <Stack.Item>
          <DefaultButton
            text="Reset"
            disabled={!this.state.accentColor}
            onClick={this.resetAccentColor}
          />
        </Stack.Item>
      </Stack>
      {this.state.accentPickerOpen && (
        <Callout
          target={this.colorButtonRef.current}
          onDismiss={this.toggleColorPicker}
          setInitialFocus>
          <ColorPicker
            color={this.state.accentColor || "#0078d4"}
            onChange={this.onAccentColorChange}
            alphaType="none"
            styles={{ root: { margin: 12 } }}
          />
        </Callout>
      )}

      <Label>App font</Label>
      <Stack horizontal>
        <Stack.Item>
          <div ref={this.fontButtonRef}>
            <DefaultButton
              text={
                this.state.appFont === ""
                  ? intl.get("default")
                  : this.state.appFont
              }
              onClick={this.toggleFontPicker}
              style={{ width: 200, textAlign: "left" }}
            />
          </div>
        </Stack.Item>
      </Stack>
      {this.state.appFontPickerOpen && (
        <Callout
          target={this.fontButtonRef.current}
          onDismiss={this.toggleFontPicker}
          setInitialFocus>
          <div className="font-picker">
            <TextField
              placeholder="Search fonts"
              value={this.state.appFontFilter}
              onChange={this.onAppFontFilterChange}
            />
            <div className="font-picker-list">
              {this.filteredFontList().map(font => (
                <div
                  key={font}
                  className={
                    "font-picker-option" +
                    (font === this.state.appFont
                      ? " selected"
                      : "")
                  }
                  onClick={() => this.selectAppFont(font)}>
                  {font === ""
                    ? intl.get("default")
                    : font}
                </div>
              ))}
            </div>
          </div>
        </Callout>
      )}

      <Toggle
        label="Blurred background on cards"
        checked={this.state.cardBlurBackground}
        onChanged={this.toggleCardBlurBackground} />
      <span className="settings-hint up">
        Shows a blurred effect behind card in the Cards view.
        Disable for a plain, blank background instead.
      </span>

      <Label>Fade-in animation speed</Label>
      <Stack horizontal>
        <Stack.Item>
          <Dropdown
            selectedKey={this.state.fadeAnimationSpeed}
            options={this.fadeAnimationSpeedOptions()}
            onChanged={this.onFadeAnimationSpeedChanged}
            style={{ width: 200 }}
          />
        </Stack.Item>
      </Stack>
      <span className="settings-hint up">
        Controls how quickly cards, thumbnails, and the article
        and settings panels fade in. Choose "Off" to disable
        these animations entirely.
      </span>

      <hr className="settings-divider" />
      <div className="settings-category">Images &amp; thumbnails</div>

      <Toggle
        label="Use custom icons when available"
        checked={this.state.iconStatus}
        onChanged={this.toggleIcon} />
      <span className="settings-hint up">
        Use a richer icon than the site's plain favicon, like using the channel icon for YouTube feeds.
        Disable to always use the sites default favicon.
      </span>

      <Toggle
        label="Retry failed thumbnails through image proxy"
        checked={this.state.imageErrorFallbackProxy}
        onChanged={this.toggleImageErrorFallbackProxy} />
      <span className="settings-hint up">
        When a thumbnail fails to load directly (blocked by
        bot protection, CORS, etc...), retry it through images.weserv.nl instead.
        Disable this if you don't want failed
        thumbnail URLs sent to a third party.
      </span>

      <ChoiceGroup
        label="Thumbnail resizing"
        options={this.thumbnailResizeChoices()}
        onChange={this.onThumbnailResizeModeChange}
        selectedKey={this.state.thumbnailResizeMode}
      />
      <span className="settings-hint up">
        Downscales article thumbnails before loading them, which can
        reduce lag when scrolling through articles with very large
        images. "Via image proxy" sends thumbnail URLs to the
        third-party images.weserv.nl to resize them. "Locally" fetches
        and resizes images on your device instead, this uses more CPU but
        keeps thumbnail URLs private.
      </span>

      {this.state.thumbnailResizeMode === ThumbnailResizeMode.Proxy && (
        <ChoiceGroup
          label="Proxy output format"
          options={this.thumbnailProxyFormatChoices()}
          onChange={this.onThumbnailProxyFormatChange}
          selectedKey={this.state.thumbnailProxyFormat}
        />
      )}
      {this.state.thumbnailResizeMode === ThumbnailResizeMode.Proxy && (
        <span className="settings-hint up">
          Whether to leave proxied/rescaled thumbnails as it's original format,
          or to convert them to WebP to save bandwidth and space.
        </span>
      )}

      <hr className="settings-divider" />
      <div className="settings-category">Network</div>

      <Stack horizontal verticalAlign="baseline">
        <Stack.Item grow>
          <Label>{intl.get("app.enableProxy")}</Label>
        </Stack.Item>
        <Stack.Item>
          <Toggle
            checked={this.state.pacStatus}
            onChange={this.toggleStatus}
          />
        </Stack.Item>
      </Stack>
      {this.state.pacStatus && (
        <form onSubmit={this.setUrl}>
          <Stack horizontal>
            <Stack.Item grow>
              <TextField
                required
                onGetErrorMessage={v =>
                  urlTest(v.trim())
                    ? ""
                    : intl.get("app.badUrl")
                }
                placeholder={intl.get("app.pac")}
                name="pacUrl"
                onChange={this.handleInputChange}
                value={this.state.pacUrl}
              />
            </Stack.Item>
            <Stack.Item>
              <DefaultButton
                disabled={!urlTest(this.state.pacUrl)}
                type="sumbit"
                text={intl.get("app.setPac")}
              />
            </Stack.Item>
          </Stack>
          <span className="settings-hint up">
            {intl.get("app.pacHint")}
          </span>
        </form>
      )}

      <hr className="settings-divider" />
      <div className="settings-category">Data &amp; storage</div>

      <Label>{intl.get("app.cleanup")}</Label>
      <Stack horizontal>
        <Stack.Item grow>
          <Dropdown
            placeholder={intl.get("app.deleteChoices")}
            options={this.deleteOptions()}
            selectedKey={this.state.deleteIndex}
            onChange={this.deleteChange}
          />
        </Stack.Item>
        <Stack.Item>
          <DangerButton
            disabled={
              this.state.itemSize === null ||
              this.state.deleteIndex === null
            }
            text={intl.get("app.confirmDelete")}
            onClick={this.confirmDelete}
          />
        </Stack.Item>
      </Stack>
      <span className="settings-hint up">
        {this.state.itemSize
          ? intl.get("app.itemSize", { size: this.state.itemSize })
          : intl.get("app.calculatingSize")}
      </span>

      <Stack horizontal>
        <Stack.Item>
          <DefaultButton
            text={intl.get("app.removeDuplicates")}
            disabled={this.state.removingDuplicates}
            onClick={this.removeDuplicates}
          />
        </Stack.Item>
      </Stack>
      <span className="settings-hint up">
        {this.state.duplicatesStatus ??
          intl.get("app.duplicatesHint")}
      </span>

      <Stack horizontal>
        <Stack.Item>
          <DefaultButton
            text={intl.get("app.cache")}
            disabled={
              this.state.cacheSize === null ||
              this.state.cacheSize === "0MB"
            }
            onClick={this.clearCache}
          />
        </Stack.Item>
      </Stack>
      <span className="settings-hint up">
        {this.state.cacheSize
          ? intl.get("app.cacheSize", { size: this.state.cacheSize })
          : intl.get("app.calculatingSize")}
      </span>

      <Label>{intl.get("app.data")}</Label>
      <Stack horizontal>
        <Stack.Item>
          <PrimaryButton
            onClick={exportAll}
            text={intl.get("app.backup")}
          />
        </Stack.Item>
        <Stack.Item>
          <DefaultButton
            onClick={this.props.importAll}
            text={intl.get("app.restore")}
          />
        </Stack.Item>
      </Stack>
    </div>
  )
}

export default AppTab
