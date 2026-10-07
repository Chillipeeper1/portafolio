// Textos en inglés (por defecto) y español. Mayúsculas y sin acentos: la fuente de 8 bits no los dibuja bien.
const STR = {
  en: {
    brand: 'Zabdiel Cervantes - Portfolio',
    hint: 'ESC OR CLICK OUTSIDE TO EXIT',
    bubbleTitle: 'DID YOU KNOW...?',
    menuTitle: 'MENU',
    projects: 'PROJECTS',
    certifications: 'CERTIFICATIONS',
    about: 'ABOUT ME',
    contact: 'CONTACT',
    comingSoon: 'COMING SOON',
    moreSoon: 'MORE SOON',
    back: '< BACK',
    open: 'OPEN >',
    tabInfo: 'INFO',
    tabStack: 'STACK',
    tabRole: 'ROLE',
    aboutText: 'SOFTWARE ENGINEER WHO NEVER SLEEPS, THANKS TO ALL THE COFFEE. I HAVE EXPERIENCE, PERSONALITY AND NOT MUCH CLASS.',
    emailLabel: 'EMAIL',
    click1: 'CLICK',
    click2: 'ON ME',
  },
  es: {
    brand: 'Zabdiel Cervantes - Portafolio',
    hint: 'ESC O CLIC FUERA PARA SALIR',
    bubbleTitle: '¿SABIAS QUE...?',
    menuTitle: 'MENU',
    projects: 'PROYECTOS',
    certifications: 'CERTIFICACIONES',
    about: 'SOBRE MI',
    contact: 'CONTACTO',
    comingSoon: 'PROXIMAMENTE',
    moreSoon: 'MAS PRONTO',
    back: '< VOLVER',
    open: 'ABRIR >',
    tabInfo: 'INFO',
    tabStack: 'STACK',
    tabRole: 'ROL',
    aboutText: 'INGENIERO DE SOFTWARE QUE NO DUERME DE TANTO CAFE QUE TOMA. TENGO EXPERIENCIA, PERSONALIDAD Y NO TANTA CLASE.',
    emailLabel: 'CORREO',
    click1: 'HAZME',
    click2: 'CLIC',
  },
};

let lang = 'en';
try {
  const saved = localStorage.getItem('lang');
  if (saved === 'en' || saved === 'es') lang = saved;
} catch { /* sin almacenamiento: se queda en inglés */ }

const listeners = new Set();
export const getLang = () => lang;
export const t = (key) => STR[lang][key] ?? key;
export const pick = (obj) => obj[lang] ?? obj.en;
export const onLang = (fn) => listeners.add(fn);

function apply() {
  document.documentElement.lang = lang;
  document.title = t('brand');
  document.querySelectorAll('[data-i18n]').forEach((el) => { el.textContent = t(el.dataset.i18n); });
  document.querySelectorAll('[data-lang]').forEach((b) => {
    const on = b.dataset.lang === lang;
    b.classList.toggle('active', on);
    b.setAttribute('aria-pressed', String(on));
  });
}

export function setLang(next) {
  if (next === lang) return;
  lang = next;
  try { localStorage.setItem('lang', lang); } catch { /* ignorar */ }
  apply();
  listeners.forEach((fn) => fn(lang));
}

export function initI18n() {
  document.querySelectorAll('[data-lang]').forEach((b) => b.addEventListener('click', () => setLang(b.dataset.lang)));
  apply();
}
