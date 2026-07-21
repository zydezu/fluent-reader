<p align="center">
  <img width="120" height="120" src="https://github.com/yang991178/fluent-reader/raw/master/build/icon.png">
</p>
<h3 align="center">Fluent Reader</h3>
<p align="center">A modern desktop RSS reader</p>
<p align="center">
  <img src="https://img.shields.io/github/v/release/zydezu/fluent-reader?label=version" />
  <img src="https://github.com/zydezu/fluent-reader/workflows/CI%2FCD%20Release/badge.svg" />
</p>
<hr />

## Download

You can [get Fluent Reader from GitHub releases](https://github.com/yang991178/fluent-reader/releases).

## Features

<p align="center">
<img width="1200" height="700" alt="image" src="https://github.com/user-attachments/assets/6aaad9d7-b58b-450e-8144-ae8719ab2e12" />
</p>

- A modern UI inspired by Fluent Design System with full dark mode support.
- Read locally or sync with self-hosted services compatible with Fever or Google Reader API.
- Sync with RSS Services including Inoreader, Feedbin, The Old Reader, BazQux Reader, and more.
- Importing or exporting OPML files, full application data backup & restoration.
- Read the full content with the built-in article view or load webpages by default.
- Search for articles with regular expressions or filter by read status.
- Organize your subscriptions with folder-like groupings.
- Single-key [keyboard shortcuts](https://github.com/yang991178/fluent-reader/wiki/Support#keyboard-shortcuts).
- Hide, mark as read, or star articles automatically as they arrive with regular expression rules.
- Fetch articles in the background and send push notifications.

Support for other RSS services are [under fundraising](https://github.com/yang991178/fluent-reader/issues/23). 

## Development

### Contribute

Help make Fluent Reader better by reporting bugs or opening feature requests through [GitHub issues](https://github.com/yang991178/fluent-reader/issues). 

You can also help internationalize the app by providing [translations into additional languages](https://github.com/yang991178/fluent-reader/tree/master/src/scripts/i18n). 
Refer to the repo of [react-intl-universal](https://github.com/alibaba/react-intl-universal) to get started on internationalization. 

If you enjoy using this app, consider supporting its development by donating through [GitHub Sponsors](https://github.com/sponsors/yang991178), [Paypal](https://www.paypal.me/yang991178), or [Alipay](https://hyliu.me/fluent-reader/imgs/alipay.jpg).

### Build from source
```bash
# Install dependencies
npm install

# Compile ts & dependencies
npm run build

# Start the application
npm run electron

# Generate certificate for signature
electron-builder create-self-signed-cert

# Package the app for Windows
npm run package-win

# Package the app for Linux
npm run package-linux

# Package the app for Mac
npm run package-mac

```

### Developed with

- [Electron](https://github.com/electron/electron)
- [React](https://github.com/facebook/react)
- [Redux](https://github.com/reduxjs/redux)
- [Fluent UI](https://github.com/microsoft/fluentui)
- [Lovefield](https://github.com/google/lovefield)
- [Mercury Parser](https://github.com/postlight/mercury-parser)

### License

BSD
