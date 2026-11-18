# SÚJB – systém pro generování testových otázek ZOZ

Funkční prototyp aplikace pro **Státní úřad pro jadernou bezpečnost** (SÚJB), která slouží ke správě testových otázek, sestavování testů, generování variací a elektronickému zkoušení zvláštní odborné způsobilosti (ZOZ).

**Živá ukázka:** <https://sujb-testy.vercel.app>

> Prototyp s ukázkovými daty. Data se ukládají do `localStorage` prohlížeče, nejde o produkční systém.

## Co je hotové

### Administrace rolí
- 4 role: administrátor organizace, administrátor pobočky, lektor, studující
- 3 pobočky (Praha, Brno, Ostrava), viditelnost dat podle role a pobočky

### Banka otázek
- Klasická otázka: zadání + 4 a více odpovědí, jedna nebo více správných
- Formátovaný text (tučné, kurzíva, horní/dolní index, seznamy)
- Vkládání obrázků (upload, uložení jako data URL)
- Poznámka k otázce, reakce na správnou/chybnou odpověď
- Štítky na úrovni organizace i pobočky, více štítků na otázku
- **Historie verzí** – kdo, kdy a jak otázku změnil; nová verze při každé úpravě
- Fulltextové vyhledávání a filtr podle štítků

### Soubory otázek
- Vlastnictví souboru, práva čtení / editace / vlastník pro jednotlivé lektory
- Zobrazení obsahu souboru, počty otázek

### Testy
- Sestavení ze souborů otázek, přímý výběr povinných otázek + náhodný výběr N otázek
- Povolené / zakázané štítky pro výběr
- Časový limit, míchání otázek, úvodní stránka, heslo, kritérium splnění, max. počet pokusů, zobrazení výsledků
- **Generování unikátních variací** testu
- **Tiskové sestavy** variací včetně klíče správných odpovědí

### Elektronické zkoušení
- Kódy pro studující a anonymní odkazy
- Přidělení testu konkrétnímu studujícímu, hromadné přidělení
- Vyplňování s časomírou a automatickým odevzdáním
- Sledování průběhu v reálném čase (progress)
- Okamžité vyhodnocení s rozborem jednotlivých otázek

### Výsledky a statistiky
- Přehled výsledků podle role (studující / lektor / pobočka / organizace)
- Protokol o zkoušce s tiskem
- Úspěšnost podle otázek (zařazení, zobrazení, správné odpovědi) a podle poboček

## Technologie

Statický web – HTML + CSS + vanilla JS, žádná závislost, nasazeno na Vercel.

```
index.html    – shell
styles.css    – design systém
app.js        – celá aplikace (data, routování, views)
```

## Spuštění lokálně

```bash
npx serve .
# nebo
python3 -m http.server 8080
```

## Demo přihlášení

Na přihlašovací obrazovce vyberte roli. Přímý vstup pro náhledy: `/?as=u1` (admin organizace), `u2` (admin pobočky), `u3` (lektor), `u5` (studující).

## Co v prototypu chybí (další fáze)

- Serverová perzistence a autentizace (prototyp je čistě klientský)
- Skutečné e-mailové rozesílky odkazů
- Produkční tiskové šablony dle požadavků SÚJB
- Zálohování a auditní log dle smlouvy
