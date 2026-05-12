// Supabase REST config (override by setting window.SUPABASE_URL / window.SUPABASE_ANON_KEY)
const SUPABASE_URL = window.SUPABASE_URL || 'https://cwhpufwtjnkwppmnojnt.supabase.co';
const SUPABASE_ANON_KEY = window.SUPABASE_ANON_KEY || 'sb_publishable_wPzaWCX0PyKMmC9PM_fTOw_UxbmSni5';
const SUPABASE_REST = `${SUPABASE_URL.replace(/\/+$/, '')}/rest/v1`;

const SUPABASE_HEADERS = {
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${SUPABASE_ANON_KEY}`
};

const SUPABASE_WRITE_HEADERS = {
    ...SUPABASE_HEADERS,
    'Content-Type': 'application/json',
    Prefer: 'return=representation'
};

const HLA_FIELDS = ['hla_a1', 'hla_a2', 'hla_b1', 'hla_b2', 'hla_dr1', 'hla_dr2'];
const URGENCY_WEIGHTS = {
    Active: 12,
    Matched: 6,
    Operated: 0,
    Removed: -20
};
const DONOR_TYPE_WEIGHTS = {
    Living: 6,
    Deceased: 3
};

const BLOOD_COMPATIBILITY = {
    O: ['O', 'A', 'B', 'AB'],
    A: ['A', 'AB'],
    B: ['B', 'AB'],
    AB: ['AB']
};

const fallbackRecipients = [
    { id: 'R001', name: 'John Doe', bloodType: 'O+', hla: 'A*02, B*07', urgency: 'High', age: 45 },
    { id: 'R002', name: 'Sarah Smith', bloodType: 'A-', hla: 'A*01, B*08', urgency: 'Medium', age: 32 },
    { id: 'R003', name: 'Michael Chen', bloodType: 'B+', hla: 'A*24, B*15', urgency: 'Critical', age: 50 },
    { id: 'R004', name: 'Emily Davis', bloodType: 'AB+', hla: 'A*03, B*35', urgency: 'Medium', age: 28 },
    { id: 'R005', name: 'Robert Wilson', bloodType: 'O-', hla: 'A*11, B*44', urgency: 'Low', age: 60 },
    { id: 'R006', name: 'Jessica Taylor', bloodType: 'A+', hla: 'A*02, B*27', urgency: 'High', age: 41 },
];

const fallbackDonors = [
    { id: 'D001', name: 'Anonymous', bloodType: 'O+', hla: 'A*02, B*07', age: 35, type: 'Deceased' },
    { id: 'D002', name: 'William Brown', bloodType: 'A-', hla: 'A*01, B*08', age: 29, type: 'Living' },
    { id: 'D003', name: 'David Lee', bloodType: 'O-', hla: 'A*11, B*44', age: 42, type: 'Living' },
    { id: 'D004', name: 'Anonymous', bloodType: 'B+', hla: 'A*24, B*15', age: 55, type: 'Deceased' },
    { id: 'D005', name: 'Lisa Anderson', bloodType: 'A+', hla: 'A*02, B*44', age: 31, type: 'Living' },
];

const fallbackMatches = [
    {
        recipient: fallbackRecipients[0],
        donor: fallbackDonors[0],
        score: 98,
        matchFactors: ['Perfect Blood Match', '6/6 HLA Match', 'Age Compatibility']
    },
    {
        recipient: fallbackRecipients[1],
        donor: fallbackDonors[1],
        score: 94,
        matchFactors: ['Blood Match', '5/6 HLA Match']
    },
    {
        recipient: fallbackRecipients[4],
        donor: fallbackDonors[2],
        score: 89,
        matchFactors: ['Blood Match', '4/6 HLA Match']
    }
];

async function fetchTable(tableName, select = '*') {
    const url = `${SUPABASE_REST}/${tableName}?select=${encodeURIComponent(select)}`;
    const response = await fetch(url, { headers: SUPABASE_HEADERS });
    if (!response.ok) {
        const body = await response.text();
        throw new Error(`Supabase ${tableName} failed: ${response.status} ${body}`);
    }
    return response.json();
}

async function fetchTableSafe(tableName, select = '*') {
    try {
        return await fetchTable(tableName, select);
    } catch {
        return [];
    }
}

async function fetchLatestId(tableName, idField) {
    const url = `${SUPABASE_REST}/${tableName}?select=${encodeURIComponent(idField)}&order=${idField}.desc&limit=1`;
    const response = await fetch(url, { headers: SUPABASE_HEADERS });
    if (!response.ok) {
        const body = await response.text();
        throw new Error(`Supabase ${tableName} latest id failed: ${response.status} ${body}`);
    }
    const rows = await response.json();
    return rows?.[0]?.[idField] ?? 0;
}

async function insertRow(tableName, payload) {
    const response = await fetch(`${SUPABASE_REST}/${tableName}`, {
        method: 'POST',
        headers: SUPABASE_WRITE_HEADERS,
        body: JSON.stringify(payload)
    });
    if (!response.ok) {
        const body = await response.text();
        throw new Error(`Supabase ${tableName} insert failed: ${response.status} ${body}`);
    }
    return response.json();
}

function getDateString(date = new Date()) {
    return date.toISOString().slice(0, 10);
}

function getTimeString(date = new Date()) {
    return date.toTimeString().slice(0, 8);
}

function formatDateForDisplay(value) {
    if (!value) return '--';
    const raw = String(value);
    return raw.length >= 10 ? raw.slice(0, 10) : raw;
}

function cleanValue(value) {
    const trimmed = String(value || '').trim();
    return trimmed.length ? trimmed : null;
}

function formatHlaRow(row) {
    return HLA_FIELDS.map(field => row[field]).filter(Boolean).join(', ');
}

function parseSizeCm(value) {
    if (!value) return null;
    const match = String(value).match(/\d+(\.\d+)?/);
    return match ? Number(match[0]) : null;
}

function normalizeBloodType(value) {
    if (!value) return null;
    const cleaned = String(value).toUpperCase().replace(/\s+/g, '');
    const match = cleaned.match(/^(A|B|AB|O)([+-])?$/);
    if (!match) return null;
    return { abo: match[1], rh: match[2] || null, raw: cleaned };
}

function isBloodCompatible(donorType, recipientType) {
    if (!donorType || !recipientType) return true;
    const donor = normalizeBloodType(donorType);
    const recipient = normalizeBloodType(recipientType);
    if (!donor || !recipient) return true;
    const aboAllowed = BLOOD_COMPATIBILITY[donor.abo] || [];
    if (!aboAllowed.includes(recipient.abo)) return false;
    if (donor.rh && recipient.rh && donor.rh === '-' && recipient.rh === '+') return true;
    if (donor.rh && recipient.rh && donor.rh === '+' && recipient.rh === '-') return false;
    return true;
}

function getBloodType(record) {
    return record?.blood_type || record?.bloodType || null;
}

function getRecipientNeed(recipientOrganName) {
    if (!recipientOrganName) return 'Any';
    if (recipientOrganName.toLowerCase().includes('left')) return 'Left';
    if (recipientOrganName.toLowerCase().includes('right')) return 'Right';
    return 'Any';
}

function isOrganCompatible(recipientNeed, donorOrganName) {
    if (recipientNeed === 'Any') return true;
    const donorSide = donorOrganName && donorOrganName.toLowerCase().includes('left') ? 'Left'
        : donorOrganName && donorOrganName.toLowerCase().includes('right') ? 'Right'
            : 'Any';
    return recipientNeed === donorSide;
}

async function loadSupabaseData() {
    const [
        recipients,
        donors,
        donorOrgans,
        recipientOrgans,
        donorHla,
        recipientHla,
        waitingList,
        grantApprovals,
        legalClearances
    ] = await Promise.all([
        fetchTable('recipient'),
        fetchTable('donor'),
        fetchTable('donor_organ'),
        fetchTable('recipient_organ'),
        fetchTable('donor_hla_test'),
        fetchTable('recipient_hla_test'),
        fetchTable('waiting_list'),
        fetchTableSafe('grant_approval'),
        fetchTableSafe('legal_clearance')
    ]);

    return {
        recipients,
        donors,
        donorOrgans,
        recipientOrgans,
        donorHla,
        recipientHla,
        waitingList,
        grantApprovals,
        legalClearances
    };
}

function buildRecipientCards(data) {
    const recipientHlaByRo = new Map(data.recipientHla.map(h => [h.ro_id, formatHlaRow(h)]));
    const organByRecipient = new Map(
        data.recipientOrgans.map(o => [o.r_id, recipientHlaByRo.get(o.ro_id) || 'Pending'])
    );
    const waitStatusByRecipient = new Map(
        (data.waitingList || []).map(entry => [entry.r_id, entry.status])
    );
    const waitDateByRecipient = new Map(
        (data.waitingList || []).map(entry => [entry.r_id, entry.date_added])
    );

    return data.recipients.map(r => ({
        id: `R${r.r_id}`,
        name: r.name,
        bloodType: getBloodType(r) || 'N/A',
        hla: organByRecipient.get(r.r_id) || 'Pending',
        urgency: waitStatusByRecipient.get(r.r_id) || 'N/A',
        age: 'N/A',
        waitDate: waitDateByRecipient.get(r.r_id) || null
    }));
}

function buildDonorCards(data) {
    const donorHlaByOd = new Map(data.donorHla.map(h => [h.od_id, formatHlaRow(h)]));
    const organByDonor = new Map(
        data.donorOrgans.map(o => [o.d_id, donorHlaByOd.get(o.od_id) || 'Pending'])
    );

    return data.donors.map(d => ({
        id: `D${d.d_id}`,
        name: d.name,
        bloodType: getBloodType(d) || 'N/A',
        hla: organByDonor.get(d.d_id) || 'Pending',
        age: 'N/A',
        type: d.type === 'Alive' ? 'Living' : 'Deceased',
        donationDate: d.donation_date || null
    }));
}

function buildHlaMatches({
    donors,
    recipients,
    donorOrgans,
    recipientOrgans,
    donorHla,
    recipientHla,
    waitingList,
    grantApprovals,
    legalClearances
}) {
    const donorById = new Map(donors.map(d => [d.d_id, d]));
    const recipientById = new Map(recipients.map(r => [r.r_id, r]));
    const donorOrganById = new Map(donorOrgans.map(o => [o.od_id, o]));
    const recipientOrganById = new Map(recipientOrgans.map(o => [o.ro_id, o]));
    const waitStatusByRecipient = new Map((waitingList || []).map(entry => [entry.r_id, entry.status]));
    const grantApprovalByPair = new Set((grantApprovals || []).map(entry => `${entry.d_id}:${entry.r_id}`));
    const legalClearanceByPair = new Map(
        (legalClearances || []).map(entry => [`${entry.d_id}:${entry.r_id}`, entry.status])
    );

    const matches = [];
    recipientHla.forEach(recHla => {
        donorHla.forEach(donHla => {
            const matchCount = HLA_FIELDS.reduce((count, field) => {
                if (recHla[field] && donHla[field] && recHla[field] === donHla[field]) {
                    return count + 1;
                }
                return count;
            }, 0);

            if (matchCount === 0) return;

            const donorOrgan = donorOrganById.get(donHla.od_id);
            const recipientOrgan = recipientOrganById.get(recHla.ro_id);
            if (!donorOrgan || !recipientOrgan) return;

            if (donorOrgan.status && donorOrgan.status !== 'Available') return;

            const recipientNeed = getRecipientNeed(recipientOrgan.name);
            if (!isOrganCompatible(recipientNeed, donorOrgan.name)) return;

            const donor = donorById.get(donorOrgan.d_id);
            const recipient = recipientById.get(recipientOrgan.r_id);
            if (!donor || !recipient) return;

            if (grantApprovalByPair.size && !grantApprovalByPair.has(`${donor.d_id}:${recipient.r_id}`)) return;
            if (legalClearanceByPair.size) {
                const clearanceStatus = legalClearanceByPair.get(`${donor.d_id}:${recipient.r_id}`);
                if (clearanceStatus && clearanceStatus !== 'Approved') return;
                if (!clearanceStatus) return;
            }

            const donorBlood = getBloodType(donor);
            const recipientBlood = getBloodType(recipient);
            if (!isBloodCompatible(donorBlood, recipientBlood)) return;

            const waitStatus = waitStatusByRecipient.get(recipient.r_id) || 'N/A';
            if (waitStatus === 'Removed') return;

            const hlaScore = (matchCount / HLA_FIELDS.length) * 60;
            const organScore = recipientNeed === 'Any' ? 8 : 12;
            const donorType = donor.type === 'Alive' ? 'Living' : 'Deceased';
            const donorTypeScore = DONOR_TYPE_WEIGHTS[donorType] || 0;
            const urgencyScore = URGENCY_WEIGHTS[waitStatus] || 0;

            let sizeScore = 0;
            const donorSize = parseSizeCm(donorOrgan.size);
            const recipientSize = parseSizeCm(recipientOrgan.size);
            let sizeNote = null;
            if (donorSize !== null && recipientSize !== null) {
                const delta = Math.abs(donorSize - recipientSize);
                if (delta <= 1) sizeScore = 6;
                else if (delta <= 2) sizeScore = 3;
                sizeNote = `Size delta: ${delta.toFixed(1)}cm`;
            }

            const rawScore = hlaScore + organScore + donorTypeScore + urgencyScore + sizeScore;
            const score = Math.max(0, Math.min(100, Math.round(rawScore)));
            const matchFactors = [
                `${matchCount}/6 HLA Match`,
                `Organ: ${donorOrgan.name}`,
                `Donor: ${donorType}`,
                `Waitlist: ${waitStatus}`
            ];
            if (donorBlood && recipientBlood) {
                matchFactors.push(`Blood: ${donorBlood} -> ${recipientBlood}`);
            }
            if (sizeNote) matchFactors.push(sizeNote);

            matches.push({
                recipient: {
                    id: `R${recipient.r_id}`,
                    name: recipient.name,
                    bloodType: recipientBlood || 'N/A',
                    hla: formatHlaRow(recHla)
                },
                donor: {
                    id: `D${donor.d_id}`,
                    name: donor.name,
                    bloodType: donorBlood || 'N/A',
                    hla: formatHlaRow(donHla)
                },
                score,
                matchFactors
            });
        });
    });

    return matches.sort((a, b) => b.score - a.score).slice(0, 5);
}

function renderRecipients(list, container, initialsFn) {
    container.innerHTML = '';
    list.forEach((p, index) => {
        const delay = index * 0.1;
        const card = document.createElement('div');
        card.className = 'person-card recipient-card';
        card.dataset.personId = p.id || '';
        card.dataset.personName = p.name || '';
        card.style.animationDelay = `${delay}s`;
        const urgencyColors = {
            Active: '#ff2d2d',
            Matched: '#ffffff',
            Operated: '#cbd5f5',
            Removed: '#8b8b8b'
        };
        const urgencyColor = urgencyColors[p.urgency] || '#94a3b8';
        card.innerHTML = `
            <div class="avatar">${initialsFn(p.name)}</div>
            <div class="info">
                <h4>${p.name}</h4>
                <div class="traits">
                    <span class="trait-badge trait-blood"><i class="fa-solid fa-droplet"></i> ${p.bloodType}</span>
                    <span class="trait-badge trait-hla">HLA: ${p.hla}</span>
                    <span class="trait-badge" style="color: ${urgencyColor}">
                        <i class="fa-solid fa-circle-exclamation"></i> ${p.urgency}
                    </span>
                </div>
                <div class="date-row">
                    <span class="date-chip"><i class="fa-solid fa-calendar-days"></i> Waitlist: ${formatDateForDisplay(p.waitDate)}</span>
                </div>
            </div>
        `;
        container.appendChild(card);
    });
}

function renderDonors(list, container, initialsFn) {
    container.innerHTML = '';
    list.forEach((d, index) => {
        const delay = index * 0.1;
        const card = document.createElement('div');
        card.className = 'person-card donor-card';
        card.dataset.personId = d.id || '';
        card.dataset.personName = d.name || '';
        card.style.animationDelay = `${delay}s`;
        card.innerHTML = `
            <div class="avatar">${initialsFn(d.name)}</div>
            <div class="info">
                <h4>${d.name}</h4>
                <div class="traits">
                    <span class="trait-badge trait-blood"><i class="fa-solid fa-droplet"></i> ${d.bloodType}</span>
                    <span class="trait-badge trait-hla">HLA: ${d.hla}</span>
                    <span class="trait-badge"><i class="fa-solid fa-user-tag"></i> ${d.type}</span>
                </div>
                <div class="date-row">
                    <span class="date-chip"><i class="fa-solid fa-calendar-days"></i> Donation: ${formatDateForDisplay(d.donationDate)}</span>
                </div>
            </div>
        `;
        container.appendChild(card);
    });
}

function getScoreColor(score) {
    if (typeof score !== 'number') return '#ff2d2d';
    if (score > 90) return '#ffffff';
    if (score > 80) return '#ff7a7a';
    return '#ff2d2d';
}

function renderMatches(matchResults, matchesList, initialsFn) {
    matchesList.innerHTML = '';
    if (!matchResults.length) {
        matchesList.innerHTML = '<div class="match-result-card">No compatible matches found. Add more HLA tests to expand results.</div>';
        return;
    }

    matchResults.forEach((match, index) => {
        const card = document.createElement('div');
        card.className = 'match-result-card';
        card.style.animation = `slideIn 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards ${index * 0.2}s`;
        card.style.opacity = '0';

        const color = getScoreColor(match.score);
        const recipientName = match.recipient?.name || match.recipient?.id || 'Recipient';
        const donorName = match.donor?.name || match.donor?.id || 'Donor';
        const factors = Array.isArray(match.matchFactors) ? match.matchFactors : [];
        const recipientHla = match.recipient?.hla || 'N/A';
        const donorHla = match.donor?.hla || 'N/A';
        const factorsMarkup = factors.length
            ? `<div class="match-factors">${factors.map(factor => `<span class="factor-chip">${factor}</span>`).join('')}</div>`
            : '';

        card.innerHTML = `
            <div class="match-header">
                <div class="match-score">
                    <div class="score-circle" style="color: ${color}; border-color: ${color}; box-shadow: 0 0 20px ${color}40;">
                        ${match.score}%
                    </div>
                    <div class="score-label">Compatibility Score</div>
                </div>
                <button class="match-action" data-match-index="${index}">Review Case</button>
            </div>
            <div class="match-pair">
                <span class="pair-label">Recipient:</span>
                <span class="pair-name">${recipientName}</span>
                <span class="pair-sep">→</span>
                <span class="pair-label">Donor:</span>
                <span class="pair-name">${donorName}</span>
            </div>
            <div class="match-details">
                    <div class="match-person recipient">
                        <div class="avatar" style="background: rgba(255,45,45,0.15); border: 1px solid rgba(255,45,45,0.45); color: #ff9a9a;">${initialsFn(recipientName)}</div>
                    <div>
                        <h5>${recipientName}</h5>
                        <span>Recipient • Blood: ${match.recipient.bloodType}</span>
                    </div>
                </div>

                <div class="match-link" style="color: ${color};">
                    <i class="fa-solid fa-link"></i>
                </div>

                    <div class="match-person donor">
                        <div class="avatar" style="background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.4); color: #ffffff;">${initialsFn(donorName)}</div>
                    <div>
                        <h5>${donorName}</h5>
                        <span>Donor • Blood: ${match.donor.bloodType}</span>
                    </div>
                </div>
            </div>
            <div class="match-meta">
                <div class="match-row">
                    <span class="match-label">Recipient HLA</span>
                    <span class="match-value">${recipientHla}</span>
                </div>
                <div class="match-row">
                    <span class="match-label">Donor HLA</span>
                    <span class="match-value">${donorHla}</span>
                </div>
                ${factorsMarkup}
            </div>
        `;
        matchesList.appendChild(card);
    });
}

// Initialize UI
document.addEventListener('DOMContentLoaded', async () => {
    const recipientsList = document.getElementById('recipients-list');
    const donorsList = document.getElementById('donors-list');
    const runBtn = document.getElementById('run-matching-btn');
    const matchesPreview = document.getElementById('matches-results');
    const matchesList = document.getElementById('matches-list');
    const addRecipientBtn = document.getElementById('add-recipient-btn');
    const addDonorBtn = document.getElementById('add-donor-btn');
    const addRecordModal = document.getElementById('add-record-modal');
    const addRecordClose = addRecordModal ? addRecordModal.querySelector('.form-modal__close') : null;
    const addRecordBackdrop = addRecordModal ? addRecordModal.querySelector('.form-modal__backdrop') : null;
    const addRecordForm = document.getElementById('add-record-form');
    const addRecordTitle = document.getElementById('add-record-title');
    const addRecordSubtitle = document.getElementById('add-record-subtitle');
    const addRecordMessage = document.getElementById('add-record-message');
    const matchModal = document.getElementById('match-modal');
    const matchModalClose = matchModal ? matchModal.querySelector('.match-modal__close') : null;
    const matchModalBackdrop = matchModal ? matchModal.querySelector('.match-modal__backdrop') : null;
    const matchModalSubtitle = document.getElementById('match-modal-subtitle');
    const matchModalScore = document.getElementById('match-modal-score');
    const matchModalRecipient = document.getElementById('match-modal-recipient');
    const matchModalRecipientBlood = document.getElementById('match-modal-recipient-blood');
    const matchModalRecipientHla = document.getElementById('match-modal-recipient-hla');
    const matchModalDonor = document.getElementById('match-modal-donor');
    const matchModalDonorBlood = document.getElementById('match-modal-donor-blood');
    const matchModalDonorHla = document.getElementById('match-modal-donor-hla');
    const matchModalFactors = document.getElementById('match-modal-factors');
    const engineStatus = document.querySelector('.center-panel');
    const engineStatusTitle = document.querySelector('.engine-status h3');
    const engineStatusText = document.querySelector('.engine-status p');
    const availableOrgansEl = document.getElementById('available-organs-count');
    const activeWaitlistEl = document.getElementById('active-waitlist-count');
    const lastSyncEl = document.getElementById('last-sync-time');
    const panelToggles = document.querySelectorAll('.panel-toggle');
    const panelMedia = window.matchMedia('(max-width: 980px)');
    const compactMedia = window.matchMedia('(max-width: 720px)');

    const setMatchesOpen = (shouldOpen) => {
        matchesPreview.classList.toggle('is-open', shouldOpen);
    };

    const syncModalState = () => {
        const matchOpen = matchModal && matchModal.classList.contains('is-open');
        const recordOpen = addRecordModal && addRecordModal.classList.contains('is-open');
        document.body.classList.toggle('modal-open', matchOpen || recordOpen);
    };

    const setMatchModalOpen = (shouldOpen) => {
        if (!matchModal) return;
        matchModal.classList.toggle('is-open', shouldOpen);
        matchModal.setAttribute('aria-hidden', String(!shouldOpen));
        if (shouldOpen && addRecordModal) {
            addRecordModal.classList.remove('is-open');
            addRecordModal.setAttribute('aria-hidden', 'true');
        }
        syncModalState();
        if (shouldOpen && matchModalClose) {
            matchModalClose.focus();
        }
    };

    const setAddRecordModalOpen = (shouldOpen) => {
        if (!addRecordModal) return;
        addRecordModal.classList.toggle('is-open', shouldOpen);
        addRecordModal.setAttribute('aria-hidden', String(!shouldOpen));
        if (shouldOpen && matchModal) {
            matchModal.classList.remove('is-open');
            matchModal.setAttribute('aria-hidden', 'true');
        }
        syncModalState();
        if (shouldOpen && addRecordClose) {
            addRecordClose.focus();
        }
    };

    const setAddRecordRole = (role) => {
        if (!addRecordModal) return;
        addRecordModal.dataset.role = role;
        const isRecipient = role === 'recipient';
        addRecordModal.querySelectorAll('.form-only-recipient').forEach(el => {
            el.classList.toggle('is-hidden', !isRecipient);
        });
        addRecordModal.querySelectorAll('.form-only-donor').forEach(el => {
            el.classList.toggle('is-hidden', isRecipient);
        });
        const donorOrgan = addRecordModal.querySelector('[name="donor_organ"]');
        const recipientNeed = addRecordModal.querySelector('[name="recipient_need"]');
        if (donorOrgan) donorOrgan.required = !isRecipient;
        if (recipientNeed) recipientNeed.required = isRecipient;
        if (addRecordTitle) {
            addRecordTitle.textContent = isRecipient ? 'Add Recipient' : 'Add Donor';
        }
        if (addRecordSubtitle) {
            addRecordSubtitle.textContent = isRecipient
                ? 'Create a new recipient profile in Supabase.'
                : 'Create a new donor profile in Supabase.';
        }
    };

    const setAddRecordMessage = (message, type) => {
        if (!addRecordMessage) return;
        addRecordMessage.textContent = message || '';
        addRecordMessage.classList.remove('is-error', 'is-success');
        if (type) {
            addRecordMessage.classList.add(type === 'error' ? 'is-error' : 'is-success');
        }
    };

    const setFormBusy = (isBusy) => {
        if (!addRecordForm) return;
        addRecordForm.querySelectorAll('input, select, button').forEach(el => {
            el.disabled = isBusy;
        });
    };

    const fillMatchModal = (match) => {
        if (!matchModal) return;
        const color = getScoreColor(match.score);
        const factors = Array.isArray(match.matchFactors) ? match.matchFactors : [];
        const recipientName = match.recipient?.name || match.recipient?.id || 'Recipient';
        const donorName = match.donor?.name || match.donor?.id || 'Donor';
        if (matchModalSubtitle) {
            matchModalSubtitle.textContent = `${recipientName} vs ${donorName}`;
        }
        if (matchModalScore) {
            matchModalScore.textContent = `${match.score}%`;
            matchModalScore.style.color = color;
            matchModalScore.style.borderColor = color;
            matchModalScore.style.boxShadow = `0 0 20px ${color}40`;
        }
        if (matchModalRecipient) matchModalRecipient.textContent = recipientName;
        if (matchModalRecipientBlood) matchModalRecipientBlood.textContent = `Blood: ${match.recipient?.bloodType || 'N/A'}`;
        if (matchModalRecipientHla) matchModalRecipientHla.textContent = `HLA: ${match.recipient?.hla || 'N/A'}`;
        if (matchModalDonor) matchModalDonor.textContent = donorName;
        if (matchModalDonorBlood) matchModalDonorBlood.textContent = `Blood: ${match.donor?.bloodType || 'N/A'}`;
        if (matchModalDonorHla) matchModalDonorHla.textContent = `HLA: ${match.donor?.hla || 'N/A'}`;
        if (matchModalFactors) {
            matchModalFactors.innerHTML = factors.length
                ? factors.map(factor => `<span class="factor-chip">${factor}</span>`).join('')
                : '<span class="factor-chip">No additional factors logged.</span>';
        }
    };

    const closeMatchModal = () => setMatchModalOpen(false);

    const setRunButtonToRerun = () => {
        runBtn.innerHTML = '<i class="fa-solid fa-rotate-right"></i> Rerun Analysis';
        runBtn.classList.remove('btn-outline');
        runBtn.classList.add('btn-primary', 'btn-glow');
        runBtn.disabled = false;
    };

    const clearHighlights = () => {
        recipientsList?.querySelectorAll('.person-card').forEach(card => {
            card.classList.remove('is-highlighted');
        });
        donorsList?.querySelectorAll('.person-card').forEach(card => {
            card.classList.remove('is-highlighted');
        });
    };

    const highlightPerson = (container, personId) => {
        if (!container || !personId) return;
        const card = container.querySelector(`[data-person-id="${personId}"]`);
        if (!card) return;
        card.classList.add('is-highlighted');
        card.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
    };

    const highlightMatchPair = (match) => {
        if (!match) return;
        clearHighlights();
        highlightPerson(recipientsList, match.recipient?.id);
        highlightPerson(donorsList, match.donor?.id);
    };

    const getInitials = (name) => {
        const safeName = String(name || '').trim();
        if (!safeName) return '--';
        if (safeName === 'Anonymous') return 'AN';
        return safeName.split(' ').map(n => n[0]).join('').slice(0, 3);
    };

    const setPanelCollapsed = (toggle, shouldCollapse) => {
        const panel = toggle.closest('.panel');
        if (!panel) return;
        panel.classList.toggle('is-collapsed', shouldCollapse);
        toggle.setAttribute('aria-expanded', String(!shouldCollapse));
    };

    panelToggles.forEach((toggle) => {
        toggle.addEventListener('click', () => {
            const panel = toggle.closest('.panel');
            if (!panel) return;
            const isCollapsed = panel.classList.contains('is-collapsed');
            setPanelCollapsed(toggle, !isCollapsed);
        });
    });

    const syncPanelLayout = () => {
        if (!panelMedia.matches) {
            panelToggles.forEach(toggle => setPanelCollapsed(toggle, false));
            return;
        }

        if (compactMedia.matches) {
            panelToggles.forEach((toggle, index) => {
                setPanelCollapsed(toggle, index > 0);
            });
        }
    };

    syncPanelLayout();
    panelMedia.addEventListener('change', syncPanelLayout);
    compactMedia.addEventListener('change', syncPanelLayout);

    if (matchesList) {
        matchesList.addEventListener('click', (event) => {
            const actionButton = event.target.closest('.match-action');
            if (!actionButton) return;
            const matchIndex = Number(actionButton.dataset.matchIndex);
            if (!Number.isFinite(matchIndex)) return;
            const match = matches[matchIndex];
            if (!match) return;
            fillMatchModal(match);
            highlightMatchPair(match);
            setMatchModalOpen(true);
        });
    }

    if (matchModalBackdrop) {
        matchModalBackdrop.addEventListener('click', closeMatchModal);
    }

    if (matchModalClose) {
        matchModalClose.addEventListener('click', closeMatchModal);
    }

    document.addEventListener('keydown', (event) => {
        if (event.key !== 'Escape') return;
        if (matchModal && matchModal.classList.contains('is-open')) {
            closeMatchModal();
        }
        if (addRecordModal && addRecordModal.classList.contains('is-open')) {
            setAddRecordModalOpen(false);
        }
    });

    if (addRecordBackdrop) {
        addRecordBackdrop.addEventListener('click', () => setAddRecordModalOpen(false));
    }

    if (addRecordClose) {
        addRecordClose.addEventListener('click', () => setAddRecordModalOpen(false));
    }

    if (addRecordForm) {
        addRecordForm.querySelectorAll('[data-close="true"]').forEach(button => {
            button.addEventListener('click', () => setAddRecordModalOpen(false));
        });
    }

    if (addRecipientBtn) {
        addRecipientBtn.addEventListener('click', () => {
            setAddRecordRole('recipient');
            setAddRecordMessage('');
            addRecordForm?.reset();
            setAddRecordModalOpen(true);
        });
    }

    if (addDonorBtn) {
        addDonorBtn.addEventListener('click', () => {
            setAddRecordRole('donor');
            setAddRecordMessage('');
            addRecordForm?.reset();
            setAddRecordModalOpen(true);
        });
    }

    if (addRecordForm) {
        addRecordForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            if (!addRecordModal) return;
            const role = addRecordModal.dataset.role || 'recipient';
            const formData = new FormData(addRecordForm);
            setFormBusy(true);
            setAddRecordMessage('Saving...', null);

            try {
                if (role === 'recipient') {
                    await createRecipientRecord(formData);
                } else {
                    await createDonorRecord(formData);
                }

                await refreshData();
                setAddRecordMessage('Saved successfully.', 'success');
                addRecordForm.reset();
                setAddRecordModalOpen(false);
            } catch (error) {
                console.error(error);
                setAddRecordMessage(error?.message || 'Save failed. Check Supabase permissions.', 'error');
            } finally {
                setFormBusy(false);
            }
        });
    }

    let recipients = [];
    let donors = [];
    let matches = [];
    let sourceData = {
        recipients: [],
        donors: [],
        donorOrgans: [],
        recipientOrgans: [],
        donorHla: [],
        recipientHla: [],
        waitingList: [],
        grantApprovals: [],
        legalClearances: []
    };

    const updateSummary = (data) => {
        const availableOrgans = data.donorOrgans.filter(organ => organ.status === 'Available').length;
        const activeWaitlist = (data.waitingList || []).filter(entry => entry.status === 'Active').length;
        availableOrgansEl.textContent = availableOrgans;
        activeWaitlistEl.textContent = activeWaitlist;
    };

    const updateLastSync = () => {
        const now = new Date();
        lastSyncEl.textContent = now.toLocaleString();
    };

    const refreshData = async () => {
        sourceData = await loadSupabaseData();
        recipients = buildRecipientCards(sourceData);
        donors = buildDonorCards(sourceData);
        matches = buildHlaMatches(sourceData);
        updateSummary(sourceData);
        updateLastSync();

        renderRecipients(recipients, recipientsList, getInitials);
        renderDonors(donors, donorsList, getInitials);
        document.getElementById('recipients-count').textContent = recipients.length;
        document.getElementById('donors-count').textContent = donors.length;
    };

    const buildHlaPayload = (formData) => {
        const payload = {};
        let hasAny = false;
        HLA_FIELDS.forEach(field => {
            const value = cleanValue(formData.get(field));
            if (value) {
                payload[field] = value;
                hasAny = true;
            }
        });
        return hasAny ? payload : null;
    };

    const getNextId = async (tableName, idField) => {
        const latest = await fetchLatestId(tableName, idField);
        return Number(latest || 0) + 1;
    };

    const createRecipientRecord = async (formData) => {
        const name = cleanValue(formData.get('name'));
        const bloodType = cleanValue(formData.get('blood_type'));
        const phone = cleanValue(formData.get('phone'));
        const waitStatus = cleanValue(formData.get('wait_status')) || 'Active';
        const organNeed = cleanValue(formData.get('recipient_need')) || 'Any';
        const organSize = cleanValue(formData.get('organ_size'));

        if (!name || !bloodType) {
            throw new Error('Name and blood type are required.');
        }

        const rId = await getNextId('recipient', 'r_id');
        await insertRow('recipient', {
            r_id: rId,
            name,
            phone_number: phone,
            blood_type: bloodType
        });

        const roId = await getNextId('recipient_organ', 'ro_id');
        await insertRow('recipient_organ', {
            ro_id: roId,
            r_id: rId,
            name: organNeed,
            size: organSize
        });

        const hlaPayload = buildHlaPayload(formData);
        if (hlaPayload) {
            await insertRow('recipient_hla_test', {
                ro_id: roId,
                ...hlaPayload
            });
        }

        const wId = await getNextId('waiting_list', 'w_id');
        await insertRow('waiting_list', {
            w_id: wId,
            r_id: rId,
            date_added: getDateString(),
            time_added: getTimeString(),
            status: waitStatus
        });
    };

    const createDonorRecord = async (formData) => {
        const name = cleanValue(formData.get('name'));
        const bloodType = cleanValue(formData.get('blood_type'));
        const phone = cleanValue(formData.get('phone'));
        const donorType = cleanValue(formData.get('donor_type')) || 'Alive';
        const donationDate = cleanValue(formData.get('donation_date'));
        const organName = cleanValue(formData.get('donor_organ')) || 'Left Kidney';
        const organSize = cleanValue(formData.get('organ_size'));

        if (!name || !bloodType) {
            throw new Error('Name and blood type are required.');
        }

        const dId = await getNextId('donor', 'd_id');
        await insertRow('donor', {
            d_id: dId,
            name,
            phone_number: phone,
            donation_date: donationDate,
            type: donorType,
            blood_type: bloodType
        });

        const odId = await getNextId('donor_organ', 'od_id');
        await insertRow('donor_organ', {
            od_id: odId,
            d_id: dId,
            name: organName,
            size: organSize,
            status: 'Available'
        });

        const hlaPayload = buildHlaPayload(formData);
        if (hlaPayload) {
            await insertRow('donor_hla_test', {
                od_id: odId,
                ...hlaPayload
            });
        }
    };

    try {
        sourceData = await loadSupabaseData();
        recipients = buildRecipientCards(sourceData);
        donors = buildDonorCards(sourceData);
        matches = buildHlaMatches(sourceData);
        updateSummary(sourceData);
        updateLastSync();

        engineStatusTitle.textContent = 'Supabase Connected';
        engineStatusText.textContent = `Loaded ${recipients.length} recipients and ${donors.length} donors.`;
    } catch (error) {
        console.error(error);
        recipients = fallbackRecipients;
        donors = fallbackDonors;
        matches = fallbackMatches;
        availableOrgansEl.textContent = '0';
        activeWaitlistEl.textContent = '0';
        lastSyncEl.textContent = 'Demo data';
        engineStatusTitle.textContent = 'Demo Mode';
        engineStatusText.textContent = 'Supabase connection failed. Using local demo data.';
    }

    document.getElementById('recipients-count').textContent = recipients.length;
    document.getElementById('donors-count').textContent = donors.length;

    renderRecipients(recipients, recipientsList, getInitials);
    renderDonors(donors, donorsList, getInitials);
    setMatchesOpen(false);

    runBtn.addEventListener('click', async () => {
        engineStatus.classList.add('is-matching');
        runBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Cross-matching Vectors...';
        runBtn.classList.add('btn-outline');
        runBtn.classList.remove('btn-primary', 'btn-glow');
        runBtn.disabled = true;

        setMatchesOpen(false);

        engineStatusTitle.textContent = 'Matching In Progress';
        engineStatusText.textContent = 'Loading latest donor and recipient data.';

        const stepOne = new Promise(resolve => setTimeout(resolve, 900));
        const stepTwo = new Promise(resolve => setTimeout(resolve, 1800));

        try {
            sourceData = await loadSupabaseData();
            recipients = buildRecipientCards(sourceData);
            donors = buildDonorCards(sourceData);
            matches = buildHlaMatches(sourceData);
            updateSummary(sourceData);
            updateLastSync();

            renderRecipients(recipients, recipientsList, getInitials);
            renderDonors(donors, donorsList, getInitials);
            document.getElementById('recipients-count').textContent = recipients.length;
            document.getElementById('donors-count').textContent = donors.length;
        } catch (error) {
            console.error(error);
            recipients = fallbackRecipients;
            donors = fallbackDonors;
            matches = fallbackMatches;
            availableOrgansEl.textContent = '0';
            activeWaitlistEl.textContent = '0';
            lastSyncEl.textContent = 'Demo data';
            renderRecipients(recipients, recipientsList, getInitials);
            renderDonors(donors, donorsList, getInitials);
        }

        await stepOne;
        engineStatusText.textContent = 'Evaluating HLA compatibility scores.';
        await stepTwo;
        engineStatusText.textContent = 'Ranking high-probability matches.';

        setTimeout(() => {
            engineStatus.classList.remove('is-matching');
            setRunButtonToRerun();

            engineStatusTitle.textContent = 'Analysis Complete';
            engineStatusText.textContent = `Identified ${matches.length} high-probability matches based on genetic markers.`;

            renderMatches(matches, matchesList, getInitials);
            setMatchesOpen(true);

        }, 900);
    });
});
