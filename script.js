const dayInput = document.getElementById('dayInput');
const monthInput = document.getElementById('monthInput');
const yearInput = document.getElementById('yearInput');
const weekInput = document.getElementById('weekInput');
const weekYearInput = document.getElementById('weekYearInput');
const descriptionInput = document.getElementById('descriptionInput');
const searchDescription = document.getElementById('searchDescription');
const descriptionMessage = document.getElementById('descriptionMessage');

const calendar = document.getElementById('calendar');
const calendarMonth = document.getElementById('calendarMonth');
const calendarWeekInfo = document.getElementById('calendarWeekInfo');
const prevMonth = document.getElementById('prevMonth');
const nextMonth = document.getElementById('nextMonth');
const holidayList = document.getElementById('holidayList');
const sourceOudOmmen = document.getElementById('sourceOudOmmen');
const historicalEvents = document.getElementById('historicalEvents');
const oudOmmenCount = document.getElementById('oudOmmenCount');
let oudOmmenTotalCount = 0;
let oudOmmenMonthCount = 0;

let oudOmmenEventDates = new Set();
let oudOmmenEventDetails = new Map();
let historicalEventsMonthKey = '';

const maanden = [
    'januari','februari','maart','april','mei','juni',
    'juli','augustus','september','oktober','november','december'
];

let viewDate = new Date();
let selectedDate = null;
let selectedDates = [];
let selectedWeek = null;

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

    selectedDate = null;
    selectedDates = [];
    selectedWeek = null;
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

async function fetchOudOmmenJson(url) {
    const proxy = 'https://ommen-push-v2.leeuw008.workers.dev/proxy?url=' + encodeURIComponent(url) + '&t=' + Date.now();
    try {
        const response = await fetch(proxy, { cache: 'no-store' });
        if (!response.ok) throw new Error('HTTP ' + response.status);
        const data = await response.json();
        return Array.isArray(data) ? data : [];
    } catch (error) {
        return [];
    }
}

async function fetchOudOmmenTotal() {
    const url = 'https://weblog.oudommen.nl/wp-json/wp/v2/posts?per_page=1&_fields=id';
    const proxy = 'https://ommen-push-v2.leeuw008.workers.dev/proxy?url=' + encodeURIComponent(url) + '&t=' + Date.now();
    try {
        const response = await fetch(proxy, { cache: 'no-store' });
        const total = Number(response.headers.get('X-WP-Total') || 0);
        if (total > 0) oudOmmenTotalCount = total;
    } catch (error) {}
    updateOudOmmenCount();
}

function updateOudOmmenCount() {
    if (!oudOmmenCount) return;
    if (oudOmmenTotalCount > 0) {
        oudOmmenCount.textContent = 'OudOmmen.nl (' + oudOmmenMonthCount + ' van ' + oudOmmenTotalCount + ' artikelen)';
    } else {
        oudOmmenCount.textContent = 'OudOmmen.nl';
    }
}

async function fetchOudOmmenFeed() {
    const feedUrl = 'https://weblog.oudommen.nl/feed/';
    const proxy = 'https://ommen-push-v2.leeuw008.workers.dev/proxy?url=' + encodeURIComponent(feedUrl) + '&t=' + Date.now();
    try {
        const response = await fetch(proxy, { cache: 'no-store' });
        if (!response.ok) throw new Error('HTTP ' + response.status);
        const xml = await response.text();
        const doc = new DOMParser().parseFromString(xml, 'application/xml');
        return Array.from(doc.querySelectorAll('item')).map(item => ({
            date: item.querySelector('pubDate')?.textContent || '',
            link: item.querySelector('link')?.textContent || '',
            title: item.querySelector('title')?.textContent || 'OudOmmen-artikel'
        }));
    } catch (error) {
        return [];
    }
}

async function fetchOudOmmenDateArchive(year, month) {
    // WordPress heeft naast de REST-API ook datumarchieven.
    // Dit is de historische fallback voor oude maanden, zoals april 2006.
    const archiveUrl = 'https://weblog.oudommen.nl/' + year + '/' + pad(month + 1) + '/';
    const proxy = 'https://ommen-push-v2.leeuw008.workers.dev/proxy?url=' + encodeURIComponent(archiveUrl) + '&t=' + Date.now();

    try {
        const response = await fetch(proxy, { cache: 'no-store' });
        if (!response.ok) throw new Error('HTTP ' + response.status);

        const html = await response.text();
        const doc = new DOMParser().parseFromString(html, 'text/html');
        const posts = [];

        doc.querySelectorAll('article').forEach(article => {
            const time = article.querySelector('time');
            const link = article.querySelector('h1 a, h2 a, h3 a, h4 a');
            if (!time || !link) return;

            const date = time.getAttribute('datetime') || time.textContent || '';
            const title = link.textContent.trim();
            const href = link.href;
            const parsed = new Date(date);

            if (!isNaN(parsed.getTime()) &&
                parsed.getFullYear() === year &&
                parsed.getMonth() === month &&
                href && title) {
                posts.push({ date, link: href, title });
            }
        });

        // Sommige oudere WordPress-thema's gebruiken geen <article>-element.
        // Zoek daarom ook naar datum-links/titels in de hoofdinhoud.
        if (!posts.length) {
            const datePattern = new RegExp(
                '(?:januari|februari|maart|april|mei|juni|juli|augustus|september|oktober|november|december)\\s+\\d{1,2},?\\s+' + year,
                'i'
            );

            doc.querySelectorAll('a').forEach(link => {
                const href = link.href;
                const title = link.textContent.trim();
                if (!href || !title || title.length < 2 || title.length > 180) return;

                const block = link.closest('div, li, section, header, main');
                const text = block ? block.textContent : '';
                if (!datePattern.test(text)) return;

                const match = text.match(datePattern);
                if (!match) return;

                const parsed = new Date(match[0]);
                if (!isNaN(parsed.getTime()) &&
                    parsed.getFullYear() === year &&
                    parsed.getMonth() === month &&
                    !posts.some(post => post.link === href)) {
                    posts.push({ date: parsed.toISOString(), link: href, title });
                }
            });
        }

        return posts;
    } catch (error) {
        return [];
    }
}

function addOudOmmenPost(post) {
    const date = new Date(post.date);
    if (isNaN(date.getTime())) return;
    const key = toDateKey(date);
    oudOmmenEventDates.add(key);
    const title = post.title && post.title.rendered ? post.title.rendered : (post.title || 'OudOmmen-artikel');
    const cleanTitle = String(title)
        .replace(/<[^>]*>/g, '')
        .replace(/&amp;/g, '&')
        .replace(/&#8217;/g, '’')
        .replace(/&#8216;/g, '‘')
        .replace(/&#038;/g, '&');
    if (!oudOmmenEventDetails.has(key)) oudOmmenEventDetails.set(key, []);
    oudOmmenEventDetails.get(key).push({ title: cleanTitle, link: post.link, date: post.date });
}

async function loadOudOmmenEventMarkers(year, month) {
    const monthKey = year + '-' + pad(month + 1);
    if (historicalEventsMonthKey === monthKey) return;
    historicalEventsMonthKey = monthKey;
    oudOmmenEventDates = new Set();
    oudOmmenEventDetails = new Map();
    historicalEvents.hidden = true;

    if (!sourceOudOmmen.checked) {
        renderCalendar();
        return;
    }

    const start = new Date(year, month, 1);
    const end = new Date(year, month + 1, 1);
    const after = start.toISOString();
    const before = end.toISOString();
    const url = 'https://weblog.oudommen.nl/wp-json/wp/v2/posts?after=' + encodeURIComponent(after) +
        '&before=' + encodeURIComponent(before) +
        '&per_page=100&orderby=date&order=asc&status=publish&_fields=date,link,title';

    let posts = await fetchOudOmmenJson(url);

    // Als de REST-API geen berichten teruggeeft, probeer eerst het datumarchief.
    // Dit is juist bedoeld voor historische maanden zoals april 2006.
    if (!posts.length) {
        posts = await fetchOudOmmenDateArchive(year, month);
    }

    // RSS blijft als laatste fallback beschikbaar voor recente artikelen.
    if (!posts.length) {
        const feedPosts = await fetchOudOmmenFeed();
        posts = feedPosts.filter(post => {
            const date = new Date(post.date);
            return !isNaN(date.getTime()) &&
                date.getFullYear() === year &&
                date.getMonth() === month;
        });
    }

    posts.forEach(addOudOmmenPost);
    oudOmmenMonthCount = posts.length;
    updateOudOmmenCount();
    renderCalendar();
}

function renderOudOmmenDetails(key) {
    const rows = oudOmmenEventDetails.get(key) || [];
    historicalEvents.hidden = false;
    historicalEvents.innerHTML = '<h3>OudOmmen.nl</h3>';
    if (!rows.length) {
        historicalEvents.innerHTML += '<div class="events-status">Geen artikelen gevonden</div>';
        return;
    }
    const list = document.createElement('ul');
    rows.slice(0, 24).forEach(row => {
        const li = document.createElement('li');
        const link = document.createElement('a');
        link.href = row.link;
        link.target = '_blank';
        link.rel = 'noopener';
        link.textContent = row.title;
        li.appendChild(link);
        list.appendChild(li);
    });
    historicalEvents.appendChild(list);
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
        const oudOmmenEvent = oudOmmenEventDates.has(toDateKey(cellDate));
        if (oudOmmenEvent) {
            button.classList.add('oudommen-event');
            button.title = holidayName ? holidayName + ' · OudOmmen.nl' : 'OudOmmen.nl';
            const marker = document.createElement('span');
            marker.className = 'oudommen-event-marker';
            const logo = document.createElement('img');
            logo.src = 'data:image/png;base64,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';
            logo.alt = 'OudOmmen.nl';
            logo.loading = 'lazy';
            marker.appendChild(logo);
            button.appendChild(marker);
        }
        if (holidayName) {
            button.classList.add('holiday');
            button.title = holidayName;
        }

        if (highlight) {
            button.classList.add('highlight');
            if (weekHighlight) button.classList.add('week-highlight');
        }

        button.addEventListener('click', () => {
            historicalEvents.hidden = true;
            historicalEvents.innerHTML = '';
            if (oudOmmenEventDates.has(toDateKey(cellDate))) renderOudOmmenDetails(toDateKey(cellDate));
            setDateInputs(cellDate);
            clearWeekInputs();
            selectedDate = new Date(cellDate);
            selectedDates = [];
            selectedWeek = null;
            viewDate = new Date(cellDate.getFullYear(), cellDate.getMonth(), 1);
            renderCalendar();
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

prevMonth.addEventListener('click', async () => {
    historicalEventsMonthKey = '';
    historicalEvents.hidden = true;
    viewDate = new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1);
    renderCalendar();
    await loadOudOmmenEventMarkers(viewDate.getFullYear(), viewDate.getMonth());
});

nextMonth.addEventListener('click', async () => {
    historicalEventsMonthKey = '';
    historicalEvents.hidden = true;
    viewDate = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1);
    renderCalendar();
    await loadOudOmmenEventMarkers(viewDate.getFullYear(), viewDate.getMonth());
});

populateMonths();
fetchOudOmmenTotal();

const today = new Date();
setDateInputs(today);
selectedDate = new Date(today);
viewDate = new Date(today.getFullYear(), today.getMonth(), 1);

renderCalendar();
loadOudOmmenEventMarkers(viewDate.getFullYear(), viewDate.getMonth());

sourceOudOmmen.addEventListener('change', async () => {
    historicalEventsMonthKey = '';
    historicalEvents.hidden = true;
    oudOmmenEventDates = new Set();
    oudOmmenEventDetails = new Map();
    renderCalendar();
    await loadOudOmmenEventMarkers(viewDate.getFullYear(), viewDate.getMonth());
});

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
