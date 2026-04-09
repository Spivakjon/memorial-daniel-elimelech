// gallery.js - Unified gallery with categories and people tags (config-driven)

var APPS_SCRIPT_URL = SITE_CONFIG.appsScriptUrl;
var STATIC_PHOTOS = SITE_CONFIG.staticPhotos.slice();
var CATEGORIES = SITE_CONFIG.categories;
var activeFilter = 'הכל';
var activePersonFilter = null;
var allPhotos = [];
var pendingFiles = [];

// Walk the family tree and collect tags + groups, so the gallery's
// people filter and tag panel always reflect the current tree without
// requiring config.js edits.
function syncFamilyFromTree() {
    var tree = SITE_CONFIG.familyTree;
    if (!tree) return;

    var allNames = [];
    var groups = [];
    var seen = {};
    function add(name) {
        if (!name) return;
        name = String(name).trim();
        if (!name || seen[name]) return;
        seen[name] = true;
        allNames.push(name);
    }

    // Root: deceased + spouse
    var rootPerson = (SITE_CONFIG.people && SITE_CONFIG.people[0]) || {};
    var rootFirstName = (rootPerson.name || '').split(' ')[0];
    var rootMembers = [];
    if (rootFirstName) { add(rootFirstName); rootMembers.push(rootFirstName); }
    if (tree.spouseName) { add(tree.spouseName); rootMembers.push(tree.spouseName); }
    if (rootMembers.length) {
        groups.push({ label: 'הורים', members: rootMembers });
    }

    // Each direct child branch becomes its own group (parent + spouse + descendants)
    (tree.children || []).forEach(function(child) {
        var ed = child._ed || {};
        var label = ed.firstName || child.name || 'משפחה';
        if (ed.spouseName) label = ed.firstName + ' ו' + ed.spouseName;
        var members = [];
        function collect(node) {
            var ned = node._ed || {};
            if (ned.firstName) { add(ned.firstName); members.push(ned.firstName); }
            if (ned.spouseName) { add(ned.spouseName); members.push(ned.spouseName); }
            (node.children || []).forEach(collect);
        }
        collect(child);
        if (members.length) groups.push({ label: 'משפחת ' + label, members: members });
    });

    SITE_CONFIG.familyNames = allNames;
    SITE_CONFIG.familyGroups = groups;
    FAMILY_GROUPS = groups;
}

function initGallery() {
    syncFamilyFromTree();

    try {
        var saved = JSON.parse(localStorage.getItem('photoTags') || '{}');
        STATIC_PHOTOS.forEach(function(p) {
            if (saved[p.src]) p.people = saved[p.src];
        });
    } catch(e) {}

    allPhotos = STATIC_PHOTOS.slice();
    renderFilters();
    renderPeopleFilter();

    if (APPS_SCRIPT_URL) {
        loadDrivePhotos();
    } else {
        renderGallery();
    }
}

function renderFilters() {
    var container = document.getElementById('gallery-filters');
    if (!container) return;
    container.innerHTML = '';

    CATEGORIES.forEach(function(cat) {
        var btn = document.createElement('button');
        btn.className = 'filter-btn' + (activeFilter === cat && !activePersonFilter ? ' active' : '');
        btn.textContent = cat;
        btn.onclick = function() {
            activeFilter = cat;
            activePersonFilter = null;
            renderFilters();
            renderPeopleFilter();
            renderGallery();
        };
        container.appendChild(btn);
    });
}

function renderPeopleFilter() {
    var container = document.getElementById('people-filter');
    if (!container) return;
    container.innerHTML = '';

    var allPeople = {};
    allPhotos.forEach(function(p) {
        if (p.people) {
            p.people.forEach(function(name) {
                allPeople[name] = (allPeople[name] || 0) + 1;
            });
        }
    });

    var names = Object.keys(allPeople);
    if (names.length === 0) return;

    var allBtn = document.createElement('button');
    allBtn.className = 'people-filter-btn' + (!activePersonFilter ? ' active' : '');
    allBtn.textContent = 'כל האנשים';
    allBtn.onclick = function() {
        activePersonFilter = null;
        renderPeopleFilter();
        renderGallery();
    };
    container.appendChild(allBtn);

    names.sort();
    names.forEach(function(name) {
        var btn = document.createElement('button');
        btn.className = 'people-filter-btn' + (activePersonFilter === name ? ' active' : '');
        btn.textContent = name + ' (' + allPeople[name] + ')';
        btn.onclick = function() {
            activePersonFilter = name;
            activeFilter = 'הכל';
            renderFilters();
            renderPeopleFilter();
            renderGallery();
        };
        container.appendChild(btn);
    });
}

function loadDrivePhotos() {
    fetch(APPS_SCRIPT_URL + '?action=list')
        .then(function(r) { return r.json(); })
        .then(function(data) {
            if (data.success && data.files) {
                data.files.forEach(function(f) {
                    var isVideo = f.mimeType && f.mimeType.startsWith('video/');
                    var desc = f.description || '';
                    var cat = 'הועלו וטרם מוינו';

                    var catMatch = desc.match(/\[קטגוריה:([^\]]+)\]/);
                    if (catMatch) {
                        cat = catMatch[1];
                        desc = desc.replace(catMatch[0], '').trim();
                    }

                    var people = [];
                    var peopleMatch = desc.match(/\[אנשים:([^\]]+)\]/);
                    if (peopleMatch) {
                        people = peopleMatch[1].split(',').map(function(s) { return s.trim(); });
                        desc = desc.replace(peopleMatch[0], '').trim();
                    } else {
                        SITE_CONFIG.familyNames.forEach(function(name) {
                            if (desc.indexOf(name) !== -1) people.push(name);
                        });
                    }

                    allPhotos.push({
                        src: 'https://lh3.googleusercontent.com/d/' + f.fileId + '=w600',
                        fullSrc: 'https://lh3.googleusercontent.com/d/' + f.fileId + '=w2000',
                        description: desc,
                        people: people,
                        category: cat,
                        period: '',
                        isStatic: false,
                        fileId: f.fileId,
                        isVideo: isVideo,
                        driveUrl: f.url,
                        name: f.name || ''
                    });
                });
            }
            renderPeopleFilter();
            renderGallery();
        })
        .catch(function() {
            renderGallery();
        });
}

function renderGallery() {
    var grid = document.getElementById('unified-gallery-grid');
    if (!grid) return;
    grid.innerHTML = '';

    var filtered = allPhotos.filter(function(p) {
        if (activePersonFilter) {
            return p.people && p.people.indexOf(activePersonFilter) !== -1;
        }
        if (activeFilter === 'הכל') return true;
        if (activeFilter === 'ללא תיוג') return !p.people || p.people.length === 0;
        return p.category === activeFilter;
    });

    if (filtered.length === 0) {
        grid.innerHTML = '<p class="info-text">אין תמונות בקטגוריה זו</p>';
        return;
    }

    filtered.forEach(function(photo, filteredIdx) {
        var div = document.createElement('div');
        div.className = 'gallery-item';

        var imgSrc = photo.src;
        var peopleTags = '';
        if (photo.people && photo.people.length > 0) {
            peopleTags = '<div class="photo-people">' +
                photo.people.map(function(p) {
                    return '<span class="person-tag" onclick="event.stopPropagation(); filterByPerson(\'' + p + '\')">' + p + '</span>';
                }).join('') + '</div>';
        }

        if (photo.isVideo) {
            div.innerHTML =
                '<img src="' + imgSrc + '" alt="סרטון" loading="lazy">' +
                '<div class="play-overlay">▶</div>' +
                '<div class="gallery-meta">' +
                (photo.description ? '<p class="gallery-caption">' + photo.description + '</p>' : '') +
                (photo.period ? '<p class="gallery-period">' + photo.period + '</p>' : '') +
                '</div>' + peopleTags;
        } else {
            div.innerHTML =
                '<img src="' + imgSrc + '" alt="' + (photo.description || '') + '" loading="lazy">' +
                '<div class="gallery-meta">' +
                (photo.description ? '<p class="gallery-caption">' + photo.description + '</p>' : '') +
                (photo.period ? '<p class="gallery-period">' + photo.period + '</p>' : '') +
                '</div>' + peopleTags;
        }
        (function(i) { div.onclick = function() { openMediaByIndex(i); }; })(filteredIdx);

        if (!photo.isStatic && photo.fileId) {
            div.dataset.fileId = photo.fileId;
            div.dataset.url = photo.driveUrl || photo.src;
            div.addEventListener('contextmenu', function(e) {
                e.preventDefault();
                showCtxMenu(e, this);
            });
            var timer;
            div.addEventListener('touchstart', function(e) {
                var el = this;
                timer = setTimeout(function() { e.preventDefault(); showCtxMenu(e, el); }, 600);
            });
            div.addEventListener('touchend', function() { clearTimeout(timer); });
            div.addEventListener('touchmove', function() { clearTimeout(timer); });
        }

        grid.appendChild(div);
    });
}

function filterByPerson(name) {
    activePersonFilter = name;
    activeFilter = 'הכל';
    renderFilters();

    var container = document.getElementById('gallery-filters');
    var clearBtn = document.createElement('button');
    clearBtn.className = 'filter-btn active person-filter';
    clearBtn.textContent = name + ' ✕';
    clearBtn.onclick = function() {
        activePersonFilter = null;
        renderFilters();
        renderGallery();
    };
    container.appendChild(clearBtn);

    renderGallery();
    document.getElementById('gallery-section').scrollIntoView({ behavior: 'smooth' });
}


// Upload handling
function handleFileSelect(e) {
    var files = e.target.files;
    if (!files.length) return;
    pendingFiles = Array.from(files);

    var preview = document.getElementById('upload-preview');
    var thumbs = document.getElementById('preview-thumbs');
    thumbs.innerHTML = '';

    pendingFiles.forEach(function(file) {
        var div = document.createElement('div');
        div.className = 'preview-thumb';
        if (file.type.startsWith('image/')) {
            var img = document.createElement('img');
            img.src = URL.createObjectURL(file);
            div.appendChild(img);
        } else {
            div.innerHTML = '<div class="preview-video-icon">▶</div>';
        }
        thumbs.appendChild(div);
    });

    preview.classList.remove('hidden');
}

function cancelUpload() {
    pendingFiles = [];
    document.getElementById('upload-preview').classList.add('hidden');
    document.getElementById('preview-thumbs').innerHTML = '';
    document.getElementById('file-input').value = '';
}

function submitUpload() {
    if (!pendingFiles.length) {
        alert('לא נבחרו קבצים');
        return;
    }
    if (!APPS_SCRIPT_URL) {
        alert('שגיאת הגדרה: לא הוגדר Apps Script URL ב-config.js');
        return;
    }
    var description = '';
    var status = document.getElementById('gallery-status');
    var total = pendingFiles.length;
    var uploaded = 0;
    var failed = 0;
    var btn = document.getElementById('upload-submit-btn');
    btn.disabled = true;
    btn.textContent = 'מעלה...';
    console.log('[Upload] starting upload of ' + total + ' file(s)');

    pendingFiles.forEach(function(file) {
        uploadToGDrive(file, description, function(ok) {
            if (ok) uploaded++; else failed++;
            var done = uploaded + failed;
            status.textContent = 'הועלו ' + uploaded + ' מתוך ' + total + (failed ? ' (' + failed + ' נכשלו)' : '');
            if (done === total) {
                console.log('[Upload] finished. success=' + uploaded + ' failed=' + failed);
                if (failed === 0) {
                    alert('הועלו ' + uploaded + ' תמונות בהצלחה!');
                } else {
                    alert('הועלו ' + uploaded + ' תמונות, ' + failed + ' נכשלו. בדוק את הקונסול (F12) לפרטים.');
                }
                setTimeout(function() {
                    status.textContent = '';
                    cancelUpload();
                    btn.disabled = false;
                    btn.textContent = 'העלה';
                    allPhotos = STATIC_PHOTOS.slice();
                    loadDrivePhotos();
                }, 500);
            }
        });
    });
}

function uploadToGDrive(file, description, onDone) {
    if (file.size > 50 * 1024 * 1024) {
        alert('הקובץ "' + file.name + '" גדול מדי (מקסימום 50MB)');
        onDone(false);
        return;
    }
    var status = document.getElementById('gallery-status');
    status.textContent = 'קורא קובץ ' + file.name + '...';
    console.log('[Upload] reading file:', file.name, file.size + ' bytes');

    var reader = new FileReader();
    reader.onload = function() {
        status.textContent = 'מעלה ל-Google Drive...';
        console.log('[Upload] sending to Apps Script:', file.name);
        fetch(APPS_SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify({
                file: reader.result.split(',')[1],
                fileName: file.name,
                mimeType: file.type,
                description: description
            })
        })
        .then(function(r) { return r.json(); })
        .then(function(data) {
            if (data.success) {
                console.log('[Upload] OK:', file.name, '→', data.fileId);
                onDone(true);
            } else {
                console.error('[Upload] FAILED:', file.name, data.error);
                alert('שגיאה בהעלאת ' + file.name + ': ' + (data.error || 'לא ידוע'));
                onDone(false);
            }
        })
        .catch(function(err) {
            console.error('[Upload] network error:', file.name, err);
            alert('שגיאת רשת ב-' + file.name + ': ' + err.message);
            onDone(false);
        });
    };
    reader.onerror = function() {
        console.error('[Upload] reader error:', file.name);
        alert('שגיאה בקריאת ' + file.name);
        onDone(false);
    };
    reader.readAsDataURL(file);
}

// ==================== LIGHTBOX WITH NAVIGATION ====================

var currentLbIndex = -1;
var lbFilteredPhotos = [];
var touchStartX = 0;

function getFilteredPhotos() {
    return allPhotos.filter(function(p) {
        if (activePersonFilter) return p.people && p.people.indexOf(activePersonFilter) !== -1;
        if (activeFilter === 'הכל') return true;
        if (activeFilter === 'ללא תיוג') return !p.people || p.people.length === 0;
        return p.category === activeFilter;
    });
}

function openMediaByIndex(idx) {
    lbFilteredPhotos = getFilteredPhotos();
    if (idx < 0 || idx >= lbFilteredPhotos.length) return;
    currentLbIndex = idx;
    var photo = lbFilteredPhotos[idx];

    if (photo.isVideo) {
        openDriveVideo(photo.fileId, photo.description);
        return;
    }

    var src = photo.fullSrc || photo.src;
    var fileId = photo.fileId || photo.src;
    openMedia(src, 'image', fileId, photo.description);
}

function openMedia(src, type, fileId, currentDesc) {
    closeLightbox();
    var overlay = document.createElement('div');
    overlay.className = 'media-lightbox';
    overlay.id = 'active-lightbox';

    var descText = currentDesc || '';
    var descHtml = descText ? '<p class="lb-desc">' + descText + '</p>' : '<p class="lb-desc lb-empty">לחצו להוסיף תיאור</p>';
    var editBtn = fileId ? '<button class="lb-edit-btn" onclick="editDescription(\'' + fileId + '\')">ערוך תיאור</button>' : '';
    var tagBtn = fileId ? '<button class="lb-tag-btn" onclick="openTagPanel(\'' + fileId + '\')">תייג אנשים</button>' : '';
    var undoBtn = (fileId && lastDescriptions[fileId] !== undefined) ? '<button class="lb-undo-btn" onclick="undoDescription(\'' + fileId + '\')">החזר קודם</button>' : '';
    var taggedPeople = getTaggedPeople(fileId);
    var tagsHtml = taggedPeople.length > 0 ? '<div class="lb-tags">' + taggedPeople.map(function(p) { return '<span class="lb-person-tag">' + p + '</span>'; }).join('') + '</div>' : '';

    var hasNav = lbFilteredPhotos.length > 1;
    var prevBtn = hasNav ? '<div class="lb-nav lb-prev" onclick="navigateLb(-1)">&#8249;</div>' : '';
    var nextBtn = hasNav ? '<div class="lb-nav lb-next" onclick="navigateLb(1)">&#8250;</div>' : '';
    var counter = hasNav ? '<span class="lb-counter">' + (currentLbIndex + 1) + ' / ' + lbFilteredPhotos.length + '</span>' : '';

    overlay.innerHTML =
        '<div class="lb-close" onclick="closeLightbox()">✕</div>' +
        prevBtn + nextBtn +
        '<div class="lb-content">' +
            '<img src="' + src + '">' +
            '<div class="lb-bottom">' + counter + tagsHtml + descHtml + '<div class="lb-buttons">' + tagBtn + editBtn + undoBtn + '</div></div>' +
            '<div class="tag-panel hidden" id="tag-panel"></div>' +
        '</div>';

    document.body.appendChild(overlay);

    overlay.addEventListener('click', function(e) {
        if (e.target === overlay) closeLightbox();
    });

    overlay.addEventListener('touchstart', function(e) {
        touchStartX = e.touches[0].clientX;
    }, { passive: true });

    overlay.addEventListener('touchend', function(e) {
        var diff = touchStartX - e.changedTouches[0].clientX;
        if (Math.abs(diff) > 60) {
            navigateLb(diff > 0 ? 1 : -1);
        }
    });

    document.onkeydown = function(e) {
        if (e.key === 'ArrowLeft') navigateLb(1);
        if (e.key === 'ArrowRight') navigateLb(-1);
        if (e.key === 'Escape') closeLightbox();
    };
}

function openDriveVideo(fileId, currentDesc) {
    closeLightbox();
    var overlay = document.createElement('div');
    overlay.className = 'media-lightbox';
    overlay.id = 'active-lightbox';

    var hasNav = lbFilteredPhotos.length > 1;
    var prevBtn = hasNav ? '<div class="lb-nav lb-prev" onclick="navigateLb(-1)">&#8249;</div>' : '';
    var nextBtn = hasNav ? '<div class="lb-nav lb-next" onclick="navigateLb(1)">&#8250;</div>' : '';
    var counter = hasNav ? '<span class="lb-counter">' + (currentLbIndex + 1) + ' / ' + lbFilteredPhotos.length + '</span>' : '';
    var undoBtn2 = lastDescriptions[fileId] !== undefined ? '<button class="lb-undo-btn" onclick="undoDescription(\'' + fileId + '\')">החזר קודם</button>' : '';

    overlay.innerHTML =
        '<div class="lb-close" onclick="closeLightbox()">✕</div>' +
        prevBtn + nextBtn +
        '<div class="lb-content">' +
            '<iframe src="https://drive.google.com/file/d/' + fileId + '/preview" allowfullscreen></iframe>' +
            '<div class="lb-bottom">' + counter +
                (currentDesc ? '<p class="lb-desc">' + currentDesc + '</p>' : '') +
                '<div class="lb-buttons"><button class="lb-edit-btn" onclick="editDescription(\'' + fileId + '\')">ערוך תיאור</button>' + undoBtn2 + '</div>' +
            '</div>' +
        '</div>';

    document.body.appendChild(overlay);
    overlay.addEventListener('click', function(e) {
        if (e.target === overlay) closeLightbox();
    });
}

function navigateLb(dir) {
    var newIdx = currentLbIndex + dir;
    if (newIdx < 0) newIdx = lbFilteredPhotos.length - 1;
    if (newIdx >= lbFilteredPhotos.length) newIdx = 0;
    openMediaByIndex(newIdx);
}

function closeLightbox() {
    var lb = document.getElementById('active-lightbox');
    if (lb) lb.remove();
    document.onkeydown = null;
}

// ==================== PEOPLE TAGGING ====================

var FAMILY_GROUPS = SITE_CONFIG.familyGroups || [];
var currentTagFileId = null;
var currentTagged = [];

// "Help us tag" mode state
var helpTagQueue = [];     // array of fileIds to walk through
var helpTagIndex = 0;
var helpTagActive = false;

function startTaggingHelpMode() {
    var untagged = allPhotos.filter(function(p) {
        return !p.isStatic && p.fileId && (!p.people || p.people.length === 0);
    });
    if (untagged.length === 0) {
        alert('כל התמונות כבר מתויגות 🎉');
        return;
    }
    helpTagQueue = untagged.map(function(p) { return p.fileId; });
    helpTagIndex = 0;
    helpTagActive = true;
    openHelpTagPhoto();
}

function openHelpTagPhoto() {
    if (!helpTagActive || helpTagIndex >= helpTagQueue.length) {
        exitHelpTagMode(true);
        return;
    }
    var fileId = helpTagQueue[helpTagIndex];
    // Find the photo's index in the currently filtered view, or just open by fileId
    var idx = -1;
    for (var i = 0; i < allPhotos.length; i++) {
        if (allPhotos[i].fileId === fileId) { idx = i; break; }
    }
    if (idx === -1) { // photo gone — skip
        helpTagIndex++;
        openHelpTagPhoto();
        return;
    }
    // Set filter so the lightbox iteration matches our queue order
    activePersonFilter = null;
    activeFilter = 'הכל';
    lbFilteredPhotos = allPhotos.slice();
    var lbIdx = -1;
    for (var j = 0; j < lbFilteredPhotos.length; j++) {
        if (lbFilteredPhotos[j].fileId === fileId) { lbIdx = j; break; }
    }
    if (lbIdx === -1) { helpTagIndex++; openHelpTagPhoto(); return; }
    openMediaByIndex(lbIdx);
    // Open the tag panel automatically after the lightbox is created
    setTimeout(function() { openTagPanel(fileId); }, 50);
}

function exitHelpTagMode(showSummary) {
    var done = helpTagIndex;
    var total = helpTagQueue.length;
    helpTagActive = false;
    helpTagQueue = [];
    helpTagIndex = 0;
    closeTagPanel();
    closeLightbox();
    allPhotos = STATIC_PHOTOS.slice();
    if (APPS_SCRIPT_URL) loadDrivePhotos();
    else renderGallery();
    if (showSummary && total > 0) {
        setTimeout(function() {
            alert('סיימת לתייג ' + done + ' מתוך ' + total + ' תמונות. תודה!');
        }, 200);
    }
}

function getTaggedPeople(fileId) {
    var people = [];
    allPhotos.forEach(function(p) {
        if ((p.fileId === fileId || p.src === fileId) && p.people) people = p.people;
    });
    if (people.length === 0) {
        try {
            var saved = JSON.parse(localStorage.getItem('photoTags') || '{}');
            if (saved[fileId]) people = saved[fileId];
        } catch(e) {}
    }
    return people;
}

function openTagPanel(fileId) {
    currentTagFileId = fileId;
    currentTagged = getTaggedPeople(fileId).slice();

    var panel = document.getElementById('tag-panel');
    if (!panel) return;
    panel.classList.remove('hidden');

    var headerExtra = '';
    if (helpTagActive) {
        headerExtra = ' <span class="tag-help-progress">' + (helpTagIndex + 1) + ' / ' + helpTagQueue.length + '</span>';
    }
    var html = '<div class="tag-header"><h4>תייגו מי בתמונה' + headerExtra + '</h4></div>';
    html += '<div class="tag-groups">';

    FAMILY_GROUPS.forEach(function(group) {
        html += '<div class="tag-group">';
        html += '<p class="tag-group-label">' + group.label + '</p>';
        html += '<div class="tag-group-members">';
        group.members.forEach(function(name) {
            var isTagged = currentTagged.indexOf(name) !== -1;
            html += '<button class="tag-member-btn' + (isTagged ? ' tagged' : '') + '" onclick="toggleTag(this, \'' + name.replace(/'/g, "\\'") + '\')">' + name + '</button>';
        });
        html += '</div></div>';
    });

    html += '</div>';
    html += '<div class="tag-actions">';
    if (helpTagActive) {
        html += '<button class="tag-save-btn" onclick="saveTagging()">שמור והבא</button>';
        html += '<button class="tag-skip-btn" onclick="helpTagSkip()">דלג</button>';
        html += '<button class="tag-cancel-btn" onclick="exitHelpTagMode(false)">סיום</button>';
    } else {
        html += '<button class="tag-save-btn" onclick="saveTagging()">שמור</button>';
        html += '<button class="tag-cancel-btn" onclick="closeTagPanel()">ביטול</button>';
    }
    html += '</div>';

    panel.innerHTML = html;
}

function helpTagSkip() {
    if (!helpTagActive) return;
    helpTagIndex++;
    closeTagPanel();
    closeLightbox();
    setTimeout(openHelpTagPhoto, 50);
}

function toggleTag(btn, name) {
    var idx = currentTagged.indexOf(name);
    if (idx !== -1) {
        currentTagged.splice(idx, 1);
        btn.classList.remove('tagged');
    } else {
        currentTagged.push(name);
        btn.classList.add('tagged');
    }
}

function closeTagPanel() {
    var panel = document.getElementById('tag-panel');
    if (panel) panel.classList.add('hidden');
    currentTagFileId = null;
    currentTagged = [];
}

function saveTagging() {
    if (!currentTagFileId) return;

    var btn = document.querySelector('.tag-save-btn');
    if (btn) { btn.textContent = 'שומר...'; btn.disabled = true; }

    var isDrive = false;
    allPhotos.forEach(function(p) {
        if (p.fileId === currentTagFileId && !p.isStatic) isDrive = true;
    });

    if (isDrive) {
        var desc = '';
        allPhotos.forEach(function(p) {
            if (p.fileId === currentTagFileId) desc = p.description || '';
        });
        desc = desc.replace(/\[אנשים:[^\]]*\]/g, '').trim();
        if (currentTagged.length > 0) {
            desc = desc + (desc ? ' ' : '') + '[אנשים:' + currentTagged.join(',') + ']';
        }

        fetch(APPS_SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify({ action: 'updateDesc', fileId: currentTagFileId, desc: desc, pass: SITE_CONFIG.password })
        })
        .then(function(r) { return r.json(); })
        .then(function(data) {
            if (data.success) {
                finishTagSave();
            } else {
                alert(data.error || 'שגיאה');
                if (btn) { btn.textContent = 'שמור'; btn.disabled = false; }
            }
        })
        .catch(function(err) {
            alert('שגיאה: ' + err.message);
            if (btn) { btn.textContent = 'שמור'; btn.disabled = false; }
        });
    } else {
        try {
            var saved = JSON.parse(localStorage.getItem('photoTags') || '{}');
            saved[currentTagFileId] = currentTagged.slice();
            localStorage.setItem('photoTags', JSON.stringify(saved));
        } catch(e) {}

        allPhotos.forEach(function(p) {
            if (p.src === currentTagFileId) p.people = currentTagged.slice();
        });
        STATIC_PHOTOS.forEach(function(p) {
            if (p.src === currentTagFileId) p.people = currentTagged.slice();
        });

        finishTagSave();
    }
}

function finishTagSave() {
    if (helpTagActive) {
        // Optimistically update the photo's people in our local cache so the
        // queue advance doesn't need a roundtrip to Drive.
        var savedFileId = currentTagFileId;
        var savedTags = currentTagged.slice();
        allPhotos.forEach(function(p) {
            if (p.fileId === savedFileId) p.people = savedTags;
        });
        helpTagIndex++;
        closeTagPanel();
        closeLightbox();
        setTimeout(openHelpTagPhoto, 50);
        return;
    }
    closeTagPanel();
    closeLightbox();
    allPhotos = STATIC_PHOTOS.slice();
    if (APPS_SCRIPT_URL) loadDrivePhotos();
    else renderGallery();
}

// ==================== DESCRIPTION EDITING ====================

var lastDescriptions = {};

function editDescription(fileId) {
    var currentDesc = '';
    allPhotos.forEach(function(p) {
        if (p.fileId === fileId) currentDesc = p.description || '';
    });

    var newDesc = prompt('תיאור התמונה (מקום, תאריך, אירוע):', currentDesc);
    if (newDesc === null || newDesc === currentDesc) return;

    lastDescriptions[fileId] = currentDesc;

    fetch(APPS_SCRIPT_URL, {
        method: 'POST',
        body: JSON.stringify({ action: 'updateDesc', fileId: fileId, desc: newDesc, pass: SITE_CONFIG.password })
    })
    .then(function(r) { return r.json(); })
    .then(function(data) {
        if (data.success) {
            closeLightbox();
            allPhotos = STATIC_PHOTOS.slice();
            loadDrivePhotos();
        } else {
            alert(data.error || 'שגיאה');
        }
    })
    .catch(function(err) { alert('שגיאה: ' + err.message); });
}

function undoDescription(fileId) {
    var prevDesc = lastDescriptions[fileId];
    if (prevDesc === undefined) {
        alert('אין תיאור קודם להחזרה');
        return;
    }

    fetch(APPS_SCRIPT_URL, {
        method: 'POST',
        body: JSON.stringify({ action: 'updateDesc', fileId: fileId, desc: prevDesc, pass: SITE_CONFIG.password })
    })
    .then(function(r) { return r.json(); })
    .then(function(data) {
        if (data.success) {
            delete lastDescriptions[fileId];
            closeLightbox();
            allPhotos = STATIC_PHOTOS.slice();
            loadDrivePhotos();
        } else {
            alert(data.error || 'שגיאה');
        }
    })
    .catch(function(err) { alert('שגיאה: ' + err.message); });
}

// ==================== CONTEXT MENU ====================
var ctxTarget = null;

function showCtxMenu(e, el) {
    ctxTarget = el;
    var menu = document.getElementById('photo-context-menu');
    menu.dataset.isStatic = '';
    menu.classList.remove('hidden');
    var x = e.clientX || (e.touches && e.touches[0].clientX) || 100;
    var y = e.clientY || (e.touches && e.touches[0].clientY) || 100;
    menu.style.left = Math.min(x, window.innerWidth - 180) + 'px';
    menu.style.top = Math.min(y, window.innerHeight - 150) + 'px';
}

function closeCtxMenu() {
    document.getElementById('photo-context-menu').classList.add('hidden');
    ctxTarget = null;
}

function ctxDownload() {
    var menu = document.getElementById('photo-context-menu');
    var url = menu.dataset.isStatic === 'true' ? menu.dataset.imgSrc : (ctxTarget ? ctxTarget.dataset.url : '');
    if (url) {
        var a = document.createElement('a');
        a.href = url; a.download = 'photo'; a.target = '_blank';
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
    }
    closeCtxMenu();
}

function ctxDelete() {
    var menu = document.getElementById('photo-context-menu');
    if (menu.dataset.isStatic === 'true') {
        alert('לא ניתן למחוק תמונות קבועות');
        closeCtxMenu();
        return;
    }
    if (!ctxTarget) { closeCtxMenu(); return; }
    var pass = prompt('הזן סיסמה למחיקה:');
    if (pass !== SITE_CONFIG.password) {
        if (pass !== null) alert('סיסמה שגויה');
        closeCtxMenu();
        return;
    }
    fetch(APPS_SCRIPT_URL + '?action=delete&fileId=' + ctxTarget.dataset.fileId + '&pass=' + pass)
        .then(function(r) { return r.json(); })
        .then(function(data) {
            if (data.success) { allPhotos = STATIC_PHOTOS.slice(); loadDrivePhotos(); }
            else alert(data.error || 'שגיאה');
            closeCtxMenu();
        })
        .catch(function(err) { alert('שגיאה: ' + err.message); closeCtxMenu(); });
}

document.addEventListener('click', function(e) {
    var menu = document.getElementById('photo-context-menu');
    if (menu && !menu.contains(e.target)) menu.classList.add('hidden');
});

// ==================== DUPLICATE DETECTION ====================

function initDuplicateScanner() {
    var btn = document.getElementById('scan-duplicates-btn');
    if (btn) btn.addEventListener('click', scanForDuplicates);
}

function scanForDuplicates() {
    var btn = document.getElementById('scan-duplicates-btn');
    var status = document.getElementById('dup-status');
    var results = document.getElementById('duplicates-results');

    var drivePhotos = allPhotos.filter(function(p) { return !p.isStatic && p.fileId && !p.isVideo; });

    if (drivePhotos.length < 2) {
        status.textContent = 'צריך לפחות 2 תמונות מ-Drive כדי לסרוק';
        return;
    }

    btn.disabled = true;
    btn.textContent = 'סורק...';
    status.textContent = 'טוען תמונות להשוואה... 0/' + drivePhotos.length;
    results.innerHTML = '';

    var fingerprints = [];
    var loaded = 0;

    drivePhotos.forEach(function(photo, idx) {
        var img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = function() {
            var fp = getImageFingerprint(img);
            fingerprints.push({ photo: photo, fingerprint: fp, index: idx });
            loaded++;
            status.textContent = 'טוען תמונות להשוואה... ' + loaded + '/' + drivePhotos.length;
            if (loaded === drivePhotos.length) findDuplicates(fingerprints, results, status, btn);
        };
        img.onerror = function() {
            loaded++;
            status.textContent = 'טוען תמונות להשוואה... ' + loaded + '/' + drivePhotos.length;
            if (loaded === drivePhotos.length) findDuplicates(fingerprints, results, status, btn);
        };
        img.src = photo.src;
    });
}

function getImageFingerprint(img) {
    var canvas = document.createElement('canvas');
    var size = 16;
    canvas.width = size;
    canvas.height = size;
    var ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, size, size);
    try {
        var data = ctx.getImageData(0, 0, size, size).data;
        var grays = [];
        for (var i = 0; i < data.length; i += 4) {
            grays.push(Math.round(data[i] * 0.299 + data[i+1] * 0.587 + data[i+2] * 0.114));
        }
        return grays;
    } catch(e) { return null; }
}

function compareFingerprints(fp1, fp2) {
    if (!fp1 || !fp2 || fp1.length !== fp2.length) return 0;
    var totalDiff = 0;
    for (var i = 0; i < fp1.length; i++) totalDiff += Math.abs(fp1[i] - fp2[i]);
    return 1 - (totalDiff / (255 * fp1.length));
}

function findDuplicates(fingerprints, resultsEl, statusEl, btn) {
    var pairs = [];
    var threshold = 0.92;

    for (var i = 0; i < fingerprints.length; i++) {
        for (var j = i + 1; j < fingerprints.length; j++) {
            var similarity = compareFingerprints(fingerprints[i].fingerprint, fingerprints[j].fingerprint);
            var nameSim = fileNameSimilarity(fingerprints[i].photo, fingerprints[j].photo);

            if (similarity >= threshold || nameSim >= 0.85) {
                pairs.push({
                    a: fingerprints[i].photo,
                    b: fingerprints[j].photo,
                    similarity: Math.max(similarity, nameSim),
                    type: similarity >= threshold ? 'visual' : 'name'
                });
            }
        }
    }

    btn.disabled = false;
    btn.textContent = 'סרוק כפולות';

    if (pairs.length === 0) {
        statusEl.textContent = 'לא נמצאו תמונות כפולות!';
        resultsEl.innerHTML = '<p class="info-text">נסרקו ' + fingerprints.length + ' תמונות - הכל נקי</p>';
        return;
    }

    pairs.sort(function(a, b) { return b.similarity - a.similarity; });
    statusEl.textContent = 'נמצאו ' + pairs.length + ' זוגות חשודים';
    resultsEl.innerHTML = '';

    pairs.forEach(function(pair, idx) {
        var pct = Math.round(pair.similarity * 100);
        var div = document.createElement('div');
        div.className = 'dup-pair';
        div.innerHTML =
            '<div class="dup-pair-header"><span class="dup-similarity">' + pct + '% דמיון' + (pair.type === 'name' ? ' (שם קובץ)' : '') + '</span></div>' +
            '<div class="dup-pair-photos">' +
                '<div class="dup-photo"><img src="' + pair.a.src + '" alt=""><p class="dup-desc">' + (pair.a.description || 'ללא תיאור') + '</p><button class="dup-delete-btn" onclick="deleteDuplicate(\'' + pair.a.fileId + '\', this)">מחק תמונה זו</button></div>' +
                '<div class="dup-photo"><img src="' + pair.b.src + '" alt=""><p class="dup-desc">' + (pair.b.description || 'ללא תיאור') + '</p><button class="dup-delete-btn" onclick="deleteDuplicate(\'' + pair.b.fileId + '\', this)">מחק תמונה זו</button></div>' +
            '</div>';
        resultsEl.appendChild(div);
    });
}

function fileNameSimilarity(photoA, photoB) {
    var nameA = photoA.name || '';
    var nameB = photoB.name || '';
    if (!nameA || !nameB) return 0;

    nameA = nameA.replace(/\.[^.]+$/, '').replace(/[\s_-]+/g, '').toLowerCase();
    nameB = nameB.replace(/\.[^.]+$/, '').replace(/[\s_-]+/g, '').toLowerCase();

    if (nameA === nameB) return 1;
    var cleanA = nameA.replace(/\(\d+\)$/, '');
    var cleanB = nameB.replace(/\(\d+\)$/, '');
    if (cleanA === cleanB) return 0.95;
    return 0;
}

function deleteDuplicate(fileId, btnEl) {
    if (!confirm('למחוק את התמונה הזו?')) return;

    btnEl.disabled = true;
    btnEl.textContent = 'מוחק...';

    fetch(APPS_SCRIPT_URL + '?action=delete&fileId=' + fileId + '&pass=' + SITE_CONFIG.password)
        .then(function(r) { return r.json(); })
        .then(function(data) {
            if (data.success) {
                var photoDiv = btnEl.parentElement;
                photoDiv.classList.add('dup-deleted');
                btnEl.textContent = 'נמחקה';
                btnEl.disabled = true;
                allPhotos = STATIC_PHOTOS.slice();
                loadDrivePhotos();
            } else {
                alert(data.error || 'שגיאה במחיקה');
                btnEl.disabled = false;
                btnEl.textContent = 'מחק תמונה זו';
            }
        })
        .catch(function(err) {
            alert('שגיאה: ' + err.message);
            btnEl.disabled = false;
            btnEl.textContent = 'מחק תמונה זו';
        });
}
