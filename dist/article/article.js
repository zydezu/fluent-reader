function get(name) {
    if (name = (new RegExp('[?&]' + encodeURIComponent(name) + '=([^&]*)')).exec(location.search))
        return decodeURIComponent(name[1]);
}
let dir = get("d")
if (dir === "1") {
    document.body.classList.add("rtl")
} else if (dir === "2") {
    document.body.classList.add("vertical")
    document.body.addEventListener("wheel", (evt) => {
        document.scrollingElement.scrollLeft -= evt.deltaY;
    });
}
async function getArticle(url) {
    let article = get("a")
    if (get("m") === "1") {
        return (await Mercury.parse(url, {html: article})).content || ""
    } else {
        return article
    }
}
document.documentElement.style.fontSize = get("s") + "px"
let font = get("f")
if (font) document.body.style.fontFamily = `"${font}"`
let url = get("u")
getArticle(url).then(article => {
    let domParser = new DOMParser()
    let dom = domParser.parseFromString(get("h"), "text/html")
    dom.getElementsByTagName("article")[0].innerHTML = article
    let baseEl = dom.createElement('base')
    baseEl.setAttribute('href', url.split("/").slice(0, 3).join("/"))
    dom.head.append(baseEl)
    for (let s of Array.from(dom.getElementsByTagName("script"))) {
        s.parentNode.removeChild(s)
    }
    // Defer images and embeds: an embed-heavy article (e.g. The Verge) can
    // otherwise spin up a dozen third-party iframes and decode every full-size
    // image at once, freezing the renderer.
    for (let img of dom.querySelectorAll("img")) {
        img.setAttribute("loading", "lazy")
        img.setAttribute("decoding", "async")
        try {
            let u = new URL(img.src)
            if (/(?:^|\.)wp\.com$|(?:^|\.)theverge\.com$/.test(u.hostname)) {
                u.searchParams.set("w", "1200")
                u.searchParams.set("quality", "80")
                u.searchParams.set("strip", "all")
                img.setAttribute("src", u.toString())
            }
        } catch (e) {}
    }
    for (let frame of dom.querySelectorAll("iframe")) {
        frame.setAttribute("loading", "lazy")
    }
    for (let e of dom.querySelectorAll("*[src]")) {
        e.src = e.src
    }
    for (let e of dom.querySelectorAll("*[href]")) {
        e.href = e.href
    }
    let main = document.getElementById("main")
    main.innerHTML = dom.body.innerHTML
    main.classList.add("show")
})
