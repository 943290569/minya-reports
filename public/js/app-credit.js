/* =========================================================
   اعتماد تصميم النظام
========================================================= */

(function () {
  function addDesignCredit() {
    if (document.getElementById("landfillDesignCredit")) return;

    const footer = document.createElement("footer");
    footer.id = "landfillDesignCredit";
    footer.className = "landfill-design-credit";
    footer.innerHTML = `
      <span>تصميم قسم المكب</span>
      <strong>المهندس محمد جبرين</strong>
    `;
    document.body.appendChild(footer);

    if (!document.getElementById("landfillDesignCreditStyle")) {
      const style = document.createElement("style");
      style.id = "landfillDesignCreditStyle";
      style.textContent = `
        .landfill-design-credit {
          width: min(94%, 1480px);
          margin: 26px auto 18px;
          padding: 14px 18px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          flex-wrap: wrap;
          color: #667085;
          border-top: 1px solid #dfe6ee;
          font-size: 12px;
          text-align: center;
        }
        .landfill-design-credit span::after {
          content: " — ";
          color: #98a2b3;
        }
        .landfill-design-credit strong {
          color: #176b4f;
          font-size: 13px;
          font-weight: 900;
        }
        @media (max-width: 560px) {
          .landfill-design-credit {
            flex-direction: column;
            gap: 3px;
            margin-top: 20px;
          }
          .landfill-design-credit span::after { content: ""; }
        }
        @media print {
          .landfill-design-credit { display: none !important; }
        }
      `;
      document.head.appendChild(style);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", addDesignCredit);
  } else {
    addDesignCredit();
  }
})();
