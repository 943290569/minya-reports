/* Review-only PDF print for the current report screen. Does not modify official report printing. */
(function () {
  const BUTTON_ID = "printUiReviewBtn";

  function syncFormValues(root) {
    root.querySelectorAll("input").forEach((input) => {
      if (input.type === "checkbox" || input.type === "radio") {
        if (input.checked) input.setAttribute("checked", "checked");
        else input.removeAttribute("checked");
      } else {
        input.setAttribute("value", input.value ?? "");
      }
    });

    root.querySelectorAll("textarea").forEach((textarea) => {
      textarea.textContent = textarea.value ?? "";
    });

    root.querySelectorAll("select").forEach((select) => {
      Array.from(select.options).forEach((option, index) => {
        if (index === select.selectedIndex) option.setAttribute("selected", "selected");
        else option.removeAttribute("selected");
      });
    });
  }

  function buildReviewDocument() {
    const sourceMain = document.querySelector("main.container");
    if (!sourceMain) return null;

    const clone = sourceMain.cloneNode(true);
    syncFormValues(clone);

    clone.querySelectorAll("#archiveSection, .actions, #message, script").forEach((el) => el.remove());
    clone.querySelectorAll(".hidden").forEach((el) => {
      if (el.id !== "archiveSection") el.classList.remove("hidden");
    });

    const title = document.createElement("div");
    title.className = "review-print-title";
    title.innerHTML = `
      <strong>مراجعة تنسيق واجهة التقرير اليومي</strong>
      <span>نسخة مخصصة لمراجعة جميع الأقسام قبل اعتماد أي تعديلات تصميمية</span>
    `;
    clone.prepend(title);

    return clone;
  }

  function printReview() {
    const reviewMain = buildReviewDocument();
    if (!reviewMain) {
      alert("تعذر تجهيز أقسام التقرير للمراجعة.");
      return;
    }

    const popup = window.open("", "_blank", "noopener,noreferrer");
    if (!popup) {
      alert("اسمح بفتح النوافذ المنبثقة لطباعة ملف المراجعة.");
      return;
    }

    const styles = Array.from(document.querySelectorAll('link[rel="stylesheet"]'))
      .map((link) => `<link rel="stylesheet" href="${link.href}">`)
      .join("\n");

    popup.document.open();
    popup.document.write(`<!doctype html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>مراجعة واجهة التقرير اليومي</title>
${styles}
<style>
  html,body{margin:0!important;padding:0!important;background:#f3f6f5!important;color:#1f2d27!important;direction:rtl!important;}
  body{padding:14mm 10mm!important;-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important;}
  .container{width:100%!important;max-width:none!important;margin:0 auto!important;}
  .review-print-title{margin:0 0 18px;padding:16px 18px;background:#174b3a;color:#fff;border-radius:14px;display:flex;flex-direction:column;gap:4px;break-inside:avoid;}
  .review-print-title strong{font-size:20px;}
  .review-print-title span{font-size:11px;color:rgba(255,255,255,.72);}
  .top-header,.actions,#archiveSection,#message{display:none!important;}
  .panel,.smart-status-panel,.smart-monitoring,.dashboard-card,.daily-summary>div{break-inside:avoid;page-break-inside:avoid;}
  .panel{margin-bottom:12px!important;padding:15px!important;border-radius:14px!important;box-shadow:none!important;}
  .panel>h2{margin-bottom:12px!important;}
  table{width:100%!important;table-layout:auto!important;box-shadow:none!important;}
  th,td{padding:7px 6px!important;font-size:11px!important;}
  input,select,textarea{min-height:32px!important;padding:5px 7px!important;font-size:11px!important;background:#fff!important;}
  textarea{min-height:72px!important;}
  .daily-summary{gap:8px!important;}
  .daily-summary>div{min-height:68px!important;padding:9px 10px!important;}
  button{display:none!important;}
  @page{size:A4 portrait;margin:8mm;}
  @media print{
    html,body{background:#f3f6f5!important;}
    .container{width:100%!important;}
  }
</style>
</head>
<body>${reviewMain.outerHTML}</body>
</html>`);
    popup.document.close();

    const runPrint = () => {
      try {
        popup.focus();
        popup.print();
      } catch (error) {
        console.error("Review print failed", error);
      }
    };

    if (popup.document.readyState === "complete") setTimeout(runPrint, 350);
    else popup.addEventListener("load", () => setTimeout(runPrint, 350), { once: true });
  }

  function mountButton() {
    if (location.pathname !== "/report") return;
    if (document.getElementById(BUTTON_ID)) return;

    const actions = document.querySelector("section.actions");
    if (!actions) return;

    const button = document.createElement("button");
    button.id = BUTTON_ID;
    button.type = "button";
    button.textContent = "طباعة مراجعة الواجهة";
    button.title = "تجميع جميع أقسام شاشة التقرير في ملف PDF للمراجعة";
    Object.assign(button.style, {
      marginInlineStart: "10px",
      background: "#f5f8f7",
      color: "#295443",
      border: "1px solid #cfded6",
      minHeight: "42px",
      padding: "9px 16px",
      fontWeight: "700",
      cursor: "pointer"
    });
    button.addEventListener("click", printReview);
    actions.appendChild(button);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => setTimeout(mountButton, 200), { once: true });
  } else {
    setTimeout(mountButton, 200);
  }
})();
