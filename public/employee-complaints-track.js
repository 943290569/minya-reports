(() => {
  const $ = id => document.getElementById(id);
  const names = { new:"جديدة", reviewing:"قيد المراجعة", action_taken:"تم اتخاذ إجراء", responded:"تم الرد", closed:"مغلقة" };
  function date(value) { const [y,m,d] = String(value || "").slice(0,10).split("-"); return y && m && d ? d+"/"+m+"/"+y : "—"; }
  async function show(event) {
    event?.preventDefault();
    const raw = $("trackingCode").value.trim();
    const code = raw.length === 8 ? raw.toUpperCase() : raw.toLowerCase();
    $("trackingResult").hidden = true; $("trackResponse").textContent = "";
    if (!/^[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{8}$/.test(code) && !/^[a-f0-9]{64}$/.test(code)) { $("trackingMessage").textContent = "أدخل كود المتابعة كاملًا كما ظهر بعد إرسال الشكوى."; return; }
    $("trackingSubmit").disabled = true; $("trackingMessage").textContent = "جارٍ البحث...";
    try {
      const response = await fetch("/api/employee-complaints/track/" + encodeURIComponent(code), { cache:"no-store" });
      const data = await response.json();
      if (!response.ok || !data.ok) throw new Error(data.message || "تعذر العثور على الشكوى بهذا الكود.");
      const c = data.complaint;
      $("trackNo").textContent = c.complaint_no; $("trackStatus").textContent = names[c.status] || c.status;
      $("trackDue").textContent = date(c.due_date);
      $("trackResponse").textContent = c.response_text || "لم يصدر رد حتى الآن.";
      $("trackingResult").hidden = false; $("trackingMessage").textContent = "";
    } catch (error) { $("trackingMessage").textContent = error.message || "تعذر الاتصال. حاول مرة أخرى."; }
    finally { $("trackingSubmit").disabled = false; }
  }
  $("trackingForm").addEventListener("submit", show);
  const code = new URLSearchParams(location.hash.slice(1)).get("code") || new URLSearchParams(location.search).get("track");
  if (code) { $("trackingCode").value = code; show(); }
})();