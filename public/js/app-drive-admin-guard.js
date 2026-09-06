/* Admin-only guard for Drive/Excel/source import page. */
(function(){
  const page = document.body?.dataset?.page === 'drive-import';
  if (!page) return;

  function lockImportPage(message='هذه الصفحة متاحة للمدير فقط.') {
    const notice = document.getElementById('adminOnlyNotice');
    if (notice) {
      notice.classList.remove('hidden');
      notice.textContent = message;
    }
    [
      'sourceFilesPanel',
      'localExcelPanel',
      'driveSetupPanel',
      'driveFilesPanel',
      'previewPanel'
    ].forEach((id) => {
      const el = document.getElementById(id);
      if (!el) return;
      el.classList.add('hidden');
      el.setAttribute('aria-hidden','true');
      if ('inert' in el) el.inert = true;
      el.querySelectorAll('input,button,select,textarea').forEach((control) => control.disabled = true);
    });
  }

  async function check(){
    try {
      const response = await fetch('/api/auth/status', { cache:'no-store' });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data?.authenticated || data?.user?.role !== 'admin') {
        lockImportPage();
        return false;
      }
      return true;
    } catch (_) {
      lockImportPage('تعذر التحقق من صلاحية المدير. تم تعطيل الاستيراد حفاظًا على البيانات.');
      return false;
    }
  }

  window.MINYA_IMPORT_ADMIN_CHECK = check();
})();
