// family-tree.js - Family tree with pure CSS lines (config-driven)

var FAMILY_DATA = SITE_CONFIG.familyTree;

// Rename legacy "מיכל" to "מיקי" in a stored tree, so the fix applies
// for users whose browsers still hold the old cached version.
function migrateTreeMichalToMiki(nodes) {
    if (!nodes || !nodes.length) return false;
    var changed = false;
    nodes.forEach(function(n) {
        if (n && typeof n.name === 'string' && n.name.indexOf('מיכל') === 0) {
            n.name = n.name.replace(/^מיכל/, 'מיקי');
            changed = true;
        }
        if (n && n._ed && n._ed.firstName === 'מיכל') {
            n._ed.firstName = 'מיקי';
            changed = true;
        }
        if (n && n.children) {
            if (migrateTreeMichalToMiki(n.children)) changed = true;
        }
    });
    return changed;
}

// Load saved tree from localStorage
(function() {
    var saved = localStorage.getItem('familyTree');
    if (saved) {
        try {
            var parsedChildren = JSON.parse(saved);
            if (migrateTreeMichalToMiki(parsedChildren)) {
                localStorage.setItem('familyTree', JSON.stringify(parsedChildren));
            }
            FAMILY_DATA.children = parsedChildren;
            SITE_CONFIG.familyTree.children = FAMILY_DATA.children;
        } catch(e) {}
    }
    // Load saved root spouse data
    var savedRoot = localStorage.getItem('familyTreeRoot');
    if (savedRoot) {
        try {
            var r = JSON.parse(savedRoot);
            if (r.spouseName) {
                SITE_CONFIG.familyTree.spouseName = r.spouseName;
                SITE_CONFIG.familyTree.spouseLastName = r.spouseLastName || '';
                SITE_CONFIG.familyTree.spouseBirthDate = r.spouseBirthDate || '';
                var rootPerson = SITE_CONFIG.people[0];
                var rootName = rootPerson.name + ' ז"ל';
                rootName += ' ו' + r.spouseName;
                var ln = r.spouseLastName || rootPerson.name.split(' ').pop();
                rootName += ' ' + ln;
                FAMILY_DATA.name = rootName;
                SITE_CONFIG.familyTree.name = rootName;
                var infoParts = [];
                if (r.spouseBirthDate) infoParts.push(r.spouseName + ' ' + r.spouseBirthDate);
                if (infoParts.length) FAMILY_DATA.info = infoParts.join(' | ');
            }
        } catch(e) {}
    }
})();

function calcAgeFromDate(dateStr) {
    var parts = dateStr.split('.');
    if (parts.length < 3) return null;
    var d = parseInt(parts[0]), m = parseInt(parts[1]) - 1, y = parseInt(parts[2]);
    if (y < 100) y += (y > 50 ? 1900 : 2000);
    var now = new Date();
    var age = now.getFullYear() - y;
    if (now.getMonth() < m || (now.getMonth() === m && now.getDate() < d)) age--;
    return age;
}

function buildInfoTooltip(info) {
    if (!info) return '';
    return info.split('|').map(function(p) {
        p = p.trim();
        var dateMatch = p.match(/(\d{2}\.\d{2}\.\d{4})/);
        if (dateMatch && p.indexOf('נישואים') === -1) {
            var age = calcAgeFromDate(dateMatch[1]);
            return age !== null ? p + ' (גיל ' + age + ')' : p;
        }
        return p;
    }).join('\n');
}

function escHtml(s) {
    var d = document.createElement('div');
    d.textContent = s;
    return d.innerHTML;
}

function renderFamilyTree() {
    var container = document.getElementById('family-tree-container');
    if (!container) return;

    if (!FAMILY_DATA.children || FAMILY_DATA.children.length === 0) {
        var section = document.getElementById('family-tree-section');
        if (section) section.style.display = 'none';
        return;
    }

    var section = document.getElementById('family-tree-section');
    if (section) section.style.display = 'block';

    container.innerHTML = '<div class="ft" id="ft-root">' + renderNode(FAMILY_DATA) + '</div>';

    // Position horizontal connectors after the DOM has laid out.
    // Run multiple times to survive late font loads / re-flows.
    requestAnimationFrame(positionHLines);
    setTimeout(positionHLines, 60);
    setTimeout(positionHLines, 250);
    setTimeout(positionHLines, 800);
    window.removeEventListener('resize', positionHLines);
    window.addEventListener('resize', positionHLines);
    if (document.fonts && document.fonts.ready) {
        document.fonts.ready.then(positionHLines);
    }

    // Tooltips
    container.querySelectorAll('.ft-node[data-info]').forEach(function(el) {
        el.addEventListener('click', function(e) {
            e.stopPropagation();
            showTreeTooltip(this);
        });
        el.addEventListener('mouseenter', function() { showTreeTooltip(this); });
        el.addEventListener('mouseleave', function() { hideTreeTooltip(this); });
    });
}

function renderNode(node) {
    var hasKids = node.children && node.children.length > 0;
    var cls = 'ft-node ft-' + node.level;
    var infoAttr = node.info ? ' data-info="' + escHtml(node.info) + '"' : '';
    var name = node.name || '';

    var h = '<div class="ft-item">';
    h += '<div class="' + cls + '"' + infoAttr + '>' + escHtml(name) + '</div>';

    if (hasKids) {
        h += '<div class="ft-vline"></div>';
        h += '<div class="ft-kids">';
        h += '<div class="ft-hline"></div>'; // positioned by JS
        h += '<div class="ft-kids-row">';
        node.children.forEach(function(kid) {
            h += '<div class="ft-kid-col">';
            h += '<div class="ft-vline-up"></div>';
            h += renderNode(kid);
            h += '</div>';
        });
        h += '</div></div>';
    }
    h += '</div>';
    return h;
}

// Find a direct child of `parent` that has `cls` (avoids :scope CSS selector
// which has spotty support in some browsers).
function ftDirectChild(parent, cls) {
    if (!parent) return null;
    for (var i = 0; i < parent.children.length; i++) {
        if (parent.children[i].classList.contains(cls)) return parent.children[i];
    }
    return null;
}
function ftDirectChildren(parent, cls) {
    var out = [];
    if (!parent) return out;
    for (var i = 0; i < parent.children.length; i++) {
        if (parent.children[i].classList.contains(cls)) out.push(parent.children[i]);
    }
    return out;
}

// Position the horizontal connector lines based on the actual DOM layout
function positionHLines() {
    var groups = document.querySelectorAll('.ft-kids');
    if (!groups.length) return;
    var positioned = 0;
    groups.forEach(function(kids) {
        var hline = ftDirectChild(kids, 'ft-hline');
        var row = ftDirectChild(kids, 'ft-kids-row');
        if (!hline || !row) return;

        var cols = ftDirectChildren(row, 'ft-kid-col');
        if (cols.length < 2) { hline.style.display = 'none'; return; }

        var first = cols[0];
        var last = cols[cols.length - 1];
        var kidsRect = kids.getBoundingClientRect();
        var firstRect = first.getBoundingClientRect();
        var lastRect = last.getBoundingClientRect();

        // X-center of first and last child, RELATIVE TO .ft-kids
        // (the hline's offset parent — it has position:relative).
        var leftPos = firstRect.left + firstRect.width / 2 - kidsRect.left;
        var rightPos = lastRect.left + lastRect.width / 2 - kidsRect.left;

        var l = Math.min(leftPos, rightPos);
        var r = Math.max(leftPos, rightPos);

        if (r - l < 1) return; // skip degenerate (layout not ready yet)
        hline.style.display = 'block';
        hline.style.position = 'absolute';
        hline.style.top = '0';
        hline.style.left = l + 'px';
        hline.style.width = (r - l) + 'px';
        hline.style.height = '2px';
        positioned++;
    });
    if (window.console && positioned > 0) {
        console.log('[Tree] positioned ' + positioned + ' horizontal lines');
    }
}

// Tooltips
function showTreeTooltip(el) {
    hideAllTooltips();
    var info = el.dataset.info;
    if (!info) return;
    var tip = document.createElement('div');
    tip.className = 'ft-tooltip';
    tip.textContent = buildInfoTooltip(info);
    el.appendChild(tip);
}

function hideTreeTooltip(el) {
    var t = el.querySelector('.ft-tooltip');
    if (t) t.remove();
}

function hideAllTooltips() {
    document.querySelectorAll('.ft-tooltip').forEach(function(t) { t.remove(); });
}

document.addEventListener('click', hideAllTooltips);
