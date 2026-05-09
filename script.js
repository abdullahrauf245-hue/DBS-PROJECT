// Supabase REST config (override by setting window.SUPABASE_URL / window.SUPABASE_ANON_KEY)
const SUPABASE_URL = window.SUPABASE_URL || 'https://cwhpufwtjnkwppmnojnt.supabase.co';
const SUPABASE_ANON_KEY = window.SUPABASE_ANON_KEY || 'sb_publishable_wPzaWCX0PyKMmC9PM_fTOw_UxbmSni5';
const SUPABASE_REST = `${SUPABASE_URL.replace(/\/+$/, '')}/rest/v1`;

const SUPABASE_HEADERS = {
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${SUPABASE_ANON_KEY}`
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

function formatHlaRow(row) {
    return HLA_FIELDS.map(field => row[field]).filter(Boolean).join(', ');
}

function parseSizeCm(value) {
    if (!value) return null;
    const match = String(value).match(/\d+(\.\d+)?/);
    return match ? Number(match[0]) : null;
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
        waitingList
    ] = await Promise.all([
        fetchTable('recipient'),
        fetchTable('donor'),
        fetchTable('donor_organ'),
        fetchTable('recipient_organ'),
        fetchTable('donor_hla_test'),
        fetchTable('recipient_hla_test'),
        fetchTable('waiting_list')
    ]);

    return {
        recipients,
        donors,
        donorOrgans,
        recipientOrgans,
        donorHla,
        recipientHla,
        waitingList
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

    return data.recipients.map(r => ({
        id: `R${r.r_id}`,
        name: r.name,
        bloodType: 'N/A',
        hla: organByRecipient.get(r.r_id) || 'Pending',
        urgency: waitStatusByRecipient.get(r.r_id) || 'N/A',
        age: 'N/A'
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
        bloodType: 'N/A',
        hla: organByDonor.get(d.d_id) || 'Pending',
        age: 'N/A',
        type: d.type === 'Alive' ? 'Living' : 'Deceased'
    }));
}

function buildHlaMatches({
    donors,
    recipients,
    donorOrgans,
    recipientOrgans,
    donorHla,
    recipientHla,
    waitingList
}) {
    const donorById = new Map(donors.map(d => [d.d_id, d]));
    const recipientById = new Map(recipients.map(r => [r.r_id, r]));
    const donorOrganById = new Map(donorOrgans.map(o => [o.od_id, o]));
    const recipientOrganById = new Map(recipientOrgans.map(o => [o.ro_id, o]));
    const waitStatusByRecipient = new Map((waitingList || []).map(entry => [entry.r_id, entry.status]));

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
            if (sizeNote) matchFactors.push(sizeNote);

            matches.push({
                recipient: {
                    name: recipient.name,
                    bloodType: 'N/A',
                    hla: formatHlaRow(recHla)
                },
                donor: {
                    name: donor.name,
                    bloodType: 'N/A',
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
            </div>
        `;
        container.appendChild(card);
    });
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

        const color = match.score > 90 ? '#ffffff' : match.score > 80 ? '#ff7a7a' : '#ff2d2d';

        card.innerHTML = `
            <div class="match-header">
                <div class="match-score">
                    <div class="score-circle" style="color: ${color}; border-color: ${color}; box-shadow: 0 0 20px ${color}40;">
                        ${match.score}%
                    </div>
                    <div class="score-label">Compatibility Score</div>
                </div>
                <button class="match-action">Review Case</button>
            </div>
            <div class="match-details">
                    <div class="match-person recipient">
                        <div class="avatar" style="background: rgba(255,45,45,0.15); border: 1px solid rgba(255,45,45,0.45); color: #ff9a9a;">${initialsFn(match.recipient.name)}</div>
                    <div>
                        <h5>${match.recipient.name}</h5>
                        <span>Recipient • Blood: ${match.recipient.bloodType}</span>
                    </div>
                </div>

                <div class="match-link" style="color: ${color};">
                    <i class="fa-solid fa-link"></i>
                </div>

                    <div class="match-person donor">
                        <div class="avatar" style="background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.4); color: #ffffff;">${initialsFn(match.donor.name)}</div>
                    <div>
                        <h5>${match.donor.name}</h5>
                        <span>Donor • Blood: ${match.donor.bloodType}</span>
                    </div>
                </div>
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
    const engineStatus = document.querySelector('.center-panel');
    const engineStatusTitle = document.querySelector('.engine-status h3');
    const engineStatusText = document.querySelector('.engine-status p');
    const availableOrgansEl = document.getElementById('available-organs-count');
    const activeWaitlistEl = document.getElementById('active-waitlist-count');
    const lastSyncEl = document.getElementById('last-sync-time');
    const panelToggles = document.querySelectorAll('.panel-toggle');
    const panelMedia = window.matchMedia('(max-width: 980px)');
    const compactMedia = window.matchMedia('(max-width: 720px)');

    const getInitials = (name) => {
        if (name === 'Anonymous') return 'AN';
        return name.split(' ').map(n => n[0]).join('');
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
        waitingList: []
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

    runBtn.addEventListener('click', async () => {
        engineStatus.classList.add('is-matching');
        runBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Cross-matching Vectors...';
        runBtn.classList.add('btn-outline');
        runBtn.classList.remove('btn-primary', 'btn-glow');
        runBtn.disabled = true;

        matchesPreview.classList.remove('visible');
        setTimeout(() => {
            matchesPreview.style.display = 'none';
        }, 300);

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
            runBtn.innerHTML = '<i class="fa-solid fa-rotate-right"></i> Rerun Analysis';
            runBtn.classList.remove('btn-outline');
            runBtn.classList.add('btn-primary');
            runBtn.disabled = false;

            engineStatusTitle.textContent = 'Analysis Complete';
            engineStatusText.textContent = `Identified ${matches.length} high-probability matches based on genetic markers.`;

            renderMatches(matches, matchesList, getInitials);

            matchesPreview.style.display = 'flex';
            setTimeout(() => {
                matchesPreview.classList.add('visible');
            }, 50);

        }, 900);
    });
});
