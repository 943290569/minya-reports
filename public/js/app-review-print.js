/* Review-only PDF print for the current report screen. Does not modify official report printing. */
(function () {
  const BUTTON_ID = "printUiReviewBtn";
  const FRAME_ID = "minyaUiReviewPrintFrame";

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

  function buildHtml(reviewMain) {
    const styles = Array.from(document.querySelectorAll('link[rel="stylesheet"]'))
      .map((link) => `<link rel="stylesheet" href="${link.href}">`)
      .join("\n");

    return `<!doctype html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>مراجعة واجهة التقرير اليومي</title>
${styles}
<style>
  html,body{margin:0!important;padding:0!important;background:#f3f6f5!important;color:#1f2d27!important;direction:rtl!important;}
  body{padding:10mm 8mm!important;-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important;}
  .container{width:100%!important;max-width:none!important;margin:0 auto!important;}
  .review-print-title{margin:0 0 14px;padding:14px 16px;background:#174b3a;color:#fff;border-radius:12px;display:flex;flex-direction:column;gap:3px;break-inside:avoid;}
  .review-print-title strong{font-size:18px;}
  .review-print-title span{font-size:10px;color:rgba(255,255,255,.72);}
  .top-header,.actions,#archiveSection,#message{display:none!important;}
  .panel,.smart-status-panel,.smart-monitoring,.dashboard-card,.daily-summary>div{break-inside:avoid;page-break-inside:avoid;}
  .panel{margin-bottom:9px!important;padding:12px!important;border-radius:11px!important;box-shadow:none!important;}
  .panel>h2{margin-bottom:9px!important;font-size:15px!important;}
  table{width:100%!important;table-layout:auto!important;box-shadow:none!important;}
  th,td{padding:5px 5px!important;font-size:10px!important;}
  input,select,textarea{min-height:28px!important;padding:4px 6px!important;font-size:10px!important;background:#fff!important;}
  textarea{min-height:58px!important;}
  .daily-summary{gap:6px!important;}
  .daily-summary>div{min-height:58px!important;padding:7px 8px!important;}
  button{display:none!important;}
  @page{size:A4 portrait;margin:7mm;}
  @media print{
    html,body{background:#f3f6f5!important;}
    .container{width:100%!important;}
  }
</style>
</head>
<body>${reviewMain.outerHTML}</body>
</html>`;
  }

  function printReview() {
    const reviewMain = buildReviewDocument();
    if (!reviewMain) {
      alert("تعذر تجهيز أقسام التقرير للمراجعة.");
      return;
    }

    const oldFrame = document.getElementById(FRAME_ID);
    if (oldFrame) oldFrame.remove();

    const frame = document.createElement("iframe");
    frame.id = FRAME_ID;
    frame.setAttribute("aria-hidden", "true");
    Object.assign(frame.style, {
      position: "fixed",
      right: "0",
      bottom: "0",
      width: "1px",
      height: "1px",
      border: "0",
      opacity: "0",
      pointerEvents: "none"
    });
    document.body.appendChild(frame);

    const frameWindow = frame.contentWindow;
    const frameDocument = frame.contentDocument || frameWindow?.document;
    if (!frameWindow || !frameDocument) {
      frame.remove();
      alert("تعذر فتح معاينة الطباعة.");
      return;
    }

    frameDocument.open();
    frameDocument.write(buildHtml(reviewMain));
    frameDocument.close();

    let printed = false;
    const runPrint = () => {
      if (printed) return;
      printed = true;
      setTimeout(() => {
        try {
          frameWindow.focus();
          frameWindow.print();
        } catch (error) {
          console.error("Review print failed", error);
          alert("تعذر تشغيل الطباعة. حاول مرة أخرى.");
        }
        setTimeout(() => frame.remove(), 1500);
      }, 450);
    };

    frame.onload = runPrint;
    setTimeout(runPrint, 900);
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
