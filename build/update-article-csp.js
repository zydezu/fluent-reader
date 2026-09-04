// dist/article/article.html loads its scripts under a locked-down CSP because that page renders arbitrary third-party HTML from RSS feeds inside a webview
const fs = require("fs")
const crypto = require("crypto")
const path = require("path")

const articleDir = path.join(__dirname, "..", "dist", "article")
const htmlPath = path.join(articleDir, "article.html")

function hashFile(relPath) {
    const data = fs.readFileSync(path.join(articleDir, relPath))
    return "sha256-" + crypto.createHash("sha256").update(data).digest("base64")
}

function updateArticleCsp() {
    let html = fs.readFileSync(htmlPath, "utf8")

    const scriptTag = /<script(?:\s+integrity="[^"]*")?\s+src="([^"]+)"><\/script>/g
    const hashes = []
    html = html.replace(scriptTag, (_match, src) => {
        const hash = hashFile(src)
        hashes.push(hash)
        return `<script integrity="${hash}" src="${src}"></script>`
    })

    if (hashes.length === 0) {
        throw new Error(
            "update-article-csp: found no <script src=\"...\"> tags in " +
            htmlPath
        )
    }

    const cspHashes = hashes.map(h => `'${h}'`).join(" ")
    const cspDirective = /script-src-elem [^;]+;/
    if (!cspDirective.test(html)) {
        throw new Error(
            "update-article-csp: could not find a script-src-elem directive to update in " +
            htmlPath
        )
    }
    html = html.replace(cspDirective, `script-src-elem ${cspHashes};`)

    fs.writeFileSync(htmlPath, html)
    console.log("update-article-csp: synced dist/article/article.html hashes")
    hashes.forEach((h, i) => console.log(`  [${i}] ${h}`))
}

updateArticleCsp()
