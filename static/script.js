// ══════════════════════════════════════════════════════
// ELEMENTS
// ══════════════════════════════════════════════════════
const landingPage       = document.getElementById('landingPage');
const loginModal        = document.getElementById('loginModal');
const foundReportPage   = document.getElementById('foundReportPage');
const mapPage           = document.getElementById('mapPage');
const notificationsPage = document.getElementById('notificationsPage');
const adminDashboard    = document.getElementById('adminDashboard');
const publicDashboard   = document.getElementById('publicDashboard');
const registerInmatePage= document.getElementById('registerInmatePage');
const reportLostPage    = document.getElementById('reportLostPage');
const chatBubble        = document.getElementById('chatBubble');

let currentUserRole = "";

// ══════════════════════════════════════════════════════
// ADMIN TABLE DATA & STATE
// In production, replace this array with data fetched
// from your backend / connect.js database calls.
// ══════════════════════════════════════════════════════
var adminReports = [
    { id:1, name:'Muhammad Arif',  age:45, gender:'Male',   loc:'Lahore Railway Station',       date:'2024-11-02', status:'Missing',    photo:null },
    { id:2, name:'Zainab Bibi',    age:62, gender:'Female', loc:'Karachi Bus Terminal, Saddar', date:'2024-10-28', status:'Found',      photo:null },
    { id:3, name:'Rahul Kumar',    age:17, gender:'Male',   loc:'Rawalpindi GT Road, Faizabad', date:'2024-12-05', status:'Processing', photo:null },
    { id:4, name:'Amna Khatoon',   age:35, gender:'Female', loc:'Peshawar Saddar Bazaar',       date:'2024-12-10', status:'Missing',    photo:null },
    { id:5, name:'Bashir Ahmed',   age:70, gender:'Male',   loc:'Multan Chungi No. 9',          date:'2024-12-12', status:'Missing',    photo:null },
];

// ── Render the enhanced admin reports table ──────────
function renderAdminTable() {
    var q  = (document.getElementById('admin-srch') ? document.getElementById('admin-srch').value.toLowerCase() : '');
    var fs = (document.getElementById('admin-filt') ? document.getElementById('admin-filt').value : '');
    var data = adminReports.slice();

    if (fs) data = data.filter(function(r){ return r.status === fs; });
    if (q)  data = data.filter(function(r){ return r.name.toLowerCase().indexOf(q) !== -1; });

    // Update stats counters
    var statTotal = document.getElementById('stat-total');
    var statFound = document.getElementById('stat-found');
    if (statTotal) statTotal.textContent = adminReports.length;
    if (statFound) statFound.textContent = adminReports.filter(function(r){ return r.status === 'Found'; }).length;

    var tb = document.getElementById('admin-tbl-body');
    if (!tb) return;

    if (!data.length) {
        tb.innerHTML = '<tr><td colspan="6"><div class="ar-empty"><i class="fas fa-search"></i><h3>No records found</h3><p>Adjust your search or filter.</p></div></td></tr>';
        return;
    }

    tb.innerHTML = data.map(function(r) {
        var statusKey   = r.status.toLowerCase();
        var avatarHtml  = r.photo
            ? '<img src="' + r.photo + '" alt="' + r.name + '"/>'
            : '<i class="fas fa-user"></i>';

        var foundBtn = (r.status !== 'Found')
            ? '<button class="ar-btn ar-found-btn" onclick="markAdminFound(' + r.id + ')">✅ Found</button>'
            : '';

        return '<tr>' +
            '<td><div class="apc">' +
                '<div class="apc-ava">' + avatarHtml + '</div>' +
                '<div>' +
                    '<div class="apc-name">' + r.name + '</div>' +
                    '<div class="apc-sub">ID #' + r.id + ' · ' + r.date + '</div>' +
                '</div>' +
            '</div></td>' +
            '<td><strong>' + r.age + '</strong> · ' + r.gender + '</td>' +
            '<td style="max-width:160px;font-size:12.5px;line-height:1.4">' + (r.loc || '—') + '</td>' +
            '<td style="font-size:12.5px">' + r.date + '</td>' +
            '<td><span class="ar-badge ar-' + statusKey + '"><span class="ar-dot"></span>' + r.status + '</span></td>' +
            '<td><div class="ar-acts">' +
                '<button class="ar-btn" onclick="viewAdminDetail(' + r.id + ')">View</button>' +
                '<button class="ar-btn ar-ai" onclick="runAdminRecog(' + r.id + ')">🤖 Recognition</button>' +
                foundBtn +
            '</div></td>' +
        '</tr>';
    }).join('');
}

// Mark a person as Found directly from the table
function markAdminFound(id) {
    var r = adminReports.find(function(x){ return x.id === id; });
    if (r) {
        r.status = 'Found';
        renderAdminTable();
    }
}

// Simple detail alert — replace with a proper modal if desired
function viewAdminDetail(id) {
    var r = adminReports.find(function(x){ return x.id === id; });
    if (!r) return;
    alert(
        'Name: '   + r.name   + '\n' +
        'Age: '    + r.age    + '  ·  Gender: ' + r.gender + '\n' +
        'Last Seen: ' + r.loc + '\n' +
        'Date Reported: ' + r.date + '\n' +
        'Status: ' + r.status
    );
}

// Trigger AI recognition simulation for a record
// ══════════════════════════════════════════════════════
// AI FACE RECOGNITION  –  wired to Flask /recognize API
// ══════════════════════════════════════════════════════

// Base URL of the Flask / Gunicorn backend.
// In production set this to your deployed domain, e.g.:
//   const API_BASE = "https://your-server.com";
const API_BASE = "";

var _recogTargetId = null;

function runAdminRecog(id) {
    var r = adminReports.find(function(x){ return x.id === id; });
    if (!r) return;
    _recogTargetId = id;

    // If a photo was uploaded with this report → use it directly
    if (r.photo) {
        _showRecogModal(r.name, r.photo);
    } else {
        // No photo stored → open manual camera/upload modal
        _showRecogModal(r.name, null);
    }
}

/* ─────────────────────────────────────────────────────
   Build & show the recognition modal.
   If photoDataURL is provided, skip the upload step and
   show the photo + a "Run Recognition" button immediately.
───────────────────────────────────────────────────── */
function _showRecogModal(name, photoDataURL) {
    var old = document.getElementById('recogModal');
    if (old) old.remove();

    var modal = document.createElement('div');
    modal.id = 'recogModal';
    modal.style.cssText = [
        'position:fixed;inset:0;background:rgba(0,0,0,.65);',
        'display:flex;align-items:center;justify-content:center;z-index:9999;',
        'padding:16px;'
    ].join('');

    var photoSection = '';
    var actionButtons = '';

    if (photoDataURL) {
        // Photo already available – show it and offer one-click recognition
        photoSection = [
            '<div style="margin-bottom:18px;">',
            '<p style="color:#64748b;font-size:.85rem;margin:0 0 10px;">Photo from submitted report:</p>',
            '<img src="' + photoDataURL + '" style="max-width:180px;max-height:180px;',
            'border-radius:10px;object-fit:cover;border:3px solid #3b82f6;',
            'box-shadow:0 4px 12px rgba(0,0,0,.2);"/>',
            '</div>'
        ].join('');

        actionButtons = [
            '<button onclick="autoRecognize()" ',
            'style="padding:11px 28px;background:#3b82f6;color:#fff;border:none;',
            'border-radius:8px;font-size:.95rem;cursor:pointer;font-weight:600;">',
            '🔍 Run Face Recognition</button>',
            '<button onclick="closeRecogModal()" ',
            'style="padding:11px 22px;background:#f1f5f9;color:#334155;border:none;',
            'border-radius:8px;font-size:.9rem;cursor:pointer;">Cancel</button>'
        ].join('');
    } else {
        // No photo – show camera / upload options
        photoSection = [
            '<video id="recogVideo" autoplay playsinline muted ',
            'style="width:100%;max-height:240px;border-radius:10px;background:#000;display:none;margin-bottom:12px;"></video>',
            '<canvas id="recogCanvas" style="display:none;"></canvas>',
            '<div class="recog-upload-area" id="recogUploadArea" ',
            'onclick="document.getElementById(\'recogFileInput\').click()" ',
            'style="border:2px dashed #cbd5e1;border-radius:10px;padding:28px 16px;',
            'margin-bottom:18px;cursor:pointer;color:#64748b;font-size:.9rem;">',
            '<div style="font-size:2.5rem;margin-bottom:8px;">📷</div>',
            '<div>Click to upload a photo<br><small>or use the camera below</small></div>',
            '<input type="file" id="recogFileInput" accept="image/*" style="display:none;" ',
            'onchange="handleRecogFileSelect(event)">',
            '</div>'
        ].join('');

        actionButtons = [
            '<button id="recogCamBtn" onclick="startRecogCamera()" ',
            'style="padding:10px 20px;background:#3b82f6;color:#fff;border:none;',
            'border-radius:8px;font-size:.9rem;cursor:pointer;">📹 Camera</button>',
            '<button id="recogScanBtn" onclick="captureAndRecognize()" ',
            'style="padding:10px 20px;background:#22c55e;color:#fff;border:none;',
            'border-radius:8px;font-size:.9rem;cursor:pointer;display:none;">🔍 Scan</button>',
            '<button onclick="closeRecogModal()" ',
            'style="padding:10px 20px;background:#f1f5f9;color:#334155;border:none;',
            'border-radius:8px;font-size:.9rem;cursor:pointer;">Cancel</button>'
        ].join('');
    }

    modal.innerHTML = [
        '<div style="background:#fff;border-radius:16px;padding:28px 24px;max-width:460px;',
        'width:100%;box-shadow:0 20px 60px rgba(0,0,0,.3);text-align:center;font-family:inherit;">',
        '<h2 style="margin:0 0 4px;font-size:1.25rem;">🤖 AI Face Recognition</h2>',
        '<p style="color:#64748b;margin:0 0 18px;font-size:.87rem;">',
        'Person: <strong>' + name + '</strong></p>',
        photoSection,
        '<div id="recogResult" style="display:none;margin-bottom:16px;text-align:left;"></div>',
        '<div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap;">',
        actionButtons,
        '</div></div>'
    ].join('');

    document.body.appendChild(modal);

    // If photo is available, store it so autoRecognize() can use it
    if (photoDataURL) {
        modal._photoDataURL = photoDataURL;
    }
}

/* Called when the report already has a photo – run recognition immediately */
function autoRecognize() {
    var modal = document.getElementById('recogModal');
    if (!modal || !modal._photoDataURL) return;
    _sendToRecognize(modal._photoDataURL);
}

/* ── Camera helpers ── */
var _recogStream = null;

function startRecogCamera() {
    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false })
        .then(function(stream) {
            _recogStream = stream;
            var video  = document.getElementById('recogVideo');
            var camBtn = document.getElementById('recogCamBtn');
            var scanBtn= document.getElementById('recogScanBtn');
            var area   = document.getElementById('recogUploadArea');
            video.srcObject = stream;
            video.style.display  = 'block';
            area.style.display   = 'none';
            camBtn.style.display = 'none';
            scanBtn.style.display= 'inline-block';
        })
        .catch(function(err) {
            alert('Camera not available: ' + err.message + '\nPlease upload a photo instead.');
        });
}

function captureAndRecognize() {
    var video  = document.getElementById('recogVideo');
    var canvas = document.getElementById('recogCanvas');
    canvas.width  = video.videoWidth  || 640;
    canvas.height = video.videoHeight || 480;
    canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
    _sendToRecognize(canvas.toDataURL('image/jpeg', 0.9));
}

function handleRecogFileSelect(event) {
    var file = event.target.files[0];
    if (!file) return;

    // Show a thumbnail preview in the upload area
    var area = document.getElementById('recogUploadArea');
    var reader = new FileReader();
    reader.onload = function(e) {
        if (area) {
            area.innerHTML = [
                '<img src="' + e.target.result + '" style="max-width:140px;max-height:140px;',
                'border-radius:10px;object-fit:cover;border:3px solid #22c55e;"/>',
                '<p style="margin:8px 0 0;font-size:.85rem;color:#22c55e;">Photo selected ✓</p>'
            ].join('');
        }
        // Auto-run recognition as soon as user picks the file
        _sendToRecognize(e.target.result);
    };
    reader.readAsDataURL(file);
}

/* ── Core: POST image to /recognize ── */
function _sendToRecognize(dataURL) {
    var resultDiv = document.getElementById('recogResult');
    if (!resultDiv) return;
    resultDiv.style.display = 'block';
    resultDiv.innerHTML = [
        '<div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;',
        'padding:14px;color:#3b82f6;font-size:.9rem;text-align:center;">',
        '⏳ Analyzing… this may take a moment on first run',
        '</div>'
    ].join('');

    // Disable action buttons while processing
    var modal = document.getElementById('recogModal');
    if (modal) {
        modal.querySelectorAll('button').forEach(function(b){
            if (b.textContent.indexOf('Cancel') === -1) b.disabled = true;
        });
    }

    var r = adminReports.find(function(x){ return x.id === _recogTargetId; });
    if (r) { r.status = 'Processing'; renderAdminTable(); }

    fetch(API_BASE + '/recognize', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ image: dataURL })
    })
    .then(function(res) { return res.json(); })
    .then(function(data) {
        if (data.error) {
            resultDiv.innerHTML = [
                '<div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;',
                'padding:14px;color:#dc2626;font-size:.9rem;">',
                '❌ Error: ' + data.error + '</div>'
            ].join('');
            if (r && r.status === 'Processing') { r.status = 'Missing'; renderAdminTable(); }
            return;
        }

        if (data.match) {
            resultDiv.innerHTML = [
                '<div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:16px;">',
                '<div style="color:#16a34a;font-size:1.05rem;font-weight:700;margin-bottom:10px;">✅ Match Found!</div>',
                '<table style="width:100%;font-size:.88rem;color:#334155;border-collapse:collapse;">',
                '<tr><td style="padding:3px 0;color:#64748b;">Name</td>',
                '<td style="font-weight:600;">' + (data.person_name || '—') + '</td></tr>',
                '<tr><td style="padding:3px 0;color:#64748b;">Inmate ID</td>',
                '<td style="font-weight:600;">' + (data.person_id  || '—') + '</td></tr>',
                '<tr><td style="padding:3px 0;color:#64748b;">Confidence</td>',
                '<td><span style="background:#dcfce7;color:#16a34a;padding:2px 10px;border-radius:20px;font-weight:700;">' + data.confidence + '%</span></td></tr>',
                '</table></div>'
            ].join('');
            if (r) { r.status = 'Found'; renderAdminTable(); }
            showToast('✅ Match: ' + data.person_name + ' (' + data.confidence + '%)');
        } else {
            var msg = data.message || 'No match found in shelter database';
            resultDiv.innerHTML = [
                '<div style="background:#fef2f2;border:1px solid #fecaca;border-radius:10px;padding:16px;">',
                '<div style="color:#dc2626;font-size:1.05rem;font-weight:700;margin-bottom:8px;">❌ No Match Found</div>',
                '<p style="color:#64748b;font-size:.88rem;margin:0;">' + msg + '</p>',
                (data.confidence ? '<p style="color:#94a3b8;font-size:.82rem;margin:6px 0 0;">Closest score: ' + data.confidence + '%</p>' : ''),
                '</div>'
            ].join('');
            if (r && r.status === 'Processing') { r.status = 'Missing'; renderAdminTable(); }
        }

        // Re-enable cancel button only
        if (modal) {
            modal.querySelectorAll('button').forEach(function(b){ b.disabled = false; });
        }
    })
    .catch(function(err) {
        resultDiv.innerHTML = [
            '<div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;',
            'padding:14px;font-size:.88rem;">',
            '❌ Network error: ' + err.message + '<br>',
            '<small style="color:#94a3b8;">Make sure the backend server is running.</small></div>'
        ].join('');
        if (r && r.status === 'Processing') { r.status = 'Missing'; renderAdminTable(); }
        if (modal) modal.querySelectorAll('button').forEach(function(b){ b.disabled = false; });
    });
}

function closeRecogModal() {
    if (_recogStream) {
        _recogStream.getTracks().forEach(function(t){ t.stop(); });
        _recogStream = null;
    }
    var modal = document.getElementById('recogModal');
    if (modal) modal.remove();
    _recogTargetId = null;
}

function showToast(msg) {
    var t = document.getElementById('notificationToast');
    if (!t) return;
    t.textContent   = msg;
    t.style.display = 'block';
    t.style.opacity = '1';
    setTimeout(function(){ t.style.opacity = '0'; }, 3500);
    setTimeout(function(){ t.style.display = 'none'; }, 4000);
}

// ══════════════════════════════════════════════════════
// AUTH
// ══════════════════════════════════════════════════════
function openLogin()  { loginModal.style.display = 'flex'; }
function closeLogin() { loginModal.style.display = 'none'; }

function handleLogin() {
    const email = document.getElementById('emailInput').value;
    const pass  = document.getElementById('passInput').value;
    const role  = document.getElementById('roleInput').value;

    if (email !== "" && pass !== "") {
        landingPage.style.display  = 'none';
        loginModal.style.display   = 'none';
        currentUserRole = role;
        showDashboard();
        window.scrollTo(0, 0);
    } else {
        alert("Please enter credentials");
    }
}

function logout() {
    const allPages = [
        'adminDashboard','publicDashboard','registerInmatePage',
        'reportLostPage','foundReportPage','mapPage','notificationsPage'
    ];
    allPages.forEach(function(pageId) {
        var page = document.getElementById(pageId);
        if (page) page.style.display = 'none';
    });
    if (chatBubble) chatBubble.style.display = 'none';
    currentUserRole = "";
    if (landingPage) landingPage.style.display = 'block';
    window.scrollTo(0, 0);
}

// Close modal on outside click
window.onclick = function(event) {
    if (event.target == loginModal) closeLogin();
};

// ══════════════════════════════════════════════════════
// NAVIGATION
// ══════════════════════════════════════════════════════
function hideAllPages() {
    var pages = [
        'adminDashboard','publicDashboard','reportLostPage',
        'registerInmatePage','foundReportPage','mapPage','notificationsPage'
    ];
    pages.forEach(function(id) {
        var el = document.getElementById(id);
        if (el) el.style.display = 'none';
    });
    var chat = document.getElementById('chatBubble');
    if (chat) chat.style.display = 'none';
}

function showDashboard() {
    hideAllPages();
    if (currentUserRole === "Public") {
        document.getElementById('publicDashboard').style.display = 'block';
        var cb = document.getElementById('chatBubble');
        if (cb) cb.style.display = 'flex';
    } else {
        document.getElementById('adminDashboard').style.display = 'block';
        // Render the enhanced admin table whenever the admin dashboard is shown
        renderAdminTable();
    }
}

function showReportForm() {
    hideAllPages();
    if (currentUserRole === "Public") {
        document.getElementById('reportLostPage').style.display = 'block';
    } else {
        document.getElementById('registerInmatePage').style.display = 'block';
    }
}

function showFoundReportForm() {
    var pages = [adminDashboard, publicDashboard, registerInmatePage, reportLostPage, mapPage];
    pages.forEach(function(p){ if (p) p.style.display = 'none'; });
    var fp = document.getElementById('foundReportPage');
    if (fp) fp.style.display = 'block';
    window.scrollTo(0, 0);
}

// ══════════════════════════════════════════════════════
// FORM SUBMISSIONS
// ══════════════════════════════════════════════════════
function submitAdminInmateReport() {
    const photoFiles = document.getElementById('adminPhotoInput').files;
    if (photoFiles.length === 0) {
        alert("Please upload at least one photo of the inmate for identification.");
        return;
    }
    const inmateData = {
        inmateId:       document.getElementById('admin-inmateId').value,
        registrationNo: document.getElementById('admin-regNo').value,
        uniqueId:       document.getElementById('admin-uniqueId').value,
        status:         document.getElementById('admin-status').value,
        fullName:       document.getElementById('admin-fullName').value,
        dob:            document.getElementById('admin-dob').value,
        gender:         document.getElementById('admin-gender').value,
        languages:      document.getElementById('admin-languages').value,
        address:        document.getElementById('admin-address').value,
        joiningDate:    document.getElementById('admin-joiningDate').value
    };
    if (!inmateData.inmateId || !inmateData.registrationNo || !inmateData.fullName) {
        alert("Please fill in the required fields (ID, Registration No, and Name).");
        return;
    }

    // Add to the admin table data so it appears immediately
    var dob = inmateData.dob || '';
    var age = '—';
    if (dob) {
        var birth = new Date(dob);
        age = Math.floor((new Date() - birth) / (365.25 * 24 * 60 * 60 * 1000));
    }
    adminReports.push({
        id:     adminReports.length + 1,
        name:   inmateData.fullName,
        age:    age,
        gender: inmateData.gender || 'Unknown',
        loc:    inmateData.address || '—',
        date:   new Date().toISOString().slice(0, 10),
        status: 'Missing',
        photo:  null
    });

    console.log("Admin Inmate Registration Data:", inmateData);
    alert("Inmate Registered Successfully!");
    showDashboard();
}

function submitPublicLostReport() {
    const photoInput = document.getElementById('publicPhotoInput');
    if (!photoInput.files || photoInput.files.length === 0) {
        alert("Please upload at least one photo of the lost person.");
        return;
    }

    const lostPersonData = {
        fullName:            document.getElementById('public-fullName').value,
        age:                 document.getElementById('public-age').value,
        gender:              document.getElementById('gender').value,
        languagespoken:      document.getElementById('language_spoken').value,
        lastSeenLocation:    document.getElementById('public-location').value,
        lastSeenDateTime:    document.getElementById('public-dateTime').value,
        clothingdescription: document.getElementById('clothing_description').value,
        generaldescription:  document.getElementById('general_description').value,
        familyName:          document.getElementById('public-familyName').value,
        familyPhone:         document.getElementById('public-familyPhone').value,
    };

    if (!lostPersonData.fullName || !lostPersonData.familyPhone) {
        alert("Please provide the missing person's name and a contact number.");
        return;
    }

    // Use the base64 stored by handleFileSelect (already read when file was chosen)
    var photoDataURL = photoInput._previewDataURL || null;

    // If somehow _previewDataURL isn't set yet, read it now and re-submit
    if (!photoDataURL && photoInput.files.length > 0) {
        var reader = new FileReader();
        reader.onload = function(e) {
            photoInput._previewDataURL = e.target.result;
            submitPublicLostReport();   // retry once base64 is ready
        };
        reader.readAsDataURL(photoInput.files[0]);
        return;
    }

    // Push report with photo into the shared adminReports array
    adminReports.push({
        id:     adminReports.length + 1,
        name:   lostPersonData.fullName,
        age:    lostPersonData.age    || '—',
        gender: lostPersonData.gender || 'Unknown',
        loc:    lostPersonData.lastSeenLocation || '—',
        date:   new Date().toISOString().slice(0, 10),
        status: 'Missing',
        photo:  photoDataURL,           // ← stored so admin table shows the face
        source: 'public'                // mark as public-submitted
    });

    // Reset form
    document.getElementById('publicLostForm').reset();
    photoInput._previewDataURL = null;
    var thumb = document.querySelector('#publicPhotoInput').closest('.upload-box').querySelector('.upload-thumb');
    if (thumb) thumb.remove();
    document.getElementById('uploadTextPublic').innerText = 'Click to upload photos';
    document.getElementById('uploadTextPublic').style.color = '';

    alert("Lost Person Report Submitted Successfully!\n\nThe admin will run AI face recognition on the uploaded photo.");
    showDashboard();
}

function submitFoundReport() {
    const foundFamilyData = {
        location:     document.getElementById('foundLocation').value,
        dateTime:     document.getElementById('foundDatetime').value,
        languages:    document.getElementById('found-languages').value,
        contactName:  document.getElementById('contact_name').value,
        contactPhone: document.getElementById('contact_phone').value
    };
    if (!foundFamilyData.location || !foundFamilyData.contactPhone) {
        alert("Please provide the family location and a contact phone number.");
        return;
    }
    console.log("Found Family Report Data:", foundFamilyData);
    alert("Found Family Report submitted successfully!");
    showDashboard();
}

// ══════════════════════════════════════════════════════
// FILE UPLOAD
// ══════════════════════════════════════════════════════
function triggerFileInput(role) {
    if (role === 'admin') {
        document.getElementById('adminPhotoInput').click();
    } else {
        document.getElementById('publicPhotoInput').click();
    }
}

function handleFileSelect(event) {
    const input      = event.target;
    const files      = input.files;
    const isAdmin    = input.id === 'adminPhotoInput';
    const uploadText = document.getElementById(isAdmin ? 'uploadTextAdmin' : 'uploadTextPublic');

    if (files.length === 0) {
        uploadText.innerText = "Click to upload photos";
        uploadText.style.color = "";
        input._previewDataURL = null;
        return;
    }

    uploadText.innerText   = files.length + ' photo(s) selected';
    uploadText.style.color = "#22c55e";

    // Read the first file as base64 — stored on the input element
    // so submitPublicLostReport() can grab it without a second FileReader
    var reader = new FileReader();
    reader.onload = function(e) {
        input._previewDataURL = e.target.result;

        // Show a thumbnail inside the upload box
        var uploadBox = input.closest('.upload-box') || input.parentElement;
        if (!uploadBox) return;

        var existing = uploadBox.querySelector('.upload-thumb');
        if (existing) existing.remove();

        var img = document.createElement('img');
        img.src       = e.target.result;
        img.className = 'upload-thumb';
        img.style.cssText = [
            'max-width:130px;max-height:130px;border-radius:10px;',
            'margin:10px auto 0;object-fit:cover;display:block;',
            'border:3px solid #22c55e;box-shadow:0 2px 8px rgba(0,0,0,.15);'
        ].join('');
        uploadBox.appendChild(img);
    };
    reader.readAsDataURL(files[0]);
}

// ══════════════════════════════════════════════════════
// LEAFLET MAP
// ══════════════════════════════════════════════════════
let map;
let mapInitialized = false;
let searchMarkers  = [];

const manualNGOs = [
    { name:"The Smile Foundation",            city:"Delhi",     lat:28.5397, lng:77.2110, address:"D-113, Sector 63, Noida, Uttar Pradesh 201301",                            phone:"+91-11-43123700" },
    { name:"Apna Ghar Organisation",          city:"Bharatpur", lat:27.2173, lng:77.4895, address:"Keshav Puram, Bharatpur, Rajasthan 321001",                                phone:"+91-5644-233456" },
    { name:"Akshaya Patra Foundation",        city:"Bengaluru", lat:13.0645, lng:77.5348, address:"The Akshaya Patra Building, Vasanthapura, Bengaluru, Karnataka 560062",   phone:"+91-80-30143400" },
    { name:"Goonj",                           city:"Delhi",     lat:28.5282, lng:77.2191, address:"L-58, Kalkaji, New Delhi, Delhi 110019",                                   phone:"+91-11-26232484" },
    { name:"MP Samaj Sewa Sansthan",          city:"Bhopal",    lat:23.2599, lng:77.4126, address:"E-5/127, Arera Colony, Bhopal, Madhya Pradesh 462016",                    phone:"+91-755-4203300" },
    { name:"Pratham Mumbai Education Initiative", city:"Mumbai",lat:19.0760, lng:72.8777, address:"Kasturbai Marg, Azad Maidan, Fort, Mumbai, Maharashtra 400001",          phone:"+91-22-66326565" },
    { name:"Magic Bus India Foundation",      city:"Mumbai",    lat:19.1136, lng:72.8697, address:"Gokuldham, Goregaon East, Mumbai, Maharashtra 400063",                     phone:"+91-22-28793200" },
    { name:"Hope Foundation",                 city:"Chennai",   lat:13.0827, lng:80.2707, address:"No.12, Chamiers Road, RA Puram, Chennai, Tamil Nadu 600028",              phone:"+91-44-24351777" },
    { name:"Isha Outreach",                   city:"Chennai",   lat:13.0475, lng:80.2145, address:"15, Govindan Road, West Mambalam, Chennai, Tamil Nadu 600033",            phone:"+91-44-42224000" },
];

function initMap() {
    map = L.map('map').setView([20.5937, 78.9629], 5);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors', maxZoom: 19
    }).addTo(map);
    mapInitialized = true;

    const orangeIcon = L.icon({
        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-orange.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
        iconSize:[25,41], iconAnchor:[12,41], popupAnchor:[1,-34], shadowSize:[41,41]
    });

    manualNGOs.forEach(function(ngo) {
        var marker = L.marker([ngo.lat, ngo.lng], { icon: orangeIcon }).addTo(map);
        marker.bindPopup(
            '<div style="min-width:200px;">' +
            '<strong style="font-size:14px;color:#f97316;">' + ngo.name + '</strong><br>' +
            '<p style="margin:8px 0;font-size:12px;line-height:1.4;">📍 ' + ngo.address + '</p>' +
            (ngo.phone ? '<p style="margin:4px 0;font-size:12px;">📞 ' + ngo.phone + '</p>' : '') +
            '</div>'
        );
    });
}

function showMap() {
    hideAllPages();
    mapPage.style.display = 'block';
    setTimeout(function() {
        if (!mapInitialized) { initMap(); }
        else { map.invalidateSize(); map.setView([20.5937, 78.9629], 5); }
    }, 300);
}

async function searchNearby() {
    if (!mapInitialized) { alert("Map not ready yet"); return; }
    const input = document.getElementById('mapSearchInput').value.trim();
    if (!input) { alert("Please enter a city name"); return; }

    searchMarkers.forEach(function(m){ map.removeLayer(m); });
    searchMarkers = [];

    try {
        const response = await fetch(
            'https://nominatim.openstreetmap.org/search?' +
            'q=' + encodeURIComponent(input + ' India') + '&format=json&limit=1&addressdetails=1'
        );
        const data = await response.json();
        if (data.length > 0) {
            map.setView([parseFloat(data[0].lat), parseFloat(data[0].lon)], 12);
            searchNGOsNearLocation(parseFloat(data[0].lat), parseFloat(data[0].lon), input);
        } else {
            alert('Location "' + input + '" not found. Please try another city name.');
        }
    } catch(error) {
        console.error('Search error:', error);
        alert('Error searching location. Please try again.');
    }
}

async function searchNGOsNearLocation(lat, lon, cityName) {
    try {
        const manualMatches = manualNGOs.filter(function(ngo){
            return ngo.city.toLowerCase().includes(cityName.toLowerCase()) ||
                   cityName.toLowerCase().includes(ngo.city.toLowerCase());
        });

        const redIcon = L.icon({
            iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
            shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
            iconSize:[25,41], iconAnchor:[12,41], popupAnchor:[1,-34], shadowSize:[41,41]
        });

        manualMatches.forEach(function(ngo) {
            var marker = L.marker([ngo.lat, ngo.lng], { icon: redIcon }).addTo(map);
            marker.bindPopup(
                '<div style="min-width:200px;">' +
                '<strong style="font-size:14px;color:#ef4444;">' + ngo.name + '</strong><br>' +
                '<p style="margin:4px 0;font-size:11px;color:#666;"><span style="background:#fee2e2;padding:2px 6px;border-radius:4px;">Featured NGO</span></p>' +
                '<p style="margin:8px 0;font-size:12px;line-height:1.4;">📍 ' + ngo.address + '</p>' +
                (ngo.phone ? '<p style="margin:4px 0;font-size:12px;">📞 ' + ngo.phone + '</p>' : '') +
                '</div>'
            );
            searchMarkers.push(marker);
        });

        const radius = 50000;
        const query = '[out:json][timeout:60];(' +
            'node["amenity"="social_facility"](around:' + radius + ',' + lat + ',' + lon + ');' +
            'way["amenity"="social_facility"](around:' + radius + ',' + lat + ',' + lon + ');' +
            'node["office"="ngo"](around:' + radius + ',' + lat + ',' + lon + ');' +
            'way["office"="ngo"](around:' + radius + ',' + lat + ',' + lon + ');' +
            'node["office"="charity"](around:' + radius + ',' + lat + ',' + lon + ');' +
            'way["office"="charity"](around:' + radius + ',' + lat + ',' + lon + ');' +
            ');out center;';

        const response = await fetch('https://overpass-api.de/api/interpreter', { method:'POST', body:query });
        const data = await response.json();
        let osmCount = 0;

        const greenIcon = L.icon({
            iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
            shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
            iconSize:[25,41], iconAnchor:[12,41], popupAnchor:[1,-34], shadowSize:[41,41]
        });

        if (data.elements && data.elements.length > 0) {
            data.elements.forEach(function(element) {
                var ngoLat = element.lat || (element.center && element.center.lat);
                var ngoLon = element.lon || (element.center && element.center.lon);
                if (ngoLat && ngoLon) {
                    var name    = element.tags.name || 'NGO/Social Organization';
                    var address = formatAddress(element.tags);
                    var phone   = element.tags.phone || element.tags['contact:phone'] || null;
                    var marker  = L.marker([ngoLat, ngoLon], { icon: greenIcon }).addTo(map);
                    marker.bindPopup(
                        '<div style="min-width:200px;">' +
                        '<strong style="font-size:14px;color:#22c55e;">' + name + '</strong>' +
                        (address ? '<p style="margin:8px 0;font-size:12px;line-height:1.4;">📍 ' + address + '</p>' : '') +
                        (phone   ? '<p style="margin:4px 0;font-size:12px;">📞 ' + phone + '</p>' : '') +
                        '</div>'
                    );
                    searchMarkers.push(marker);
                    osmCount++;
                }
            });
        }

        const totalCount = manualMatches.length + osmCount;
        if (totalCount > 0) {
            var msg = '✅ Found ' + totalCount + ' NGO(s) in ' + cityName + '!\n\n';
            if (manualMatches.length > 0) msg += '🔴 ' + manualMatches.length + ' Featured NGO(s) (red markers)\n';
            if (osmCount > 0)             msg += '🟢 ' + osmCount + ' OpenStreetMap NGO(s) (green markers)\n';
            msg += '\nClick on any marker to see full details.';
            alert(msg);
            if (searchMarkers.length > 0) searchMarkers[0].openPopup();
        } else {
            alert('ℹ️ No NGOs found in ' + cityName + '.\n\nTry searching nearby cities or check the orange markers on the map.');
        }
    } catch(error) {
        console.error('NGO search error:', error);
        alert('❌ Error searching for NGOs. Please try again in a moment.');
    }
}

function formatAddress(tags) {
    var parts = [];
    if (tags['addr:housenumber']) parts.push(tags['addr:housenumber']);
    if (tags['addr:street'])      parts.push(tags['addr:street']);
    if (tags['addr:suburb'])      parts.push(tags['addr:suburb']);
    if (tags['addr:city'])        parts.push(tags['addr:city']);
    if (tags['addr:state'])       parts.push(tags['addr:state']);
    if (tags['addr:postcode'])    parts.push(tags['addr:postcode']);
    return parts.length > 0 ? parts.join(', ') : null;
}

function handleMapNavigation() {
    if (landingPage)        landingPage.style.display        = 'none';
    if (loginModal)         loginModal.style.display         = 'none';
    if (adminDashboard)     adminDashboard.style.display     = 'none';
    if (publicDashboard)    publicDashboard.style.display    = 'none';
    if (foundReportPage)    foundReportPage.style.display    = 'none';
    if (notificationsPage)  notificationsPage.style.display  = 'none';
    mapPage.style.display = 'block';
    setTimeout(function() {
        if (!mapInitialized) { initMap(); }
        else { map.invalidateSize(); map.setView([20.5937, 78.9629], 5); }
    }, 300);
}

// ══════════════════════════════════════════════════════
// NOTIFICATIONS
// ══════════════════════════════════════════════════════
let notifications = [
    { id:1, type:'match',  title:'Potential Match Found',       message:'A person matching Rajesh Kumar\'s description has been identified at Shelter #4.',        time:'2 hours ago',  read:false, reportName:'Rajesh Kumar', phone:'+91 98765 43210' },
    { id:2, type:'update', title:'Report Status Updated',       message:'The missing person report for Priya Sharma has been updated to Processing status.',        time:'5 hours ago',  read:false, reportName:'Priya Sharma', phone:'+91 91234 56789' },
    { id:3, type:'match',  title:'Potential Match — Ramesh Kumar', message:'High-confidence facial recognition match found. Please review immediately.',            time:'1 day ago',    read:true,  reportName:'Ramesh Kumar', phone:'+91 99999 00000' },
    { id:4, type:'system', title:'System Update',               message:'The AI recognition engine has been updated to version 2.1 with improved accuracy.',         time:'2 days ago',   read:true,  reportName:'',             phone:'' },
];

function showNotifications() {
    hideAllPages();
    notificationsPage.style.display = 'block';
    renderNotifications();
    window.scrollTo(0, 0);
}

function renderNotifications(filter) {
    filter = filter || 'all';
    const list = document.getElementById('notificationsList');
    list.innerHTML = '';
    let filtered = filter === 'all' ? notifications : notifications.filter(function(n){ return n.type === filter; });

    if (!filtered.length) {
        list.innerHTML = '<div style="text-align:center;padding:60px 20px;color:#94a3b8;"><i class="fas fa-bell-slash" style="font-size:4rem;margin-bottom:20px;"></i><p style="font-size:1.2rem;">No notifications found</p></div>';
        return;
    }

    filtered.forEach(function(notif) {
        var card = document.createElement('div');
        card.className = 'notification-card ' + (notif.read ? '' : 'unread') + ' ' + notif.type + '-found';
        card.innerHTML =
            '<div style="display:flex;gap:15px;">' +
            '<div class="notification-icon ' + notif.type + '">' +
                '<i class="fas ' + (notif.type==='match'?'fa-check-circle':notif.type==='update'?'fa-info-circle':'fa-bell') + '"></i>' +
            '</div>' +
            '<div class="notification-content">' +
                '<div class="notification-header-row"><div>' +
                    '<div class="notification-title">' + notif.title + '</div>' +
                    '<div class="notification-message">' + notif.message + '</div>' +
                '</div></div>' +
                '<div class="notification-meta">' +
                    '<span><i class="far fa-clock"></i> ' + notif.time + '</span>' +
                    (notif.read
                        ? '<span style="color:#22c55e;"><i class="fas fa-check"></i> Read</span>'
                        : '<span style="color:#f97316;"><i class="fas fa-circle" style="font-size:6px;"></i> Unread</span>') +
                '</div>' +
                '<div class="notification-actions">' +
                    '<button class="notif-action-btn notif-view-btn" onclick="viewNotificationDetails(' + notif.id + ')"><i class="fas fa-eye"></i> View Details</button>' +
                    '<button class="notif-action-btn notif-dismiss-btn" onclick="dismissNotification(' + notif.id + ')"><i class="fas fa-times"></i> Dismiss</button>' +
                '</div>' +
            '</div></div>';
        list.appendChild(card);
    });
    updateNotificationBadge();
}

function filterNotifications(type) {
    document.querySelectorAll('.filter-btn').forEach(function(btn){ btn.classList.remove('active'); });
    event.target.classList.add('active');
    renderNotifications(type);
}

function markAllAsRead() {
    notifications.forEach(function(n){ n.read = true; });
    renderNotifications();
    updateNotificationBadge();
}

function viewNotificationDetails(id) {
    var notif = notifications.find(function(n){ return n.id === id; });
    if (notif) {
        notif.read = true;
        if (notif.phone) showSMSNotification(notif.reportName, notif.phone);
        renderNotifications();
    }
}

function dismissNotification(id) {
    notifications = notifications.filter(function(n){ return n.id !== id; });
    renderNotifications();
}

function updateNotificationBadge() {
    var unread = notifications.filter(function(n){ return !n.read; }).length;
    document.querySelectorAll('.notif-badge').forEach(function(badge){
        badge.textContent = unread > 0 ? unread : '0';
        badge.style.display = unread > 0 ? 'inline' : 'none';
    });
}

function showToast(title, message, type) {
    type = type || 'success';
    const container = document.getElementById('notificationToast');
    container.style.display = 'block';
    var toast = document.createElement('div');
    toast.className = 'toast-item';
    toast.innerHTML =
        '<div class="toast-icon"><i class="fas ' + (type==='success'?'fa-check-circle':'fa-info-circle') + '"></i></div>' +
        '<div class="toast-content"><div class="toast-title">' + title + '</div><div class="toast-message">' + message + '</div></div>' +
        '<button class="toast-close" onclick="this.parentElement.remove()"><i class="fas fa-times"></i></button>';
    container.appendChild(toast);
    setTimeout(function() {
        toast.style.animation = 'slideIn 0.3s ease-out reverse';
        setTimeout(function(){ toast.remove(); }, 300);
    }, 5000);
}

function showSMSNotification(reportName, phone) {
    const modal   = document.getElementById('smsModal');
    const phoneEl = document.getElementById('smsPhoneNumber');
    const msgEl   = document.getElementById('smsMessagePreview');
    phoneEl.textContent = phone;
    msgEl.textContent   = 'ALERT: Match found for ' + reportName + '! A person matching the description has been located. Please contact Safe Return helpline immediately. Case ID: ' + Math.floor(Math.random()*10000);
    modal.style.display = 'flex';
}

function closeSMSModal() {
    document.getElementById('smsModal').style.display = 'none';
}

// ══════════════════════════════════════════════════════
// DOM READY
// ══════════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', function() {
    var lostCard  = document.getElementById('card-lost-person');
    var foundCard = document.getElementById('card-found-person');
    if (lostCard)  lostCard.onclick  = showReportForm;
    if (foundCard) foundCard.onclick = showFoundReportForm;
});
