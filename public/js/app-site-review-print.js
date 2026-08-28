/* Full-site review print. Collects all application pages into one printable document. */
(function () {
  const BUTTON_ID = "printWholeSiteReviewBtn";
  const FRAME_ID = "minyaSiteReviewFrame";

  const pages = [
    ["/", "الصفحة الرئيسية"],
    ["/report", "التقرير اليومي"],
    ["/archive", "أرشيف التقارير"],
    ["/monthly", "التقرير الشهري"],
    ["/annual", "التقرير السنوي"],
    ["/equipment", "المعدات والصيانة"],
    ["/weekly", "التقرير الأسبوعي"],
    ["/search", "البحث المتقدم"],
    ["/managerial", "التقرير الإداري"],
    ["/admin", "الإدارة والصلاحيات"],
    ["/system.html", "إدارة النظام"],
    ["/reviews", "مراجعة واعتماد التقارير"]
  ];

  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  function syncValues(root) {
    root.querySelectorAll("input").forEach((input) => {
      if (input.type === "checkbox" || input.type === "radio") {
        if (input.checked) input.setAttribute("checked", "checked");
        else input.removeAttribute("checked");
      } else {
        input.setAttribute("value", input.value || "");
      }
    });
    root.querySelectorAll("textarea").forEach((el) => { el.textContent = el.value || ""; });
    root.querySelectorAll("select").forEach((select) => {
      Array.from(select.options).forEach((option, index) => {
        if (index === select.selectedIndex) option.setAttribute("selected", "selected");
        else option.removeAttribute("selected");
      });
    });
  }

  function cleanupClone(root) {
    root.querySelectorAll("script, #minyaLoadingScreen, #minyaLogoutBtn, #printUiReviewBtn, #printWholeSiteReviewBtn").forEach((el) => el.remove());
    root.querySelectorAll("button").forEach((button) => {
      button.disabled = true;
      button.removeAttribute("onclick");
    });
    root.querySelectorAll("a").forEach((a) => a.removeAttribute("href"));
    return root;
  }

  function createLoaderFrame() {
    const frame = document.createElement("iframe");
    frame.setAttribute("aria-hidden", "true");
    Object.assign(frame.style, {
      position: "fixed",
      left: "-10000px",
      top: "0",
      width: "1280px",
      height: "900px",
      opacity: "0",
      pointerEvents: "none",
      border: "0"
    });
    document.body.appendChild(frame);
    return frame;
  }

  function loadRoute(frame, route) {
    return new Promise((resolve) => {
      let settled = false;
      const finish = async () => {
        if (settled) return;
        settled = true;
        await sleep(1100);
        resolve();
      };
      frame.onload = finish;
      frame.src = route;
      setTimeout(finish, 3500);
    });
  }

  function collectStyleLinks(doc, bag) {
    doc.querySelectorAll('link[rel="stylesheet"]').forEach((link) => {
      if (link.href) bag.add(link.href);
    });
  }

  async function capturePages(button) {
    const frame = createLoaderFrame();
    const styleLinks = new Set();
    const sections = [];

    try {
      for (let i = 0; i < pages.length; i += 1) {
        const [route, label] = pages[i];
        button.textContent = `تجهيز ${i + 1} / ${pages.length}`;
        await loadRoute(frame, route);

        let doc;
        try { doc = frame.contentDocument; } catch (_) { doc = null; }
        if (!doc || !doc.body) continue;

        const currentPath = frame.contentWindow?.location?.pathname || "";
        if (currentPath === "/login.html" || currentPath === "/setup.html") continue;

        collectStyleLinks(doc, styleLinks);

        const source = doc.querySelector("main.container") || doc.querySelector("main") || doc.body;
        if (!source) continue;
        const clone = cleanupClone(source.cloneNode(true));
        syncValues(clone);

        const wrapper = document.createElement("section");
        wrapper.className = "site-review-page";
        wrapper.innerHTML = `<div class="site-review-page-title"><span>MINYA LANDFILL</span><strong>${label}</strong><small>${route}</small></div>`;
        wrapper.appendChild(clone);
        sections.push(wrapper.outerHTML);
      }
    } finally {
      frame.remove();
    }

    return { sections, styleLinks: Array.from(styleLinks) };
  }

  function buildPrintFrame(payload) {
    document.getElementById(FRAME_ID)?.remove();
    const frame = document.createElement("iframe");
    frame.id = FRAME_ID;
    frame.setAttribute("aria-hidden", "true");
    Object.assign(frame.style, {
      position: "fixed",
      left: "0",
      bottom: "0",
      width: "1px",
      height: "1px",
      opacity: "0",
      border: "0",
      pointerEvents: "none"
    });
    document.body.appendChild(frame);

    const doc = frame.contentDocument;
    const links = payload.styleLinks.map((href) => `<link rel="stylesheet" href="${href}">`).join("\n");
    doc.open();
    doc.write(`<!doctype html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>مراجعة جميع صفحات نظام مكب المنيا</title>
${links}
<style>
  *{box-sizing:border-box!important}
  html,body{margin:0!important;padding:0!important;background:#eef2f0!important;color:#1f2d27!important;direction:rtl!important;font-family:Tahoma,Arial,sans-serif!important;-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}
  body{padding:7mm!important}
  .site-review-cover{background:#174b3a!important;color:#fff!important;padding:18mm 14mm!important;border-radius:16px!important;margin-bottom:8mm!important;page-break-after:always!important}
  .site-review-cover h1{margin:0 0 6px!important;font-size:27px!important}.site-review-cover p{margin:0!important;color:rgba(255,255,255,.72)!important}
  .site-review-page{background:#f5f7f6!important;margin:0 0 8mm!important;padding:5mm!important;border-radius:12px!important;page-break-before:always!important}
  .site-review-page:first-of-type{page-break-before:auto!important}
  .site-review-page-title{display:flex!important;align-items:baseline!important;gap:9px!important;padding:10px 12px!important;margin:0 0 12px!important;background:#174b3a!important;color:#fff!important;border-radius:10px!important;break-inside:avoid!important}
  .site-review-page-title span{font-size:8px!important;letter-spacing:1px!important;opacity:.65!important}.site-review-page-title strong{font-size:16px!important}.site-review-page-title small{margin-right:auto!important;direction:ltr!important;opacity:.55!important;font-size:8px!important}
  .top-header,#minyaLogoutBtn,#minyaLoadingScreen{display:none!important}
  main.container,.container,main{width:100%!important;max-width:none!important;margin:0!important;padding:0!important}
  .panel,.dashboard-card,.dashboard-metric-card,.dashboard-recent-panel,.executive-dashboard,.v3-panel,.v3-hero,.reviews-panel,.reviews-hero,.monthly-chart,.monthly-comparison,#annualSummarySection{box-shadow:none!important;break-inside:avoid!important;page-break-inside:avoid!important}
  table{width:100%!important;max-width:100%!important;box-shadow:none!important} th,td{font-size:9px!important;padding:5px 4px!important}
  input,select,textarea{font-size:9px!important;min-height:28px!important;padding:4px 6px!important}
  button{pointer-events:none!important}
  .no-print{display:block!important}
  @page{size:A4 portrait;margin:7mm}
  @media print{body{background:#eef2f0!important;padding:0!important}.site-review-page{margin-bottom:0!important;border-radius:0!important}.site-review-cover{border-radius:0!important}}
</style>
</head>
<body>
<section class="site-review-cover"><h1>مراجعة جميع صفحات نظام إدارة مكب المنيا</h1><p>نسخة موحدة لمراجعة تصميم وتنسيق جميع صفحات وأقسام النظام.</p></section>
${payload.sections.join("\n")}
</body>
</html>`);
    doc.close();
    return frame;
  }

  async function printWholeSite() {
    const button = document.getElementById(BUTTON_ID);
    if (!button || button.dataset.busy === "1") return;
    button.dataset.busy = "1";
    button.disabled = true;
    const original = button.textContent;

    try {
      const payload = await capturePages(button);
      if (!payload.sections.length) throw new Error("لم يتم العثور على صفحات قابلة للطباعة");
      button.textContent = "فتح الطباعة...";
      const frame = buildPrintFrame(payload);
      await sleep(1300);
      frame.contentWindow.focus();
      frame.contentWindow.print();
      setTimeout(() => frame.remove(), 60000);
    } catch (error) {
      console.error("Full site review print failed", error);
      alert(`تعذر تجهيز ملف مراجعة النظام: ${error.message || error}`);
    } finally {
      button.dataset.busy = "0";
      button.disabled = false;
      button.textContent = original;
    }
  }

  function mountButton() {
    if ((location.pathname.replace(/\/+$/, "") || "/") !== "/") return;
    if (document.getElementById(BUTTON_ID)) return;
    const main = document.querySelector("main.container");
    if (!main) return;

    const panel = document.createElement("section");
    panel.className = "site-review-action-panel";
    Object.assign(panel.style, {
      marginTop: "18px",
      padding: "18px",
      textAlign: "center",
      background: "#fff",
      border: "1px solid #e2e9e5",
      borderRadius: "16px",
      boxShadow: "0 4px 12px rgba(19,45,34,.05)"
    });
    panel.innerHTML = `<div style="margin-bottom:10px"><strong style="display:block;color:#26362f;font-size:16px">مراجعة تصميم النظام كاملًا</strong><small style="color:#6f7d76">تجميع جميع صفحات وأقسام الموقع في ملف PDF واحد للمراجعة.</small></div>`;

    const button = document.createElement("button");
    button.id = BUTTON_ID;
    button.type = "button";
    button.textContent = "طباعة جميع صفحات النظام";
    Object.assign(button.style, {
      minHeight: "42px",
      padding: "9px 18px",
      background: "#246b52",
      color: "#fff",
      border: "1px solid #246b52",
      borderRadius: "10px",
      fontWeight: "800",
      cursor: "pointer"
    });
    button.addEventListener("click", printWholeSite);
    panel.appendChild(button);
    main.appendChild(panel);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", () => setTimeout(mountButton, 1000), { once: true });
  else setTimeout(mountButton, 1000);
})();
