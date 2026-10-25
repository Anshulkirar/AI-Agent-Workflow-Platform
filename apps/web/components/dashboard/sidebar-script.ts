export const SIDEBAR_STORAGE_KEY = "agentflow-sidebar";

/**
 * Runs in <head> before first paint so a collapsed sidebar stays collapsed on
 * load (no flash of the expanded sidebar). Styles key off
 * `<html data-sidebar="collapsed">` via the `collapsed:` variant.
 */
export const sidebarInitScript = `(function(){try{if(localStorage.getItem(${JSON.stringify(
  SIDEBAR_STORAGE_KEY,
)})==="collapsed")document.documentElement.dataset.sidebar="collapsed";}catch(e){}})();`;
