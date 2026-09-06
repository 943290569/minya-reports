/* Normalize legacy/imported operation names in monthly aggregation. */
(function(){
  const original = window.calculateMonthlyOperations;
  if (typeof original !== "function") return;

  const canonical = (name) => {
    const value = String(name || "").replace(/\s+/g, " ").trim();
    const aliases = new Map([
      ["مواد التغطية ( طمم)", "مواد التغطية (طمم)"],
      ["كميات المياه", "كميات المياه للتعقيم والترطيب"],
      ["كميات العصارة", "كميات العصارة المرحلة"],
      ["( طمم) خارجي", "طمم خارجي"],
      ["(طمم) خارجي", "طمم خارجي"]
    ]);
    return aliases.get(value) || value;
  };

  window.calculateMonthlyOperations = function(detailedReports){
    const normalized = (detailedReports || []).map((data) => ({
      ...data,
      operations: (data.operations || []).map((item) => ({
        ...item,
        operation_name: canonical(item.operation_name)
      }))
    }));
    return original(normalized);
  };
})();
