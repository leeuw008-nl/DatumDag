const dateDisplay = document.getElementById('dateDisplay');
const dayResult = document.getElementById('dayResult');
const copyBtn = document.getElementById('copyBtn');
const calendarBtn = document.getElementById('calendarBtn');
const datePicker = document.getElementById('datePicker');
const historyContainer = document.getElementById('history');

const daySelect = document.getElementById('daySelect');
const monthSelect = document.getElementById('monthSelect');
const yearSelect = document.getElementById('yearSelect');

let history = JSON.parse(localStorage.getItem('dateHistory')) || [];

// Dagen en maanden
const dagen = ["zondag", "maandag", "dinsdag", "woensdag", "donderdag", "vrijdag", "zaterdag"];
const maanden = ["januari","februari","maart","april","mei","juni","juli","augustus","september","oktober","november","december"];

// Vul selectors
function populateSelectors() {
    daySelect.innerHTML = '';
    for (let i = 1; i <= 31; i++) {
        const opt = document.createElement('option');
        opt.value = i;
        opt.textContent = i;
        daySelect.appendChild(opt);
    }

    monthSelect.innerHTML = '';
    maanden.forEach((maand, index) => {
        const opt = document.createElement('option');
        opt.value = index;
        opt.textContent = maand;
        monthSelect.appendChild(opt);
    });

    yearSelect.innerHTML = '';
    for (let y = 2100; y >= 1000; y--) {
        const opt = document.createElement('option');
        opt.value = y;
        opt.textContent = y;
        yearSelect.appendChild(opt);
    }
}

function getCurrentDate() {
    const year = parseInt(yearSelect.value);
    const month = parseInt(monthSelect.value);
    let day = parseInt(daySelect.value);
    const lastDay = new Date(year, month + 1, 0).getDate();
    if (day > lastDay) day = lastDay;
    return new Date(year, month, day);
}

function updateDisplay() {
    const date = getCurrentDate();
    
    const options = { day: 'numeric', month: 'long', year: 'numeric' };
    dateDisplay.textContent = date.toLocaleDateString('nl-NL', options);
    
    const dayName = dagen[date.getDay()];
    dayResult.textContent = dayName.charAt(0).toUpperCase() + dayName.slice(1);
    
    addToHistory(date);
}

function addToHistory(date) {
    const dateStr = date.toISOString().split('T')[0];
    history = history.filter(item => item.date !== dateStr);
    
    history.unshift({
        date: dateStr,
        display: date.toLocaleDateString('nl-NL', {day:'numeric', month:'long', year:'numeric'}),
        day: dagen[date.getDay()]
    });
    
    if (history.length > 10) history.pop();
    localStorage.setItem('dateHistory', JSON.stringify(history));
    renderHistory();
}

function renderHistory() {
    historyContainer.innerHTML = '';
    
    if (history.length === 0) {
        historyContainer.innerHTML = '<p style="opacity:0.6; font-style:italic;">Nog geen recente data</p>';
        return;
    }

    history.forEach(item => {
        const div = document.createElement('div');
        div.className = 'history-item';
        div.innerHTML = `
            <span>${item.display}</span>
            <strong>${item.day}</strong>
        `;
        div.onclick = () => {
            const d = new Date(item.date);
            daySelect.value = d.getDate();
            monthSelect.value = d.getMonth();
            yearSelect.value = d.getFullYear();
            updateDisplay();
        };
        historyContainer.appendChild(div);
    });
}

// Kalender
function openCalendar() {
    if (datePicker.showPicker) {
        try {
            datePicker.showPicker();
            return true;
        } catch (error) {
            // Sommige browsers staan showPicker alleen toe na een gebruikersactie.
        }
    }
    datePicker.click();
    return true;
}

calendarBtn.addEventListener('click', openCalendar);

datePicker.addEventListener('change', () => {
    if (datePicker.value) {
        const selected = new Date(datePicker.value);
        daySelect.value = selected.getDate();
        monthSelect.value = selected.getMonth();
        yearSelect.value = selected.getFullYear();
        updateDisplay();
    }
});

copyBtn.addEventListener('click', () => {
    const text = `${dateDisplay.textContent} was een ${dayResult.textContent.toLowerCase()}`;
    navigator.clipboard.writeText(text).then(() => {
        const original = copyBtn.textContent;
        copyBtn.textContent = '✅ Gekopieerd!';
        setTimeout(() => copyBtn.textContent = original, 2000);
    });
});

// Event listeners
daySelect.addEventListener('change', updateDisplay);
monthSelect.addEventListener('change', updateDisplay);
yearSelect.addEventListener('change', updateDisplay);

// Start app
populateSelectors();
const today = new Date();
daySelect.value = today.getDate();
monthSelect.value = today.getMonth();
yearSelect.value = today.getFullYear();

updateDisplay();
renderHistory();

// Probeer de kalender direct te openen zodra de app is geladen.
// Browsers die dit blokkeren wegens het ontbreken van een gebruikersactie
// laten de bestaande knop beschikbaar.
setTimeout(() => {
    openCalendar();
}, 250);