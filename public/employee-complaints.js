(() => {
  const $ = id => document.getElementById(id);
  const form = $("complaintForm"), audioInput = $("complaintAudio"), preview = $("audioPreview");
  const statusNames = { new:"جديدة", reviewing:"قيد المراجعة", action_taken:"تم اتخاذ إجراء", responded:"تم الرد", closed:"مغلقة" };
  const legacyToken = new URLSearchParams(location.search).get("track");
  if (legacyToken) { location.replace("/employee-complaints-track.html#code=" + encodeURIComponent(legacyToken)); return; }
  let trackingUrl = "", trackingCode = "";

  let selectedAudio = null, recorder = null, stream = null, previewUrl = "", timer = null, starting = false;
  const startButton = $("recordStart"), stopButton = $("recordStop"), clearButton = $("recordClear"), recordStatus = $("recordStatus");
  const maxBytes = 8 * 1024 * 1024;
  function releaseMicrophone() {
    if (timer) clearInterval(timer);
    timer = null;
    if (stream) stream.getTracks().forEach(track => track.stop());
    stream = null;
  }
  function setAudio(file) {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    previewUrl = ""; selectedAudio = null;
    preview.pause(); preview.removeAttribute("src"); preview.hidden = true;
    if (!file) return;
    if (file.size > maxBytes || !file.type.startsWith("audio/")) {
      audioInput.value = "";
      recordStatus.textContent = "اختر ملفًا صوتيًا لا يتجاوز 8 MB."; return;
    }
    selectedAudio = file; previewUrl = URL.createObjectURL(file);
    preview.src = previewUrl; preview.hidden = false;
  }
  audioInput.addEventListener("change", () => { setAudio(audioInput.files?.[0]); });
  startButton.addEventListener("click", async () => {
    if (starting || recorder?.state === "recording") return;
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
      recordStatus.textContent = "المتصفح لا يدعم التسجيل هنا. يمكنك رفع ملف صوتي."; return;
    }
    starting = true; startButton.disabled = true; clearButton.disabled = true; audioInput.disabled = true; $("submitBtn").disabled = true;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = ["audio/webm;codecs=opus", "audio/mp4", "audio/ogg;codecs=opus"].find(type => MediaRecorder.isTypeSupported(type));
      recorder = new MediaRecorder(stream, mime ? { mimeType: mime, audioBitsPerSecond: 64000 } : { audioBitsPerSecond: 64000 });
      const chunks = []; let bytes = 0; const begun = Date.now();
      recorder.ondataavailable = event => {
        if (event.data.size) { chunks.push(event.data); bytes += event.data.size; }
        if (bytes >= maxBytes && recorder.state === "recording") recorder.stop();
      };
      recorder.onstop = () => {
        const type = recorder.mimeType || chunks[0]?.type || "audio/webm";
        const ext = type.includes("mp4") ? "m4a" : type.includes("ogg") ? "ogg" : "webm";
        const blob = new Blob(chunks, { type });
        releaseMicrophone(); audioInput.value = "";
        if (blob.size) setAudio(new File([blob], "complaint-recording." + ext, { type }));
        recordStatus.textContent = blob.size > maxBytes ? "التسجيل تجاوز 8 MB. أعد تسجيل مقطع أقصر." : blob.size ? "التسجيل جاهز للمعاينة والإرسال." : "لم يُسجّل صوت. حاول مرة أخرى.";
        startButton.disabled = false; stopButton.disabled = true; clearButton.disabled = false; audioInput.disabled = false; $("submitBtn").disabled = false;
      };
      recorder.onerror = () => { recordStatus.textContent = "تعذر إكمال التسجيل."; if (recorder.state !== "inactive") recorder.stop(); releaseMicrophone(); };
      recorder.start(1000); stopButton.disabled = false;
      recordStatus.textContent = "جارٍ التسجيل — 0 ثانية";
      timer = setInterval(() => {
        const seconds = Math.floor((Date.now() - begun) / 1000);
        recordStatus.textContent = "جارٍ التسجيل — " + seconds + " ثانية";
        if (seconds >= 600 && recorder.state === "recording") recorder.stop();
      }, 1000);
    } catch (error) {
      releaseMicrophone();
      recordStatus.textContent = error.name === "NotAllowedError" ? "اسمح للصفحة باستخدام الميكروفون من إعدادات المتصفح." : error.name === "NotFoundError" ? "لم يعثر المتصفح على ميكروفون." : "تعذر تشغيل الميكروفون. يمكنك رفع ملف صوتي.";
      startButton.disabled = false; stopButton.disabled = true; clearButton.disabled = false; audioInput.disabled = false; $("submitBtn").disabled = false;
    } finally { starting = false; }
  });
  stopButton.addEventListener("click", () => { if (recorder?.state === "recording") { stopButton.disabled = true; recorder.stop(); } });
  clearButton.addEventListener("click", () => { setAudio(null); audioInput.value = ""; recordStatus.textContent = ""; });
  window.addEventListener("pagehide", () => { if (recorder?.state === "recording") recorder.stop(); releaseMicrophone(); });

  function fileToBase64(file) {
    return new Promise((resolve,reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || "").split(",")[1] || "");
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }
  form.addEventListener("submit", async e => {
    e.preventDefault();
    if (starting || recorder?.state === "recording") return;
    const file = selectedAudio;
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
      trackingCode = data.tracking_token;
      trackingUrl = location.origin + "/employee-complaints-track.html#code=" + encodeURIComponent(trackingCode);
      $("receiptCode").textContent = trackingCode;
      $("openTracking").href = trackingUrl;
      form.reset(); setAudio(null); recordStatus.textContent = "";
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
  $("copyCode").addEventListener("click", async () => {
    if (!trackingCode) return;
    try { await navigator.clipboard.writeText(trackingCode); $("copyCode").textContent = "تم النسخ"; }
    catch { prompt("انسخ كود المتابعة", trackingCode); }
  });
  $("closeDialog").addEventListener("click", () => $("successDialog").close());
})();