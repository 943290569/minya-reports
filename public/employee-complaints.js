(() => {
  const $ = id => document.getElementById(id);
  const form = $("complaintForm"), audioInput = $("complaintAudio"), preview = $("audioPreview");
  const statusNames = { new:"جديدة", reviewing:"قيد المراجعة", action_taken:"تم اتخاذ إجراء", responded:"تم الرد", closed:"مغلقة" };
  let trackingUrl = "";

  audioInput.addEventListener("change", () => {
    const file = audioInput.files?.[0];
    if (!file) { preview.hidden = true; preview.removeAttribute("src"); return; }
    if (file.size > 8 * 1024 * 1024) {
      audioInput.value = ""; preview.hidden = true; alert("حجم التسجيل الصوتي يجب ألا يتجاوز 8 MB."); return;
    }
    preview.src = URL.createObjectURL(file); preview.hidden = false;
  });

  function fileToBase64(file) {
    return new Promise((resolve,reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || "").split(",")[1] || "");
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }
  function formatDate(value) {
    if (!value) return "-";
    const [y,m,d] = String(value).slice(0,10).split("-");
    return y && m && d ? `${d}/${m}/${y}` : value;
  }
  async function loadTracking(token) {
    if (!token) return;
    try {
      const r = await fetch("/api/employee-complaints/track/" + encodeURIComponent(token));
      const data = await r.json();
      if (!r.ok || !data.ok) return;
      const c = data.complaint;
      $("trackingBox").hidden = false;
      $("trackNo").textContent = c.complaint_no;
      $("trackStatus").textContent = statusNames[c.status] || c.status;
      $("trackDue").textContent = formatDate(c.due_date);
      if (c.response_text) {
        $("trackResponseWrap").hidden = false;
        $("trackResponse").textContent = c.response_text;
      }
    } catch {}
  }
  const tokenFromUrl = new URLSearchParams(location.search).get("track");
  if (tokenFromUrl) loadTracking(tokenFromUrl);

  form.addEventListener("submit", async e => {
    e.preventDefault();
    const file = audioInput.files?.[0] || null;
    const text = $("complaintText").value.trim();
    if (!text && !file) { $("formMessage").textContent = "اكتب تفاصيل الشكوى أو أرفق تسجيلًا صوتيًا."; return; }
    const btn = $("submitBtn"); btn.disabled = true; btn.textContent = "جارٍ الإرسال";
    $("formMessage").textContent = "";
    try {
      const payload = {
        employee_name: $("employeeName").value.trim(),
        complaint_type: $("complaintType").value,
        complaint_text: text
      };
      if (file) {
        payload.audio_original_name = file.name || "complaint-audio";
        payload.audio_mime_type = file.type || "audio/mpeg";
        payload.audio_base64 = await fileToBase64(file);
      }
      const r = await fetch("/api/employee-complaints", {
        method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify(payload)
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok || !data.ok) throw new Error(data.message || "تعذر إرسال الشكوى.");
      $("receiptNo").textContent = data.complaint_no;
      trackingUrl = location.origin + location.pathname + "?track=" + encodeURIComponent(data.tracking_token);
      history.replaceState(null, "", "?track=" + encodeURIComponent(data.tracking_token));
      await loadTracking(data.tracking_token);
      form.reset(); preview.hidden = true; preview.removeAttribute("src");
      $("successDialog").showModal();
    } catch (err) {
      $("formMessage").textContent = err.message || "تعذر إرسال الشكوى.";
    } finally {
      btn.disabled = false; btn.textContent = "إرسال الشكوى";
    }
  });
  $("copyLink").addEventListener("click", async () => {
    if (!trackingUrl) return;
    try { await navigator.clipboard.writeText(trackingUrl); $("copyLink").textContent = "تم النسخ"; }
    catch { prompt("انسخ رابط المتابعة", trackingUrl); }
  });
  $("closeDialog").addEventListener("click", () => $("successDialog").close());
})();