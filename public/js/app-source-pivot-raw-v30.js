/* Legacy Pivot compatibility shim.
 * Parsing is now owned by app-source-stations-wide-v9.js (V32 adapter),
 * which handles landfill, stations and Aziz together for flat and grouped Pivot files.
 * Keeping a second delayed renderer here caused the same preview cells to be rewritten
 * by two parsers with different category rules.
 */
(function(){})();
