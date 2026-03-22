// family-tree.js - Family tree with pure CSS lines (config-driven)

var FAMILY_DATA = SITE_CONFIG.familyTree;

// Load saved tree from localStorage
(function() {
    var saved = localStorage.getItem('familyTree');
    if (saved) {
        try {
            FAMILY_DATA.children = JSON.parse(saved);
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

    container.innerHTML = '<div class="ft">' + renderNode(FAMILY_DATA) + '</div>';

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
        var count = node.children.length;
        h += '<div class="ft-kids' + (count === 1 ? ' ft-single' : '') + '">';
        node.children.forEach(function(kid, i) {
            var colCls = 'ft-kid-col';
            if (count > 1) {
                if (i === 0) colCls += ' ft-first';
                else if (i === count - 1) colCls += ' ft-last';
                else colCls += ' ft-mid';
            }
            h += '<div class="' + colCls + '">';
            h += renderNode(kid);
            h += '</div>';
        });
        h += '</div>';
    }
    h += '</div>';
    return h;
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
