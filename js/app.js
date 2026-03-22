// app.js - Main application logic (config-driven)

// Build CONFIG from SITE_CONFIG for backward compatibility
var CONFIG = {
    password: SITE_CONFIG.password,
    people: {},
    neshamaLetters: SITE_CONFIG.neshamaLetters
};
SITE_CONFIG.people.forEach(function(p) {
    CONFIG.people[p.key] = p;
});

// State
var state = {
    currentSection: 'main',
    azkara: loadAzkara(),
    members: loadMembers(),
    selectedLetters: loadSelectedLetters(),
    personOverrides: loadPersonOverrides()
};

// Apply saved overrides to config
function applyPersonOverrides() {
    var overrides = state.personOverrides;
    SITE_CONFIG.people.forEach(function(p) {
        var saved = overrides[p.key];
        if (!saved) return;
        if (saved.name) p.name = saved.name;
        if (saved.fullNameHebrew) p.fullNameHebrew = saved.fullNameHebrew;
        if (saved.birthYear) p.birthYear = saved.birthYear;
        if (saved.deathYear) p.deathYear = saved.deathYear;
        if (saved.deathDateGregorian) p.deathDateGregorian = saved.deathDateGregorian;
        if (saved.deathDateHebrew) p.deathDateHebrew = saved.deathDateHebrew;
        if (saved.fatherName) p.fatherName = saved.fatherName;
        if (saved.cemetery) p.cemetery = saved.cemetery;
        if (saved.cemeteryWazeUrl) p.cemeteryWazeUrl = saved.cemeteryWazeUrl;
        if (saved.descriptor) p.descriptor = saved.descriptor;
        // Update CONFIG too
        CONFIG.people[p.key] = p;
    });
}

// ==================== DYNAMIC PAGE GENERATION ====================

function renderPersonCards() {
    var container = document.getElementById('person-cards');
    container.innerHTML = '';
    SITE_CONFIG.people.forEach(function(p) {
        var lifeYears = '';
        if (p.birthYear || p.deathYear) {
            lifeYears = (p.birthYear || '?') + ' - ' + (p.deathYear || '?');
        }
        var prefix = p.gender === 'male' ? 'נפטר' : 'נפטרה';
        var card = document.createElement('div');
        card.className = 'person-card';
        card.innerHTML =
            '<h2>' + p.name + ' ז"ל</h2>' +
            (lifeYears ? '<p class="life-years">' + lifeYears + '</p>' : '') +
            '<p class="dates">' + prefix + ': ' + p.deathDateHebrew + ' | ' + formatDate(p.deathDateGregorian) + '</p>' +
            '<p class="time-elapsed" id="elapsed-' + p.key + '"></p>' +
            (p.cemetery ? '<p>' + p.cemetery + '</p>' : '');
        container.appendChild(card);
    });
}

function renderActionButtons() {
    var container = document.getElementById('action-buttons');
    var btns = '<a href="azkara.ics" class="action-chip">יומן</a>';
    btns += '<button class="action-chip whatsapp-chip" onclick="shareWhatsApp()">וואטסאפ</button>';

    // Waze button only if URL exists
    var wazeUrl = '';
    SITE_CONFIG.people.forEach(function(p) {
        if (p.cemeteryWazeUrl) wazeUrl = p.cemeteryWazeUrl;
    });
    if (wazeUrl) {
        btns += '<a href="' + wazeUrl + '" target="_blank" class="action-chip waze-chip">Waze</a>';
    }

    container.innerHTML = btns;
}

function renderAdvancedChecklist() {
    var container = document.getElementById('adv-seder-checklist');
    var html = '<label><input type="checkbox" value="candle" checked> הדלקת נר נשמה</label>';

    SITE_CONFIG.people.forEach(function(p) {
        html += '<label><input type="checkbox" value="tehillim_' + p.key + '" checked> תהילים - ' + p.name + ' (אותיות שנבחרו)</label>';
    });

    html += '<label><input type="checkbox" value="psalm91" checked> תהילים צ"א (יושב בסתר)</label>';
    html += '<label><input type="checkbox" value="psalm121" checked> תהילים קכ"א (שיר למעלות)</label>';

    SITE_CONFIG.people.forEach(function(p) {
        var label = p.gender === 'male' ? 'השכבה - ' + p.name : 'השכבה - ' + p.name;
        html += '<label><input type="checkbox" value="hashkava_' + p.key + '" checked> ' + label + '</label>';
    });

    html += '<label><input type="checkbox" value="kaddish" checked> קדיש יתום</label>';
    container.innerHTML = html;
}

// ==================== PERSON DETAILS EDITOR ====================

function renderPersonDetailsEditor() {
    var container = document.getElementById('person-details-editor');
    if (!container) return;
    var html = '';

    SITE_CONFIG.people.forEach(function(p) {
        html += '<h4>' + p.name + '</h4>';
        html += '<div class="form-group"><label>שם מלא:</label><input type="text" id="edit-name-' + p.key + '" value="' + (p.name || '') + '"></div>';
        html += '<div class="form-group"><label>שנת לידה:</label><input type="text" id="edit-birth-' + p.key + '" value="' + (p.birthYear || '') + '"></div>';
        html += '<div class="form-group"><label>תאריך פטירה לועזי (YYYY-MM-DD):</label><input type="date" id="edit-death-' + p.key + '" value="' + (p.deathDateGregorian || '') + '"></div>';
        html += '<div class="form-group"><label>תאריך פטירה עברי:</label><input type="text" id="edit-death-heb-' + p.key + '" value="' + (p.deathDateHebrew || '') + '"></div>';
        html += '<div class="form-group"><label>שם האב (להשכבה):</label><input type="text" id="edit-father-' + p.key + '" value="' + (p.fatherName || '') + '"></div>';
        html += '<div class="form-group"><label>בית עלמין:</label><input type="text" id="edit-cemetery-' + p.key + '" value="' + (p.cemetery || '') + '"></div>';
        html += '<div class="form-group"><label>קישור Waze:</label><input type="text" id="edit-waze-' + p.key + '" value="' + (p.cemeteryWazeUrl || '') + '" dir="ltr"></div>';
        html += '<div class="form-group"><label>תואר (בעלי, אבינו...):</label><input type="text" id="edit-desc-' + p.key + '" value="' + (p.descriptor || '') + '"></div>';
    });

    container.innerHTML = html;
}

function savePersonDetails() {
    var overrides = {};

    SITE_CONFIG.people.forEach(function(p) {
        overrides[p.key] = {
            name: document.getElementById('edit-name-' + p.key).value.trim(),
            fullNameHebrew: document.getElementById('edit-name-' + p.key).value.trim(),
            birthYear: document.getElementById('edit-birth-' + p.key).value.trim(),
            deathDateGregorian: document.getElementById('edit-death-' + p.key).value.trim(),
            deathDateHebrew: document.getElementById('edit-death-heb-' + p.key).value.trim(),
            fatherName: document.getElementById('edit-father-' + p.key).value.trim(),
            cemetery: document.getElementById('edit-cemetery-' + p.key).value.trim(),
            cemeteryWazeUrl: document.getElementById('edit-waze-' + p.key).value.trim(),
            descriptor: document.getElementById('edit-desc-' + p.key).value.trim()
        };
        // Derive deathYear
        var dg = overrides[p.key].deathDateGregorian;
        if (dg) overrides[p.key].deathYear = dg.split('-')[0];
    });

    localStorage.setItem('personOverrides', JSON.stringify(overrides));
    state.personOverrides = overrides;
    applyPersonOverrides();

    // Re-render page
    renderPersonCards();
    updateElapsedTimes();
    renderActionButtons();
    document.getElementById('page-title').textContent = SITE_CONFIG.siteTitle;

    saveAllToCloud();

    var msg = document.getElementById('save-person-success');
    msg.classList.remove('hidden');
    setTimeout(function() { msg.classList.add('hidden'); }, 2000);
}

// ==================== TIME ELAPSED ====================

function calcElapsed(deathDateStr) {
    if (!deathDateStr) return '';
    var death = new Date(deathDateStr + 'T00:00:00');
    var now = new Date();
    var years = now.getFullYear() - death.getFullYear();
    var months = now.getMonth() - death.getMonth();
    var days = now.getDate() - death.getDate();
    if (days < 0) {
        months--;
        var prevMonth = new Date(now.getFullYear(), now.getMonth(), 0);
        days += prevMonth.getDate();
    }
    if (months < 0) {
        years--;
        months += 12;
    }
    var parts = [];
    if (years > 0) parts.push(years + ' ' + (years === 1 ? 'שנה' : 'שנים'));
    if (months > 0) parts.push(months + ' ' + (months === 1 ? 'חודש' : 'חודשים'));
    if (days > 0) parts.push(days + ' ' + (days === 1 ? 'יום' : 'ימים'));
    return parts.join(', ');
}

function updateElapsedTimes() {
    SITE_CONFIG.people.forEach(function(p) {
        var el = document.getElementById('elapsed-' + p.key);
        if (el) el.textContent = calcElapsed(p.deathDateGregorian);
    });
}

// ==================== AZKARA DISPLAY ====================

function getPersonTitle(forPerson) {
    if (forPerson === 'both' && SITE_CONFIG.people.length >= 2) {
        return SITE_CONFIG.people.map(function(p) { return p.name + ' ז"ל'; }).join(' ו');
    }
    var found = null;
    SITE_CONFIG.people.forEach(function(p) {
        if (p.key === forPerson) found = p;
    });
    if (found) return found.name + ' ז"ל';
    return SITE_CONFIG.people[0].name + ' ז"ל';
}

function formatAzkaraDate(azkara) {
    var dateObj = new Date(azkara.date + 'T00:00:00');
    var days = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
    var dayName = days[dateObj.getDay()];
    var dateParts = azkara.date.split('-');
    return 'יום ' + dayName + ', ' + dateParts[2] + '/' + dateParts[1] + '/' + dateParts[0];
}

function updateMemorialAzkara() {
    var azkara = state.azkara;
    var container = document.getElementById('memorial-azkara');
    if (!azkara.date) { container.innerHTML = ''; return; }

    var dateObj = new Date(azkara.date + 'T00:00:00');
    var now = new Date();
    now.setHours(0, 0, 0, 0);
    var diffDays = Math.ceil((dateObj.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) { container.innerHTML = ''; return; }

    var countdownText = '';
    if (diffDays === 0) countdownText = 'היום!';
    else if (diffDays === 1) countdownText = 'מחר!';
    else countdownText = 'בעוד ' + diffDays + ' ימים';

    var yearsText = azkara.yearLabel;

    container.innerHTML =
        '<div class="azkara-banner">' +
            '<h3>אזכרה - ' + yearsText + '</h3>' +
            '<p><strong>' + getPersonTitle(azkara.forPerson) + '</strong></p>' +
            '<p>' + formatAzkaraDate(azkara) + ' בשעה ' + azkara.time + '</p>' +
            (azkara.location ? '<p>' + azkara.location + '</p>' : '') +
            '<p class="countdown">' + countdownText + '</p>' +
        '</div>';
}

// ==================== DARK MODE ====================

function initDarkMode() {
    var toggle = document.getElementById('dark-mode-toggle');
    if (localStorage.getItem('darkMode') === 'true') {
        document.body.classList.add('dark-mode');
        toggle.textContent = '☀️';
    }
    toggle.addEventListener('click', function(e) {
        e.preventDefault();
        document.body.classList.toggle('dark-mode');
        var isDark = document.body.classList.contains('dark-mode');
        localStorage.setItem('darkMode', isDark);
        toggle.textContent = isDark ? '☀️' : '🌙';
    });
}

// ==================== WHATSAPP SHARE ====================

function shareWhatsApp() {
    var azkara = state.azkara;
    var title = getPersonTitle(azkara.forPerson);
    var dateParts = azkara.date.split('-');
    var formattedDate = dateParts[2] + '/' + dateParts[1] + '/' + dateParts[0];

    var text = 'אזכרה ' + azkara.yearLabel + '\n' +
        title + '\n' +
        formattedDate + ' בשעה ' + azkara.time + '\n' +
        (azkara.location ? azkara.location + '\n' : '') + '\n' +
        'לפרטים והורדת סדר האזכרה:\n' +
        window.location.href;

    window.location.href = 'https://wa.me/?text=' + encodeURIComponent(text);
}

// ==================== MANAGE PASSWORD ====================

function initManageLock() {
    var btn = document.getElementById('manage-unlock-btn');
    var input = document.getElementById('manage-password');
    var error = document.getElementById('manage-error');

    if (sessionStorage.getItem('manageUnlocked') === 'true') {
        unlockManage();
        return;
    }

    btn.addEventListener('click', tryUnlock);
    input.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') tryUnlock();
    });

    function tryUnlock() {
        if (input.value === SITE_CONFIG.password) {
            sessionStorage.setItem('manageUnlocked', 'true');
            unlockManage();
        } else {
            error.classList.remove('hidden');
            input.value = '';
        }
    }
}

function unlockManage() {
    document.getElementById('manage-lock').classList.add('hidden');
    document.getElementById('manage-content').classList.remove('hidden');
}

// ==================== NAVIGATION ====================

function initNav() {
    document.querySelectorAll('.nav-link').forEach(function(link) {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            switchSection(link.dataset.section);
        });
    });
}

function switchSection(sectionId) {
    state.currentSection = sectionId;
    document.querySelectorAll('.section').forEach(function(s) { s.classList.add('hidden'); });
    document.querySelectorAll('.nav-link').forEach(function(l) { l.classList.remove('active'); });
    document.getElementById(sectionId).classList.remove('hidden');
    document.querySelector('[data-section="' + sectionId + '"]').classList.add('active');
}

// ==================== LETTERS (Manage tab - advanced) ====================

function initLetters() {
    var container = document.getElementById('letters-sections');
    if (!container) return;
    container.innerHTML = '';

    SITE_CONFIG.people.forEach(function(p) {
        var section = document.createElement('div');
        section.className = 'letters-section';
        section.innerHTML =
            '<h4>' + p.name + ' ז"ל - בחירת אותיות</h4>' +
            '<div class="quick-select-btns">' +
                '<button type="button" class="quick-btn" onclick="quickSelect(\'' + p.key + '\', \'all\')">הכל</button>' +
                '<button type="button" class="quick-btn" onclick="quickSelect(\'' + p.key + '\', \'first\')">' + (p.fullNameHebrew.split(' ')[0] || 'שם') + '</button>' +
                '<button type="button" class="quick-btn" onclick="quickSelect(\'' + p.key + '\', \'last\')">' + (p.fullNameHebrew.split(' ').slice(-1)[0] || 'משפחה') + '</button>' +
                '<button type="button" class="quick-btn" onclick="quickSelect(\'' + p.key + '\', \'neshama\')">+ נשמה</button>' +
                '<button type="button" class="quick-btn" onclick="quickSelect(\'' + p.key + '\', \'none\')">נקה</button>' +
            '</div>' +
            '<div class="letters-grid" id="letters-' + p.key + '"></div>';
        container.appendChild(section);
        renderLetterCheckboxes('letters-' + p.key, p, p.key);
    });
}

function renderLetterCheckboxes(containerId, person, personKey) {
    var container = document.getElementById(containerId);
    container.innerHTML = '';

    person.lettersForTehillim.forEach(function(letter, index) {
        var key = personKey + '_' + index;
        var isSelected = state.selectedLetters[key] !== false;

        var box = document.createElement('div');
        box.className = 'letter-box' + (isSelected ? ' selected' : '');
        box.dataset.key = key;
        box.innerHTML = '<span class="letter">' + letter + '</span><span class="letter-check">' + (isSelected ? '✓' : '') + '</span>';
        box.addEventListener('click', function() { toggleLetter(key, box); });
        container.appendChild(box);
    });

    // Neshama letters
    var neshamaLabel = document.createElement('div');
    neshamaLabel.className = 'neshama-separator';
    neshamaLabel.textContent = 'אותיות נשמה:';
    container.appendChild(neshamaLabel);

    CONFIG.neshamaLetters.forEach(function(letter, index) {
        var key = personKey + '_neshama_' + index;
        var isSelected = state.selectedLetters[key] === true;

        var box = document.createElement('div');
        box.className = 'letter-box neshama-letter' + (isSelected ? ' selected' : '');
        box.dataset.key = key;
        box.innerHTML = '<span class="letter">' + letter + '</span><span class="letter-check">' + (isSelected ? '✓' : '') + '</span>';
        box.addEventListener('click', function() { toggleLetter(key, box); });
        container.appendChild(box);
    });
}

function toggleLetter(key, boxElement) {
    var isNeshama = key.indexOf('_neshama_') !== -1;
    var currentlySelected = isNeshama ? state.selectedLetters[key] === true : state.selectedLetters[key] !== false;
    state.selectedLetters[key] = !currentlySelected;
    saveSelectedLetters();

    if (!currentlySelected) {
        boxElement.classList.add('selected');
        boxElement.querySelector('.letter-check').textContent = '✓';
    } else {
        boxElement.classList.remove('selected');
        boxElement.querySelector('.letter-check').textContent = '';
    }
}

function quickSelect(personKey, group) {
    var person = CONFIG.people[personKey];

    if (group === 'none') {
        person.lettersForTehillim.forEach(function(_, i) { state.selectedLetters[personKey + '_' + i] = false; });
        CONFIG.neshamaLetters.forEach(function(_, i) { state.selectedLetters[personKey + '_neshama_' + i] = false; });
    } else if (group === 'neshama') {
        CONFIG.neshamaLetters.forEach(function(_, i) { state.selectedLetters[personKey + '_neshama_' + i] = true; });
    } else {
        person.lettersForTehillim.forEach(function(_, i) { state.selectedLetters[personKey + '_' + i] = false; });
        CONFIG.neshamaLetters.forEach(function(_, i) { state.selectedLetters[personKey + '_neshama_' + i] = false; });
        var indices = person.nameGroups[group] || [];
        indices.forEach(function(i) { state.selectedLetters[personKey + '_' + i] = true; });
    }

    saveSelectedLetters();
    renderLetterCheckboxes('letters-' + personKey, person, personKey);
}

// ==================== AZKARA ADMIN ====================

function initAzkaraAdmin() {
    document.getElementById('save-azkara-btn').addEventListener('click', saveAzkaraFromForm);

    var azkara = state.azkara;
    if (azkara.date) document.getElementById('azkara-date').value = azkara.date;
    if (azkara.time) document.getElementById('azkara-time').value = azkara.time;
    if (azkara.location) document.getElementById('azkara-location').value = azkara.location;
    if (azkara.yearLabel) document.getElementById('azkara-year-label').value = azkara.yearLabel;
}

function saveAzkaraFromForm() {
    state.azkara = {
        forPerson: SITE_CONFIG.people[0].key,
        date: document.getElementById('azkara-date').value,
        time: document.getElementById('azkara-time').value,
        location: document.getElementById('azkara-location').value,
        yearLabel: document.getElementById('azkara-year-label').value
    };
    localStorage.setItem('azkara', JSON.stringify(state.azkara));
    updateMemorialAzkara();
    saveAllToCloud();

    var msg = document.getElementById('save-success');
    msg.classList.remove('hidden');
    setTimeout(function() { msg.classList.add('hidden'); }, 2000);
}

// ==================== MEMBERS ====================

function initMembers() {
    document.getElementById('add-member-btn').addEventListener('click', addMember);
    renderMembers();
}

function addMember() {
    var name = document.getElementById('member-name').value.trim();
    var email = document.getElementById('member-email').value.trim();
    var phone = document.getElementById('member-phone').value.trim();
    if (!name) { alert('נא להזין שם'); return; }

    state.members.push({ name: name, email: email, phone: phone, id: Date.now() });
    localStorage.setItem('members', JSON.stringify(state.members));
    document.getElementById('member-name').value = '';
    document.getElementById('member-email').value = '';
    document.getElementById('member-phone').value = '';
    renderMembers();
    saveAllToCloud();
}

function removeMember(id) {
    state.members = state.members.filter(function(m) { return m.id !== id; });
    localStorage.setItem('members', JSON.stringify(state.members));
    renderMembers();
    saveAllToCloud();
}

function renderMembers() {
    var ul = document.getElementById('members-ul');
    if (state.members.length === 0) {
        ul.innerHTML = '<li>אין משתתפים רשומים</li>';
        return;
    }
    ul.innerHTML = '';
    state.members.forEach(function(member) {
        var li = document.createElement('li');
        li.innerHTML =
            '<span>' + member.name + (member.email ? ' (' + member.email + ')' : '') + (member.phone ? ' | ' + member.phone : '') + '</span>' +
            '<button onclick="removeMember(' + member.id + ')">הסר</button>';
        ul.appendChild(li);
    });
}

// ==================== FAMILY TREE EDITOR ====================

// Structured data per node stored in _ed (editor data)
// _ed: { firstName, spouseName, lastName, birthDate, spouseBirthDate, weddingDate }

// Auto-format date inputs: typing "03071991" becomes "03.07.1991"
function initDateAutoFormat(input) {
    input.addEventListener('input', function(e) {
        var raw = this.value.replace(/\D/g, ''); // digits only
        var formatted = '';
        if (raw.length <= 2) {
            formatted = raw;
        } else if (raw.length <= 4) {
            formatted = raw.slice(0, 2) + '.' + raw.slice(2);
        } else {
            formatted = raw.slice(0, 2) + '.' + raw.slice(2, 4) + '.' + raw.slice(4, 8);
        }
        this.value = formatted;
    });

    // Also handle paste
    input.addEventListener('paste', function(e) {
        var self = this;
        setTimeout(function() {
            var raw = self.value.replace(/\D/g, '');
            var formatted = '';
            if (raw.length <= 2) formatted = raw;
            else if (raw.length <= 4) formatted = raw.slice(0, 2) + '.' + raw.slice(2);
            else formatted = raw.slice(0, 2) + '.' + raw.slice(2, 4) + '.' + raw.slice(4, 8);
            self.value = formatted;
        }, 0);
    });
}

function loadTreeData() {
    var saved = localStorage.getItem('familyTree');
    if (saved) {
        try {
            var parsed = JSON.parse(saved);
            SITE_CONFIG.familyTree.children = parsed;
            FAMILY_DATA = SITE_CONFIG.familyTree;
        } catch(e) {}
    }
}

function initTreeEditor() {
    loadTreeData();

    var addBtn = document.getElementById('add-child-btn');
    var saveBtn = document.getElementById('save-tree-btn');
    if (addBtn) addBtn.addEventListener('click', function() { addTreeNode(null); });
    if (saveBtn) saveBtn.addEventListener('click', saveTreeFromEditor);

    renderTreeEditor();
}

function renderTreeEditor() {
    var container = document.getElementById('tree-editor');
    if (!container) return;
    container.innerHTML = '';

    // Load saved root spouse data
    var savedRoot = localStorage.getItem('familyTreeRoot');
    if (savedRoot) {
        try {
            var r = JSON.parse(savedRoot);
            if (r.spouseName) SITE_CONFIG.familyTree.spouseName = r.spouseName;
            if (r.spouseLastName) SITE_CONFIG.familyTree.spouseLastName = r.spouseLastName;
            if (r.spouseBirthDate) SITE_CONFIG.familyTree.spouseBirthDate = r.spouseBirthDate;
            if (r.spouseAlive !== undefined) SITE_CONFIG.familyTree.spouseAlive = r.spouseAlive;
        } catch(e) {}
    }

    // Root spouse editor
    var root = SITE_CONFIG.familyTree;
    var rootDiv = document.createElement('div');
    rootDiv.className = 'tree-node-editor tree-root-editor';
    var spAlive = root.spouseAlive !== false;
    rootDiv.innerHTML =
        '<div class="tree-node-header">' +
            '<span class="tree-node-label tree-root-label">שורש העץ</span>' +
            '<span class="tree-node-preview">' + esc(root.name) + '</span>' +
        '</div>' +
        '<div class="tree-node-body">' +
            '<p class="info-text" style="margin-bottom:0.5rem">בן/בת זוג (בחיים)</p>' +
            '<div class="tree-fields-row">' +
                '<div class="tree-field"><label>שם פרטי</label><input type="text" id="root-spouse-name" value="' + esc(root.spouseName || '') + '" placeholder="למשל: זהבה"></div>' +
                '<div class="tree-field"><label>שם משפחה (אם שונה)</label><input type="text" id="root-spouse-last" value="' + esc(root.spouseLastName || '') + '" placeholder="אם שונה מהנפטר"></div>' +
                '<div class="tree-field"><label>ת. לידה</label><input type="text" id="root-spouse-birth" value="' + esc(root.spouseBirthDate || '') + '" placeholder="יום חודש שנה" dir="ltr" inputmode="numeric"></div>' +
            '</div>' +
        '</div>';
    container.appendChild(rootDiv);

    // Attach date format to root spouse birth
    var rootBirthInput = document.getElementById('root-spouse-birth');
    if (rootBirthInput) initDateAutoFormat(rootBirthInput);

    // Children
    var children = SITE_CONFIG.familyTree.children || [];
    if (children.length === 0) {
        var emptyMsg = document.createElement('p');
        emptyMsg.className = 'info-text';
        emptyMsg.textContent = 'אין ילדים בעץ. לחצו "+ הוסף ילד/ה" להתחיל.';
        container.appendChild(emptyMsg);
        return;
    }

    children.forEach(function(child, idx) {
        container.appendChild(buildNodeEditor(child, idx, [], 'child'));
    });

    // Attach auto-format to all date inputs
    container.querySelectorAll('input[data-field="birthDate"], input[data-field="spouseBirthDate"], input[data-field="weddingDate"]').forEach(initDateAutoFormat);
}

function ensureEditorData(node) {
    if (node._ed) return;
    // Parse existing name/info into structured fields
    node._ed = { firstName: '', spouseName: '', lastName: '', birthDate: '', spouseBirthDate: '', weddingDate: '' };
    if (node.name) {
        // Try to parse "firstName ו-spouseName lastName" or "firstName lastName"
        var m = node.name.match(/^(.+?)\s+ו(.+?)\s+(\S+)$/);
        if (m) {
            node._ed.firstName = m[1].trim();
            node._ed.spouseName = m[2].trim();
            node._ed.lastName = m[3].trim();
        } else {
            var parts = node.name.split(/\s+/);
            if (parts.length >= 2) {
                node._ed.lastName = parts.pop();
                node._ed.firstName = parts.join(' ');
            } else {
                node._ed.firstName = node.name;
            }
        }
    }
    if (node.info) {
        // Parse "name DD.MM.YYYY | name DD.MM.YYYY | נישואים DD.MM.YYYY"
        var segments = node.info.split('|').map(function(s) { return s.trim(); });
        segments.forEach(function(seg) {
            var dateMatch = seg.match(/(\d{2}\.\d{2}\.\d{4})/);
            if (!dateMatch) {
                var shortMatch = seg.match(/(\d{2}\.\d{2})$/);
                if (shortMatch) dateMatch = [shortMatch[0], shortMatch[1]];
            }
            if (seg.indexOf('נישואים') !== -1 || seg.indexOf('נישואין') !== -1) {
                if (dateMatch) node._ed.weddingDate = dateMatch[1];
            } else if (dateMatch) {
                if (!node._ed.birthDate) node._ed.birthDate = dateMatch[1];
                else if (!node._ed.spouseBirthDate) node._ed.spouseBirthDate = dateMatch[1];
            }
        });
    }
}

function buildDisplayName(ed) {
    var name = ed.firstName || '';
    if (ed.spouseName) name += ' ו' + ed.spouseName;
    if (ed.lastName) name += ' ' + ed.lastName;
    return name.trim();
}

function buildDisplayInfo(ed) {
    var parts = [];
    if (ed.firstName && ed.birthDate) parts.push(ed.firstName + ' ' + ed.birthDate);
    if (ed.spouseName && ed.spouseBirthDate) parts.push(ed.spouseName + ' ' + ed.spouseBirthDate);
    if (ed.weddingDate) parts.push('נישואים ' + ed.weddingDate);
    return parts.join(' | ');
}

function esc(str) {
    return (str || '').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}

function buildNodeEditor(node, idx, parentPath, level) {
    ensureEditorData(node);
    var ed = node._ed;
    var path = parentPath.concat([idx]);
    var pathStr = path.join('-');

    var levelLabels = { child: 'ילד/ה', gc: 'נכד/ה', ggc: 'נין/ה' };
    var levelColors = { child: '#c9a96e', gc: '#7ea', ggc: '#9bc' };
    var levelLabel = levelLabels[level] || 'איבר';
    var indentClass = level === 'child' ? '' : level === 'gc' ? 'tree-indent-1' : 'tree-indent-2';

    var div = document.createElement('div');
    div.className = 'tree-node-editor ' + indentClass;
    div.dataset.path = pathStr;

    // Collapse state
    var isCollapsed = node._collapsed || false;
    var collapseIcon = isCollapsed ? '▸' : '▾';
    var previewText = buildDisplayName(ed) || '(ללא שם)';

    var html = '<div class="tree-node-header">';
    html += '<button type="button" class="tree-collapse-btn" onclick="toggleNodeCollapse(\'' + pathStr + '\')" title="הצג/הסתר">' + collapseIcon + '</button>';
    html += '<span class="tree-node-label" style="border-color:' + levelColors[level] + '">' + levelLabel + '</span>';
    html += '<span class="tree-node-preview">' + esc(previewText) + '</span>';
    html += '<button type="button" class="tree-remove-btn" onclick="removeTreeNode(\'' + pathStr + '\')" title="הסר">✕</button>';
    html += '</div>';

    if (!isCollapsed) {
        html += '<div class="tree-node-body">';

        // Row 1: Names
        html += '<div class="tree-fields-row">';
        html += '<div class="tree-field"><label>שם פרטי</label><input type="text" data-path="' + pathStr + '" data-field="firstName" value="' + esc(ed.firstName) + '" placeholder="שם פרטי"></div>';
        html += '<div class="tree-field"><label>בן/בת זוג</label><input type="text" data-path="' + pathStr + '" data-field="spouseName" value="' + esc(ed.spouseName) + '" placeholder="שם בן/בת זוג"></div>';
        html += '<div class="tree-field"><label>שם משפחה</label><input type="text" data-path="' + pathStr + '" data-field="lastName" value="' + esc(ed.lastName) + '" placeholder="משפחה"></div>';
        html += '</div>';

        // Row 2: Dates
        html += '<div class="tree-fields-row">';
        html += '<div class="tree-field"><label>ת. לידה</label><input type="text" data-path="' + pathStr + '" data-field="birthDate" value="' + esc(ed.birthDate) + '" placeholder="יום חודש שנה" dir="ltr" inputmode="numeric"></div>';
        html += '<div class="tree-field"><label>ת. לידה בן/בת זוג</label><input type="text" data-path="' + pathStr + '" data-field="spouseBirthDate" value="' + esc(ed.spouseBirthDate) + '" placeholder="יום חודש שנה" dir="ltr" inputmode="numeric"></div>';
        html += '<div class="tree-field"><label>ת. נישואים</label><input type="text" data-path="' + pathStr + '" data-field="weddingDate" value="' + esc(ed.weddingDate) + '" placeholder="יום חודש שנה" dir="ltr" inputmode="numeric"></div>';
        html += '</div>';

        // Sub-children
        var nextLevel = level === 'child' ? 'gc' : level === 'gc' ? 'ggc' : null;
        if (nextLevel) {
            html += '<div class="tree-children" id="tree-children-' + pathStr + '"></div>';
            var addLabel = nextLevel === 'gc' ? '+ נכד/ה' : '+ נין/ה';
            html += '<button type="button" class="tree-add-sub-btn quick-btn" onclick="addTreeNode(\'' + pathStr + '\')">' + addLabel + '</button>';
        }

        html += '</div>'; // tree-node-body
    } else {
        // Collapsed - still render children container for data integrity
        var nextLevel = level === 'child' ? 'gc' : level === 'gc' ? 'ggc' : null;
        if (nextLevel) {
            html += '<div class="tree-children" id="tree-children-' + pathStr + '" style="display:none"></div>';
        }
    }

    div.innerHTML = html;

    // Append sub-children
    var nextLevel2 = level === 'child' ? 'gc' : level === 'gc' ? 'ggc' : null;
    if (nextLevel2 && node.children && node.children.length > 0) {
        var childrenContainer = div.querySelector('#tree-children-' + pathStr);
        if (childrenContainer) {
            node.children.forEach(function(subChild, subIdx) {
                childrenContainer.appendChild(buildNodeEditor(subChild, subIdx, path, nextLevel2));
            });
        }
    }

    return div;
}

function toggleNodeCollapse(pathStr) {
    syncEditorToData();
    var node = getNodeByPath(pathStr);
    if (node) node._collapsed = !node._collapsed;
    renderTreeEditor();
}

function getNodeByPath(pathStr) {
    var parts = pathStr.split('-').map(Number);
    var current = SITE_CONFIG.familyTree.children;
    var node = null;
    for (var i = 0; i < parts.length; i++) {
        node = current[parts[i]];
        if (!node) return null;
        if (i < parts.length - 1) {
            if (!node.children) node.children = [];
            current = node.children;
        }
    }
    return node;
}

function addTreeNode(parentPathStr) {
    syncEditorToData();

    var newNode = {
        name: '', info: '', children: [],
        _ed: { firstName: '', spouseName: '', lastName: '', birthDate: '', spouseBirthDate: '', weddingDate: '' }
    };

    if (!parentPathStr) {
        if (!SITE_CONFIG.familyTree.children) SITE_CONFIG.familyTree.children = [];
        newNode.level = 'child';
        SITE_CONFIG.familyTree.children.push(newNode);
    } else {
        var parentNode = getNodeByPath(parentPathStr);
        if (!parentNode) return;
        if (!parentNode.children) parentNode.children = [];
        var depth = parentPathStr.split('-').length;
        newNode.level = depth === 1 ? 'gc' : 'ggc';
        parentNode.children.push(newNode);
        // Auto-expand parent
        parentNode._collapsed = false;
    }

    renderTreeEditor();

    // Focus the new node's first input
    setTimeout(function() {
        var inputs = document.querySelectorAll('.tree-node-editor:last-child input[data-field="firstName"]');
        if (inputs.length > 0) inputs[inputs.length - 1].focus();
    }, 50);
}

function removeTreeNode(pathStr) {
    if (!confirm('להסיר איבר זה וכל הילדים שלו?')) return;
    syncEditorToData();
    var parts = pathStr.split('-').map(Number);
    var idx = parts.pop();

    var parent;
    if (parts.length === 0) {
        parent = SITE_CONFIG.familyTree.children;
    } else {
        var parentNode = getNodeByPath(parts.join('-'));
        if (!parentNode) return;
        parent = parentNode.children;
    }

    if (parent && idx < parent.length) {
        parent.splice(idx, 1);
    }

    renderTreeEditor();
}

function syncEditorToData() {
    var inputs = document.querySelectorAll('.tree-node-body input[data-path]');
    inputs.forEach(function(input) {
        var node = getNodeByPath(input.dataset.path);
        if (!node) return;
        ensureEditorData(node);
        node._ed[input.dataset.field] = input.value.trim();
    });

    // Rebuild name/info from _ed
    function rebuildNode(n) {
        if (n._ed) {
            n.name = buildDisplayName(n._ed);
            n.info = buildDisplayInfo(n._ed);
        }
        if (n.children) n.children.forEach(rebuildNode);
    }
    (SITE_CONFIG.familyTree.children || []).forEach(rebuildNode);
}

function saveTreeFromEditor() {
    syncEditorToData();

    // Save root spouse data
    var spouseName = (document.getElementById('root-spouse-name') || {}).value || '';
    var spouseLastName = (document.getElementById('root-spouse-last') || {}).value || '';
    var spouseBirthDate = (document.getElementById('root-spouse-birth') || {}).value || '';
    SITE_CONFIG.familyTree.spouseName = spouseName.trim();
    SITE_CONFIG.familyTree.spouseLastName = spouseLastName.trim();
    SITE_CONFIG.familyTree.spouseBirthDate = spouseBirthDate.trim();
    SITE_CONFIG.familyTree.spouseAlive = true;

    // Rebuild root display name
    var rootPerson = SITE_CONFIG.people[0];
    var rootName = rootPerson.name + ' ז"ל';
    if (SITE_CONFIG.familyTree.spouseName) {
        rootName += ' ו' + SITE_CONFIG.familyTree.spouseName;
        var lastName = SITE_CONFIG.familyTree.spouseLastName || rootPerson.name.split(' ').pop();
        rootName += ' ' + lastName;
    }
    SITE_CONFIG.familyTree.name = rootName;

    // Build root info
    var rootInfoParts = [];
    if (rootPerson.birthYear) rootInfoParts.push(rootPerson.name.split(' ')[0] + ' ' + rootPerson.birthYear);
    if (SITE_CONFIG.familyTree.spouseName && SITE_CONFIG.familyTree.spouseBirthDate) {
        rootInfoParts.push(SITE_CONFIG.familyTree.spouseName + ' ' + SITE_CONFIG.familyTree.spouseBirthDate);
    }
    SITE_CONFIG.familyTree.info = rootInfoParts.join(' | ');

    localStorage.setItem('familyTreeRoot', JSON.stringify({
        spouseName: SITE_CONFIG.familyTree.spouseName,
        spouseLastName: SITE_CONFIG.familyTree.spouseLastName,
        spouseBirthDate: SITE_CONFIG.familyTree.spouseBirthDate,
        spouseAlive: SITE_CONFIG.familyTree.spouseAlive
    }));

    // Clean empty child nodes
    function cleanTree(children) {
        return children.filter(function(c) {
            if (c.children) c.children = cleanTree(c.children);
            return c._ed && c._ed.firstName && c._ed.firstName.trim() !== '';
        });
    }
    SITE_CONFIG.familyTree.children = cleanTree(SITE_CONFIG.familyTree.children || []);

    // Save children
    function stripMeta(arr) {
        return arr.map(function(n) {
            var clean = { name: n.name, info: n.info, level: n.level, _ed: n._ed };
            if (n.children && n.children.length > 0) clean.children = stripMeta(n.children);
            else clean.children = [];
            return clean;
        });
    }
    localStorage.setItem('familyTree', JSON.stringify(stripMeta(SITE_CONFIG.familyTree.children)));

    // Update display
    FAMILY_DATA = SITE_CONFIG.familyTree;
    renderFamilyTree();
    renderTreeEditor();

    saveAllToCloud();

    var msg = document.getElementById('save-tree-success');
    msg.classList.remove('hidden');
    setTimeout(function() { msg.classList.add('hidden'); }, 2000);
}

// ==================== PDF GENERATION ====================

function getSelectedLettersForPerson(personKey) {
    var person = CONFIG.people[personKey];
    var selected = [];
    person.lettersForTehillim.forEach(function(letter, index) {
        if (state.selectedLetters[personKey + '_' + index] !== false) selected.push(letter);
    });
    CONFIG.neshamaLetters.forEach(function(letter, index) {
        if (state.selectedLetters[personKey + '_neshama_' + index] === true) selected.push(letter);
    });
    return selected;
}

function getFirstNameLetters(personKey) {
    var person = CONFIG.people[personKey];
    var indices = person.nameGroups.first || [];
    return indices.map(function(i) { return person.lettersForTehillim[i]; });
}

function buildTehillimHtml(letters, title) {
    var html = '<div class="pdf-divider">✦</div>';
    html += '<h2 class="pdf-section-title">תהילים לפי אותיות השם - ' + title + '</h2>';
    var seen = {};
    letters.forEach(function(letter) {
        if (PSALM_119[letter] && !seen[letter]) {
            seen[letter] = true;
            html += '<h3 class="pdf-letter-title">' + PSALM_119[letter].title + '</h3>';
            html += '<p class="pdf-prayer">' + PSALM_119[letter].verses + '</p>';
        }
    });
    return html;
}

function buildPrayerSection(prayer) {
    var html = '<h2 class="pdf-section-title">' + prayer.title + '</h2>';
    if (prayer.instruction) html += '<p class="pdf-instruction">' + prayer.instruction + '</p>';
    html += '<p class="pdf-prayer">' + prayer.text + '</p>';
    return html;
}

function formatDate(dateStr) {
    if (!dateStr) return '';
    var parts = dateStr.split('-');
    return parts[2] + '/' + parts[1] + '/' + parts[0];
}

function openPdfView(bodyHtml) {
    var overlay = document.getElementById('pdf-overlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'pdf-overlay';
        document.body.appendChild(overlay);
    }

    overlay.innerHTML =
        '<div class="pdf-toolbar">' +
            '<button onclick="printPdf()">שמור / הדפס PDF</button>' +
            '<button onclick="closePdfView()" class="pdf-close-btn">✕ סגור</button>' +
        '</div>' +
        '<div class="pdf-body" id="pdf-body">' + bodyHtml + '</div>';
    overlay.classList.add('pdf-visible');
    document.body.classList.add('pdf-mode');
}

function printPdf() { window.print(); }

function closePdfView() {
    var overlay = document.getElementById('pdf-overlay');
    if (overlay) { overlay.classList.remove('pdf-visible'); overlay.innerHTML = ''; }
    document.body.classList.remove('pdf-mode');
}

function generateQuickPdf() {
    try {
        var azkara = state.azkara;
        var checkedItems = [];
        document.querySelectorAll('#main-seder-checklist input:checked').forEach(function(cb) { checkedItems.push(cb.value); });

        var html = '<h1 class="pdf-main-title">סדר אזכרה ' + azkara.yearLabel + '</h1>';
        html += '<h1 class="pdf-sub-title">' + getPersonTitle(azkara.forPerson) + '</h1>';

        SITE_CONFIG.people.forEach(function(p) {
            var prefix = p.gender === 'male' ? 'נפטר' : 'נפטרה';
            html += '<p class="pdf-info">' + p.name + ' - ' + prefix + ': ' + p.deathDateHebrew + ' | ' + formatDate(p.deathDateGregorian) + '</p>';
        });

        if (azkara.date) {
            var dateParts = azkara.date.split('-');
            html += '<p class="pdf-info">' + dateParts[2] + '/' + dateParts[1] + '/' + dateParts[0] + ' | ' + azkara.time + (azkara.location ? ' | ' + azkara.location : '') + '</p>';
        }
        html += '<div class="pdf-divider">✦ ✦ ✦</div>';

        if (checkedItems.indexOf('candle') !== -1) html += buildPrayerSection(PRAYERS.candle);

        if (checkedItems.indexOf('tehillim') !== -1) {
            SITE_CONFIG.people.forEach(function(p) {
                var letters = getFirstNameLetters(p.key);
                html += buildTehillimHtml(letters, p.fullNameHebrew.split(' ')[0]);
            });
        }

        if (checkedItems.indexOf('neshama') !== -1) {
            var seen = {};
            html += '<div class="pdf-divider">✦</div>';
            html += '<h2 class="pdf-section-title">תהילים - אותיות נשמה</h2>';
            CONFIG.neshamaLetters.forEach(function(letter) {
                if (PSALM_119[letter] && !seen[letter]) {
                    seen[letter] = true;
                    html += '<h3 class="pdf-letter-title">' + PSALM_119[letter].title + '</h3>';
                    html += '<p class="pdf-prayer">' + PSALM_119[letter].verses + '</p>';
                }
            });
        }

        if (checkedItems.indexOf('psalm91') !== -1) html += buildPrayerSection(PRAYERS.psalm91);
        if (checkedItems.indexOf('psalm121') !== -1) html += buildPrayerSection(PRAYERS.psalm121);

        if (checkedItems.indexOf('hashkava') !== -1) {
            SITE_CONFIG.people.forEach(function(p) {
                html += buildPrayerSection(generateHashkava(p));
            });
        }

        if (checkedItems.indexOf('kaddish') !== -1) html += buildPrayerSection(PRAYERS.kaddish);

        html += '<div class="pdf-divider">✦ ✦ ✦</div>';
        html += '<p class="pdf-footer">ת.נ.צ.ב.ה</p>';

        openPdfView(html);
    } catch (e) { alert('שגיאה ביצירת PDF: ' + e.message); }
}

function generateAdvancedPdf() {
    try {
        var azkara = state.azkara;
        var checkedItems = [];
        document.querySelectorAll('#adv-seder-checklist input:checked').forEach(function(cb) { checkedItems.push(cb.value); });

        var html = '<h1 class="pdf-main-title">סדר אזכרה ' + azkara.yearLabel + '</h1>';
        html += '<h1 class="pdf-sub-title">' + getPersonTitle(azkara.forPerson) + '</h1>';

        if (azkara.date) {
            var dateParts = azkara.date.split('-');
            html += '<p class="pdf-info">' + dateParts[2] + '/' + dateParts[1] + '/' + dateParts[0] + ' | ' + azkara.time + (azkara.location ? ' | ' + azkara.location : '') + '</p>';
        }
        html += '<div class="pdf-divider">✦ ✦ ✦</div>';

        if (checkedItems.indexOf('candle') !== -1) html += buildPrayerSection(PRAYERS.candle);

        SITE_CONFIG.people.forEach(function(p) {
            if (checkedItems.indexOf('tehillim_' + p.key) !== -1) {
                var letters = getSelectedLettersForPerson(p.key);
                if (letters.length > 0) html += buildTehillimHtml(letters, p.fullNameHebrew);
            }
        });

        if (checkedItems.indexOf('psalm91') !== -1) html += buildPrayerSection(PRAYERS.psalm91);
        if (checkedItems.indexOf('psalm121') !== -1) html += buildPrayerSection(PRAYERS.psalm121);

        SITE_CONFIG.people.forEach(function(p) {
            if (checkedItems.indexOf('hashkava_' + p.key) !== -1) {
                html += buildPrayerSection(generateHashkava(p));
            }
        });

        if (checkedItems.indexOf('kaddish') !== -1) html += buildPrayerSection(PRAYERS.kaddish);

        html += '<div class="pdf-divider">✦ ✦ ✦</div>';
        html += '<p class="pdf-footer">ת.נ.צ.ב.ה</p>';

        openPdfView(html);
    } catch (e) { alert('שגיאה ביצירת PDF: ' + e.message); }
}

// ==================== LOCAL STORAGE ====================

function loadAzkara() {
    var saved = localStorage.getItem('azkara');
    if (saved) return JSON.parse(saved);
    return {
        forPerson: SITE_CONFIG.azkaraDefaults.forPerson,
        date: SITE_CONFIG.azkaraDefaults.date,
        time: SITE_CONFIG.azkaraDefaults.time,
        location: SITE_CONFIG.azkaraDefaults.location,
        yearLabel: SITE_CONFIG.azkaraDefaults.yearLabel
    };
}

function loadMembers() {
    var saved = localStorage.getItem('members');
    if (saved) return JSON.parse(saved);
    return [];
}

function loadSelectedLetters() {
    var saved = localStorage.getItem('selectedLetters');
    if (saved) return JSON.parse(saved);
    return {};
}

function loadPersonOverrides() {
    var saved = localStorage.getItem('personOverrides');
    if (saved) return JSON.parse(saved);
    return {};
}

function saveSelectedLetters() {
    localStorage.setItem('selectedLetters', JSON.stringify(state.selectedLetters));
}

// ==================== CLOUD DB ====================

// Collect all site data into one object
function collectSiteData() {
    return {
        personOverrides: state.personOverrides,
        azkara: state.azkara,
        members: state.members,
        selectedLetters: state.selectedLetters,
        familyTree: SITE_CONFIG.familyTree.children,
        familyTreeRoot: {
            spouseName: SITE_CONFIG.familyTree.spouseName || '',
            spouseLastName: SITE_CONFIG.familyTree.spouseLastName || '',
            spouseBirthDate: SITE_CONFIG.familyTree.spouseBirthDate || '',
            spouseAlive: SITE_CONFIG.familyTree.spouseAlive !== false
        },
        savedAt: new Date().toISOString()
    };
}

// Apply loaded cloud data to site
function applySiteData(data) {
    if (!data || typeof data !== 'object') return;

    if (data.personOverrides) {
        state.personOverrides = data.personOverrides;
        localStorage.setItem('personOverrides', JSON.stringify(data.personOverrides));
    }
    if (data.azkara) {
        state.azkara = data.azkara;
        localStorage.setItem('azkara', JSON.stringify(data.azkara));
    }
    if (data.members) {
        state.members = data.members;
        localStorage.setItem('members', JSON.stringify(data.members));
    }
    if (data.selectedLetters) {
        state.selectedLetters = data.selectedLetters;
        localStorage.setItem('selectedLetters', JSON.stringify(data.selectedLetters));
    }
    if (data.familyTree) {
        SITE_CONFIG.familyTree.children = data.familyTree;
        localStorage.setItem('familyTree', JSON.stringify(data.familyTree));
    }
    if (data.familyTreeRoot) {
        SITE_CONFIG.familyTree.spouseName = data.familyTreeRoot.spouseName || '';
        SITE_CONFIG.familyTree.spouseLastName = data.familyTreeRoot.spouseLastName || '';
        SITE_CONFIG.familyTree.spouseBirthDate = data.familyTreeRoot.spouseBirthDate || '';
        SITE_CONFIG.familyTree.spouseAlive = data.familyTreeRoot.spouseAlive !== false;
        localStorage.setItem('familyTreeRoot', JSON.stringify(data.familyTreeRoot));
    }
}

// Save all data to cloud
function saveToCloud(callback) {
    if (!SITE_CONFIG.appsScriptUrl) {
        if (callback) callback(false, 'לא הוגדר Apps Script URL');
        return;
    }
    var siteData = collectSiteData();
    fetch(SITE_CONFIG.appsScriptUrl, {
        method: 'POST',
        body: JSON.stringify({
            action: 'saveConfig',
            pass: SITE_CONFIG.password,
            config: siteData
        })
    })
    .then(function(r) { return r.json(); })
    .then(function(res) {
        if (res.success) {
            console.log('Cloud save OK');
            if (callback) callback(true);
        } else {
            console.error('Cloud save failed:', res.error);
            if (callback) callback(false, res.error);
        }
    })
    .catch(function(err) {
        console.error('Cloud save error:', err);
        if (callback) callback(false, err.message);
    });
}

// Load all data from cloud
function loadFromCloud(callback) {
    if (!SITE_CONFIG.appsScriptUrl) {
        if (callback) callback(false);
        return;
    }
    fetch(SITE_CONFIG.appsScriptUrl + '?action=loadConfig')
        .then(function(r) { return r.json(); })
        .then(function(res) {
            if (res.success && res.config && Object.keys(res.config).length > 0) {
                applySiteData(res.config);
                console.log('Cloud load OK');
                if (callback) callback(true);
            } else {
                if (callback) callback(false);
            }
        })
        .catch(function(err) {
            console.error('Cloud load error:', err);
            if (callback) callback(false);
        });
}

// Wrap every save action to also push to cloud
function saveAllToCloud() {
    // Also save to localStorage as fallback
    localStorage.setItem('personOverrides', JSON.stringify(state.personOverrides));
    localStorage.setItem('azkara', JSON.stringify(state.azkara));
    localStorage.setItem('members', JSON.stringify(state.members));
    localStorage.setItem('selectedLetters', JSON.stringify(state.selectedLetters));

    saveToCloud();
}

// ==================== INIT ====================

function renderFullApp() {
    try { applyPersonOverrides(); } catch(e) { console.error('overrides:', e); }

    document.getElementById('page-title').textContent = SITE_CONFIG.siteTitle;
    document.getElementById('footer-text').textContent = 'נבנה באהבה ע"י ' + SITE_CONFIG.builtBy;

    try { renderPersonCards(); } catch(e) { console.error('personCards:', e); }
    try { renderActionButtons(); } catch(e) { console.error('actionBtns:', e); }
    try { renderAdvancedChecklist(); } catch(e) { console.error('advChecklist:', e); }
    try { renderPersonDetailsEditor(); } catch(e) { console.error('personEditor:', e); }
    try { initLetters(); } catch(e) { console.error('letters:', e); }
    try { initAzkaraAdmin(); } catch(e) { console.error('azkaraAdmin:', e); }
    try { initMembers(); } catch(e) { console.error('members:', e); }
    try { updateElapsedTimes(); } catch(e) { console.error('elapsed:', e); }
    try { updateMemorialAzkara(); } catch(e) { console.error('memAzkara:', e); }
    try { initTreeEditor(); } catch(e) { console.error('treeEditor:', e); }
    try { renderFamilyTree(); } catch(e) { console.error('tree:', e); }
}

function initApp() {
    try { initDarkMode(); } catch(e) { console.error('darkMode:', e); }
    try { initManageLock(); } catch(e) { console.error('manageLock:', e); }
    try { initNav(); } catch(e) { console.error('nav:', e); }

    // Render with local data first (instant)
    renderFullApp();

    // Then try loading from cloud and re-render if newer data exists
    loadFromCloud(function(success) {
        if (success) {
            renderFullApp();
        }
    });

    // Buttons
    try {
        document.getElementById('quick-pdf-btn').addEventListener('click', generateQuickPdf);
        document.getElementById('download-pdf-btn').addEventListener('click', generateAdvancedPdf);
        document.getElementById('save-person-btn').addEventListener('click', savePersonDetails);
    } catch(e) { console.error('buttons:', e); }

    // Gallery
    try { initGallery(); } catch(e) { console.error('gallery:', e); }
    try { initDuplicateScanner(); } catch(e) { console.error('dupScanner:', e); }

    try {
        document.getElementById('file-input').addEventListener('change', handleFileSelect);
        document.getElementById('upload-submit-btn').addEventListener('click', submitUpload);
        document.getElementById('upload-cancel-btn').addEventListener('click', cancelUpload);
    } catch(e) { console.error('uploadBtns:', e); }
}

document.addEventListener('DOMContentLoaded', initApp);
