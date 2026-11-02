import { APP_LOCALE_COOKIE } from "@/lib/locale";

// Runs before hydration so the chosen language does not flash in Spanish.
// Split cookie entries explicitly: preferences need not be the first cookie.
export const localeBootstrapScript = `try{var entry=document.cookie.split(";").map(function(value){return value.trim();}).find(function(value){return value.indexOf("${APP_LOCALE_COOKIE}=")===0;});var locale=entry==="${APP_LOCALE_COOKIE}=en"?"en":"es";document.documentElement.dataset.locale=locale;document.documentElement.lang=locale==="en"?"en":"es-AR";if(locale==="en")document.documentElement.classList.add("i18n-pending");}catch(_error){}`;
