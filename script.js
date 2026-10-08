const dayInput = document.getElementById('dayInput');
const monthInput = document.getElementById('monthInput');
const yearInput = document.getElementById('yearInput');
const weekInput = document.getElementById('weekInput');
const weekYearInput = document.getElementById('weekYearInput');
const descriptionInput = document.getElementById('descriptionInput');
const searchDescription = document.getElementById('searchDescription');
const descriptionMessage = document.getElementById('descriptionMessage');
const eventSearchInput = document.getElementById('eventSearchInput');
const eventSearchButton = document.getElementById('eventSearchButton');
const eventSearchMessage = document.getElementById('eventSearchMessage');

const calendar = document.getElementById('calendar');
const calendarMonth = document.getElementById('calendarMonth');
const calendarWeekInfo = document.getElementById('calendarWeekInfo');
const prevMonth = document.getElementById('prevMonth');
const nextMonth = document.getElementById('nextMonth');
const holidayList = document.getElementById('holidayList');
const historicalEvents = document.getElementById('historicalEvents');

const maanden = [
    'januari','februari','maart','april','mei','juni',
    'juli','augustus','september','oktober','november','december'
];

let viewDate = new Date();
let selectedDate = null;
let selectedDates = [];
let selectedWeek = null;
let historicalEventDates = new Set();
let historicalEventsMonthKey = '';

function pad(value) {
    return String(value).padStart(2, '0');
}

function toDateKey(date) {
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function getISOWeek(date) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const day = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - day);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

function getISOWeekYear(date) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const day = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - day);
    return d.getUTCFullYear();
}

function getDateFromISOWeek(week, year) {
    const jan4 = new Date(year, 0, 4);
    const day = jan4.getDay() || 7;
    const monday = new Date(year, 0, 4);
    monday.setDate(jan4.getDate() - day + 1 + (week - 1) * 7);
    return monday;
}

function isoWeeksInYear(year) {
    return getISOWeek(new Date(year, 11, 28));
}

function easterSunday(year) {
    const a = year % 19;
    const b = Math.floor(year / 100);
    const c = year % 100;
    const d = Math.floor(b / 4);
    const e = b % 4;
    const f = Math.floor((b + 8) / 25);
    const g = Math.floor((b - f + 1) / 3);
    const h = (19 * a + b - d - g + 15) % 30;
    const i = Math.floor(c / 4);
    const k = c % 4;
    const l = (32 + 2 * e + 2 * i - h - k) % 7;
    const m = Math.floor((a + 11 * h + 22 * l) / 451);
    const month = Math.floor((h + l - 7 * m + 114) / 31);
    const day = ((h + l - 7 * m + 114) % 31) + 1;
    return new Date(year, month - 1, day);
}

function addDays(date, days) {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
}

function getDutchHolidays(year) {
    const holidays = new Map();

    const add = (date, name) => holidays.set(toDateKey(date), name);

    add(new Date(year, 0, 1), 'Nieuwjaarsdag');

    const easter = easterSunday(year);
    add(addDays(easter, -2), 'Goede Vrijdag');
    add(easter, 'Eerste Paasdag');
    add(addDays(easter, 1), 'Tweede Paasdag');
    add(addDays(easter, 39), 'Hemelvaartsdag');
    add(addDays(easter, 49), 'Eerste Pinksterdag');
    add(addDays(easter, 50), 'Tweede Pinksterdag');

    // Historische Koninginnedag: 31 augustus onder Wilhelmina (1891–1948),
    // 30 april onder Juliana en Beatrix (1949–2013).
    if (year >= 1891 && year <= 1948) {
        add(new Date(year, 7, 31), 'Koninginnedag');
    } else if (year >= 1949 && year <= 2013) {
        add(new Date(year, 3, 30), 'Koninginnedag');
    } else if (year >= 2014) {
        const kingsDay = new Date(year, 3, 27);
        if (kingsDay.getDay() === 0) kingsDay.setDate(26);
        add(kingsDay, 'Koningsdag');
    }

    // Bevrijdingsdag is sinds 2021 jaarlijks een officiële vrije dag.
    // Voor oudere jaren markeren we de bekende vijfjaarlijkse viering.
    if (year >= 2021 || (year >= 1990 && year % 5 === 0)) {
        add(new Date(year, 4, 5), 'Bevrijdingsdag');
    }

    add(new Date(year, 11, 25), 'Eerste Kerstdag');
    add(new Date(year, 11, 26), 'Tweede Kerstdag');

    return holidays;
}


function populateMonths() {
    monthInput.innerHTML = '';
    maanden.forEach((month, index) => {
        const option = document.createElement('option');
        option.value = index;
        option.textContent = month;
        monthInput.appendChild(option);
    });
}

function setDateInputs(date) {
    dayInput.value = date.getDate();
    monthInput.value = date.getMonth();
    yearInput.value = date.getFullYear();
}

function clearWeekInputs() {
    weekInput.value = '';
    weekYearInput.value = '';
}

function clearDateInputs() {
    dayInput.value = '';
    monthInput.value = '';
    yearInput.value = '';
}

function clearHistoricalEventsDisplay() {
    historicalEvents.hidden = true;
    historicalEvents.innerHTML = '';
}

function clearOtherRows(activeRow) {
    if (activeRow !== 'date') {
        clearDateInputs();
    }
    if (activeRow !== 'week') {
        clearWeekInputs();
    }
    if (activeRow !== 'description') {
        descriptionInput.value = '';
    }
    if (activeRow !== 'event') {
        eventSearchInput.value = '';
    }

    selectedDate = null;
    selectedDates = [];
    selectedWeek = null;
    if (activeRow !== 'event') clearHistoricalEventsDisplay();
}

function validDateFromInputs() {
    const day = Number(dayInput.value);
    const month = Number(monthInput.value);
    const year = Number(yearInput.value);

    if (!dayInput.value || !yearInput.value || !Number.isInteger(day) ||
        !Number.isInteger(year) || day < 1 || day > 31 || year < 1000 || year > 2100) {
        return null;
    }

    const date = new Date(year, month, day);
    if (date.getFullYear() !== year || date.getMonth() !== month || date.getDate() !== day) {
        return null;
    }
    return date;
}

function validWeekFromInputs() {
    const week = Number(weekInput.value);
    const year = Number(weekYearInput.value);

    if (!weekInput.value || !weekYearInput.value ||
        !Number.isInteger(week) || !Number.isInteger(year) ||
        week < 1 || week > isoWeeksInYear(year) || year < 1000 || year > 2100) {
        return null;
    }

    return { week, year };
}

function updateFromDate() {
    const date = validDateFromInputs();
    if (!date) {
        selectedDate = null;
        renderCalendar();
        return;
    }

    selectedDate = date;
    selectedWeek = null;
    clearWeekInputs();
    viewDate = new Date(date.getFullYear(), date.getMonth(), 1);
    renderCalendar();
    loadHistoricalEvents(date);
}

function updateFromWeek() {
    clearDateInputs();
    const weekData = validWeekFromInputs();
    if (!weekData) {
        selectedWeek = null;
        renderCalendar();
        return;
    }

    selectedWeek = weekData;
    selectedDate = null;
    clearDateInputs();

    const monday = getDateFromISOWeek(weekData.week, weekData.year);
    viewDate = new Date(monday.getFullYear(), monday.getMonth(), 1);
    renderCalendar();
}

function parseDescription(value) {
    const text = value.trim().toLowerCase();
    if (!text) return false;

    const yearMatch = text.match(/(?:^|\D)(\d{4})(?:$|\D)/);
    const year = yearMatch ? Number(yearMatch[1]) : null;

    if (year >= 1000 && year <= 2100) {
        const holidays = getDutchHolidays(year);
        const normalized = text
            .replace(/1e/g, 'eerste')
            .replace(/2e/g, 'tweede')
            .replace(/3e/g, 'derde')
            .replace(/\s+/g, ' ')
            .trim();

        // Zoek op alleen een jaar + een feestdaggroep en toon beide dagen.
        const groupAliases = [
            ['pasen', 'Eerste Paasdag'],
            ['paasdagen', 'Eerste Paasdag'],
            ['pinksteren', 'Eerste Pinksterdag'],
            ['pinksterdagen', 'Eerste Pinksterdag'],
            ['kerst', 'Eerste Kerstdag'],
            ['kerstdagen', 'Eerste Kerstdag']
        ];

        for (const [alias, firstHolidayName] of groupAliases) {
            if (normalized.includes(alias)) {
                const dates = [];
                const secondNames = {
                    'Eerste Paasdag': 'Tweede Paasdag',
                    'Eerste Pinksterdag': 'Tweede Pinksterdag',
                    'Eerste Kerstdag': 'Tweede Kerstdag'
                };
                for (const [key, name] of holidays) {
                    if (name === firstHolidayName || name === secondNames[firstHolidayName]) {
                        const parts = key.split('-').map(Number);
                        dates.push(new Date(parts[0], parts[1] - 1, parts[2]));
                    }
                }
                if (dates.length === 2) {
                    dates.sort((a, b) => a - b);
                    // Toon de maand waarin de eerste dag valt en markeer beide dagen.
                    setDateInputs(dates[0]);
                    selectedDate = null;
                    selectedWeek = null;
                    viewDate = new Date(dates[0].getFullYear(), dates[0].getMonth(), 1);
                    renderCalendar();

                    const first = dates[0];
                    const second = dates[1];
                    dayInput.value = '';
                    monthInput.value = '';
                    yearInput.value = year;
                    selectedDates = dates;
                    renderCalendar();
                    return { dates };
                }
            }
        }

        const holidayAliases = [
            ['koninginnedag', 'Koninginnedag'],
            ['koningsdag', 'Koningsdag'],
            ['nieuwjaarsdag', 'Nieuwjaarsdag'],
            ['goede vrijdag', 'Goede Vrijdag'],
            ['eerste paasdag', 'Eerste Paasdag'],
            ['tweede paasdag', 'Tweede Paasdag'],
            ['eerste pinksterdag', 'Eerste Pinksterdag'],
            ['tweede pinksterdag', 'Tweede Pinksterdag'],
            ['hemelvaartsdag', 'Hemelvaartsdag'],
            ['bevrijdingsdag', 'Bevrijdingsdag'],
            ['eerste kerstdag', 'Eerste Kerstdag'],
            ['tweede kerstdag', 'Tweede Kerstdag']
        ];

        for (const [alias, holidayName] of holidayAliases) {
            if (normalized.includes(alias)) {
                for (const [key, name] of holidays) {
                    if (name === holidayName) {
                        const parts = key.split('-').map(Number);
                        const date = new Date(parts[0], parts[1] - 1, parts[2]);
                        setDateInputs(date);
                        updateFromDate();
                        return true;
                    }
                }
                return false;
            }
        }
    }

    let match = text.match(/^(\d{1,2})[\-\/\.](\d{1,2})[\-\/\.](\d{4})$/);
    if (match) {
        const date = new Date(Number(match[3]), Number(match[2]) - 1, Number(match[1]));
        if (date.getFullYear() === Number(match[3]) &&
            date.getMonth() === Number(match[2]) - 1 &&
            date.getDate() === Number(match[1])) {
            setDateInputs(date);
            updateFromDate();
            return true;
        }
        return false;
    }

    const monthIndex = maanden.findIndex(month => text.includes(month));
    match = text.match(/(\d{1,2}).*?(\d{4})/);
    if (monthIndex >= 0 && match) {
        const date = new Date(Number(match[2]), monthIndex, Number(match[1]));
        if (date.getFullYear() === Number(match[2]) &&
            date.getMonth() === monthIndex &&
            date.getDate() === Number(match[1])) {
            setDateInputs(date);
            updateFromDate();
            return true;
        }
        return false;
    }

    return false;
}

async function loadHistoricalEventMarkers(year, month) {
    const monthKey = `${year}-${pad(month + 1)}`;
    historicalEventsMonthKey = monthKey;
    historicalEventDates = new Set();

    const startDate = `${year}-${pad(month + 1)}-01T00:00:00Z`;
    const nextMonth = new Date(year, month + 1, 1);
    const endDate = `${nextMonth.getFullYear()}-${pad(nextMonth.getMonth() + 1)}-01T00:00:00Z`;

    const query = 'SELECT DISTINCT ?date WHERE { ?item wdt:P585 ?date. FILTER(?date >= "' + startDate + '"^^xsd:dateTime && ?date < "' + endDate + '"^^xsd:dateTime) FILTER(EXISTS { ?item wdt:P17 wd:Q55. } || EXISTS { ?item wdt:P276/wdt:P17 wd:Q55. }) } LIMIT 1000';

    try {
        const response = await fetch('https://query.wikidata.org/sparql?format=json&query=' + encodeURIComponent(query), {
            headers: { 'Accept': 'application/sparql-results+json' }
        });
        if (!response.ok) throw new Error('Wikidata request failed');

        const data = await response.json();
        const rows = data.results.bindings || [];

        rows.forEach(row => {
            const value = row.date?.value;
            if (value) historicalEventDates.add(value.slice(0, 10));
        });

        if (historicalEventsMonthKey === monthKey) {
            renderCalendar();
        }
    } catch (error) {
        // Geen marker bij een tijdelijke fout; de kalender blijft gewoon bruikbaar.
    }
}

function showDescriptionMessage(message, type = '') {
    descriptionMessage.textContent = message;
    descriptionMessage.className = 'description-message' + (type ? ' ' + type : '');
}

function clearCalendarSelection() {
    selectedDate = null;
    selectedDates = [];
    selectedWeek = null;
    renderCalendar();
}
function renderHolidayList(year, month) {
    const holidays = getDutchHolidays(year);
    const monthHolidays = [];

    holidays.forEach((name, key) => {
        const parts = key.split('-').map(Number);
        if (parts[0] === year && parts[1] === month + 1) {
            monthHolidays.push({
                date: new Date(parts[0], parts[1] - 1, parts[2]),
                name
            });
        }
    });

    monthHolidays.sort((a, b) => a.date - b.date);

    holidayList.innerHTML = '';

    if (monthHolidays.length === 0) {
        holidayList.style.display = 'none';
        return;
    }

    holidayList.style.display = 'block';

    monthHolidays.forEach(holiday => {
        const item = document.createElement('div');
        item.className = 'holiday-item';
        item.textContent = `${holiday.date.getDate()} ${maanden[holiday.date.getMonth()]} – ${holiday.name}`;
        holidayList.appendChild(item);
    });
}

async function searchHistoricalEvents(term) {
    const search = term.trim();
    if (!search) {
        eventSearchMessage.textContent = 'Invoer voldoet niet aan de voorwaarden';
        eventSearchMessage.className = 'description-message error';
        return;
    }

    eventSearchMessage.textContent = 'Zoeken…';
    eventSearchMessage.className = 'description-message';

    const escaped = search.replace(/"/g, '\\"');
    const query = 'SELECT DISTINCT ?item ?itemLabel ?date WHERE { ?item wdt:P585 ?date. FILTER(EXISTS { ?item wdt:P17 wd:Q55. } || EXISTS { ?item wdt:P276/wdt:P17 wd:Q55. }) SERVICE wikibase:label { bd:serviceParam wikibase:language "nl,en". } FILTER(CONTAINS(LCASE(STR(?itemLabel)), LCASE("' + escaped + '"))) } ORDER BY ?date LIMIT 30';

    try {
        const response = await fetch('https://query.wikidata.org/sparql?format=json&query=' + encodeURIComponent(query), {
            headers: { 'Accept': 'application/sparql-results+json' }
        });
        if (!response.ok) throw new Error('Wikidata request failed');

        const data = await response.json();
        const rows = data.results.bindings || [];
        historicalEvents.hidden = false;
        historicalEvents.innerHTML = '<h3>Gevonden gebeurtenissen</h3>';

        if (!rows.length) {
            historicalEvents.innerHTML += '<div class="events-status">Geen gebeurtenissen gevonden</div>';
            eventSearchMessage.textContent = 'Niets gevonden';
            eventSearchMessage.className = 'description-message error';
            return;
        }

        const list = document.createElement('ul');
        rows.forEach(row => {
            const li = document.createElement('li');
            const link = document.createElement('a');
            link.href = row.item.value;
            link.target = '_blank';
            link.rel = 'noopener';
            link.textContent = row.itemLabel?.value || 'Gebeurtenis';
            li.appendChild(link);
            if (row.date?.value) {
                const date = row.date.value.slice(0, 10).split('-').reverse().join('-');
                li.appendChild(document.createTextNode(' – ' + date));
            }
            list.appendChild(li);
        });
        historicalEvents.appendChild(list);
        eventSearchMessage.textContent = 'Gevonden';
        eventSearchMessage.className = 'description-message success';
    } catch (error) {
        historicalEvents.hidden = false;
        historicalEvents.innerHTML = '<h3>Gevonden gebeurtenissen</h3><div class="events-status">Bron tijdelijk niet beschikbaar</div>';
        eventSearchMessage.textContent = 'Bron tijdelijk niet beschikbaar';
        eventSearchMessage.className = 'description-message error';
    }
}

async function loadHistoricalEvents(date) {
    historicalEvents.hidden = false;
    historicalEvents.innerHTML = '<div class="events-status">Historische gebeurtenissen laden…</div>';

    const dateString = date.getFullYear() + '-' + pad(date.getMonth() + 1) + '-' + pad(date.getDate()) + 'T00:00:00Z';
    const query = 'SELECT DISTINCT ?item ?itemLabel ?description WHERE { ?item wdt:P585 "' + dateString + '"^^xsd:dateTime. { ?item wdt:P17 wd:Q55. } UNION { ?item wdt:P276/wdt:P17 wd:Q55. } UNION { ?item wdt:P19/wdt:P17 wd:Q55. } OPTIONAL { ?item schema:description ?description. FILTER(LANG(?description) = "nl") } SERVICE wikibase:label { bd:serviceParam wikibase:language "nl,en". } } LIMIT 12';

    try {
        const response = await fetch('https://query.wikidata.org/sparql?format=json&query=' + encodeURIComponent(query), { headers: { 'Accept': 'application/sparql-results+json' } });
        if (!response.ok) throw new Error('Wikidata request failed');
        const data = await response.json();
        const rows = data.results.bindings || [];
        historicalEvents.innerHTML = '<h3>Historische gebeurtenissen</h3>';
        if (!rows.length) { historicalEvents.innerHTML += '<div class="events-status">Geen gebeurtenissen gevonden</div>'; return; }
        const list = document.createElement('ul');
        rows.forEach(row => {
            const li = document.createElement('li');
            const link = document.createElement('a');
            link.href = row.item.value; link.target = '_blank'; link.rel = 'noopener';
            link.textContent = row.itemLabel?.value || 'Gebeurtenis';
            li.appendChild(link);
            if (row.description?.value) li.appendChild(document.createTextNode(' – ' + row.description.value));
            list.appendChild(li);
        });
        historicalEvents.appendChild(list);
    } catch (error) {
        historicalEvents.innerHTML = '<h3>Historische gebeurtenissen</h3><div class="events-status">Bron tijdelijk niet beschikbaar</div>';
    }
}
function renderCalendar() {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();

    calendarMonth.textContent = `${maanden[month]} ${year}`;

    if (selectedWeek) {
        calendarWeekInfo.textContent = `week ${selectedWeek.week} · ${selectedWeek.year}`;
    } else if (selectedDate) {
        calendarWeekInfo.textContent = `week ${getISOWeek(selectedDate)} · ${getISOWeekYear(selectedDate)}`;
    } else {
        calendarWeekInfo.textContent = '';
    }

    calendar.innerHTML = '';
    renderHolidayList(year, month);

    const monthKey = `${year}-${pad(month + 1)}`;
    if (historicalEventsMonthKey !== monthKey) {
        loadHistoricalEventMarkers(year, month);
    }

    const firstDay = new Date(year, month, 1);
    const startOffset = (firstDay.getDay() + 6) % 7;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const previousDays = new Date(year, month, 0).getDate();

    for (let i = 0; i < 42; i++) {
        const dayNumber = i - startOffset + 1;
        let cellDate;
        let otherMonth = false;

        if (dayNumber < 1) {
            cellDate = new Date(year, month - 1, previousDays + dayNumber);
            otherMonth = true;
        } else if (dayNumber > daysInMonth) {
            cellDate = new Date(year, month + 1, dayNumber - daysInMonth);
            otherMonth = true;
        } else {
            cellDate = new Date(year, month, dayNumber);
        }

        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'calendar-day';
        button.textContent = cellDate.getDate();

        if (otherMonth) button.classList.add('other-month');

        const today = new Date();
        if (toDateKey(cellDate) === toDateKey(today)) {
            button.classList.add('today');
        }

        let highlight = false;
        let weekHighlight = false;

        if (selectedDate) {
            highlight = toDateKey(cellDate) === toDateKey(selectedDate);
        }

        if (selectedDates.length) {
            highlight = selectedDates.some(date => toDateKey(cellDate) === toDateKey(date));
        }

        if (selectedWeek) {
            weekHighlight =
                getISOWeek(cellDate) === selectedWeek.week &&
                getISOWeekYear(cellDate) === selectedWeek.year;
            highlight = weekHighlight;
        }

        const holidayName = getDutchHolidays(cellDate.getFullYear()).get(toDateKey(cellDate));
        const hasHistoricalEvent = historicalEventDates.has(toDateKey(cellDate));
        if (holidayName) {
            button.classList.add('holiday');
            button.title = holidayName;
        }

        if (hasHistoricalEvent) {
            button.classList.add('historical-event');
            if (holidayName) {
                button.title = holidayName + ' · historische gebeurtenis beschikbaar';
            } else {
                button.title = 'Historische gebeurtenis beschikbaar';
            }
            const marker = document.createElement('span');
            marker.className = 'historical-event-dot';
            marker.setAttribute('aria-hidden', 'true');
            button.appendChild(marker);
        }

        if (highlight) {
            button.classList.add('highlight');
            if (weekHighlight) button.classList.add('week-highlight');
        }

        button.addEventListener('click', () => {
            setDateInputs(cellDate);
            clearWeekInputs();
            selectedDate = new Date(cellDate);
            selectedDates = [];
            selectedWeek = null;
            viewDate = new Date(cellDate.getFullYear(), cellDate.getMonth(), 1);
            renderCalendar();
            loadHistoricalEvents(cellDate);
        });

        calendar.appendChild(button);
    }
}

dayInput.addEventListener('focus', () => clearOtherRows('date'));
monthInput.addEventListener('focus', () => clearOtherRows('date'));
yearInput.addEventListener('focus', () => clearOtherRows('date'));

dayInput.addEventListener('input', updateFromDate);
monthInput.addEventListener('change', updateFromDate);
yearInput.addEventListener('input', updateFromDate);

weekInput.addEventListener('focus', () => clearOtherRows('week'));
weekYearInput.addEventListener('focus', () => clearOtherRows('week'));

weekInput.addEventListener('input', updateFromWeek);
weekYearInput.addEventListener('input', updateFromWeek);

descriptionInput.addEventListener('focus', () => clearOtherRows('description'));

eventSearchInput.addEventListener('focus', () => clearOtherRows('event'));
eventSearchButton.addEventListener('click', () => searchHistoricalEvents(eventSearchInput.value));
eventSearchInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') searchHistoricalEvents(eventSearchInput.value);
});

searchDescription.addEventListener('click', () => {
    const value = descriptionInput.value.trim();

    if (!value) {
        showDescriptionMessage('Invoer voldoet niet aan de voorwaarden', 'error');
        return;
    }

    if (parseDescription(value)) {
        showDescriptionMessage('Gevonden', 'success');
    } else if (/\d{4}/.test(value) || /\d{1,2}[\-\/\.]\d{1,2}[\-\/\.]\d{4}/.test(value)) {
        clearCalendarSelection();
        showDescriptionMessage('Niets gevonden', 'error');
    } else {
        showDescriptionMessage('Invoer voldoet niet aan de voorwaarden', 'error');
    }
});

prevMonth.addEventListener('click', () => {
    clearHistoricalEventsDisplay();
    viewDate = new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1);
    renderCalendar();
});

nextMonth.addEventListener('click', () => {
    clearHistoricalEventsDisplay();
    viewDate = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1);
    renderCalendar();
});

populateMonths();

const today = new Date();
setDateInputs(today);
selectedDate = new Date(today);
viewDate = new Date(today.getFullYear(), today.getMonth(), 1);

renderCalendar();

const infoButton = document.getElementById('infoButton');
const infoPanel = document.getElementById('infoPanel');
const infoClose = document.getElementById('infoClose');

function setInfoOpen(open) {
    infoPanel.hidden = !open;
    document.body.classList.toggle('info-open', open);
}

infoButton.addEventListener('click', () => {
    setInfoOpen(infoPanel.hidden);
});

infoClose.addEventListener('click', () => {
    setInfoOpen(false);
});
