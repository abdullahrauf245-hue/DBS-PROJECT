// Supabase REST config (override by setting window.SUPABASE_URL / window.SUPABASE_ANON_KEY)
const SUPABASE_URL = window.SUPABASE_URL || 'https://cwhpufwtjnkwppmnojnt.supabase.co';
const SUPABASE_ANON_KEY = window.SUPABASE_ANON_KEY || 'sb_publishable_wPzaWCX0PyKMmC9PM_fTOw_UxbmSni5';
const SUPABASE_REST = `${SUPABASE_URL.replace(/\/+$/, '')}/rest/v1`;

const SUPABASE_HEADERS = {
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${SUPABASE_ANON_KEY}`
};

const HLA_FIELDS = ['hla_a1', 'hla_a2', 'hla_b1', 'hla_b2', 'hla_dr1', 'hla_dr2'];

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

function buildHlaMatches({
    donors,
    recipients,
    donorOrgans,
    recipientOrgans,
    donorHla,
    recipientHla
}) {
    const donorById = new Map(donors.map(d => [d.d_id, d]));
    const recipientById = new Map(recipients.map(r => [r.r_id, r]));
    const donorOrganById = new Map(donorOrgans.map(o => [o.od_id, o]));
    const recipientOrganById = new Map(recipientOrgans.map(o => [o.ro_id, o]));

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

            const donor = donorById.get(donorOrgan.d_id);
            const recipient = recipientById.get(recipientOrgan.r_id);
            if (!donor || !recipient) return;

            const score = Math.round((matchCount / HLA_FIELDS.length) * 100);
            const matchFactors = [`${matchCount}/6 HLA Match`];

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

    let recipients = [];
    let donors = [];
    let matches = [];

    try {
        const [
            recipientsData,
            donorsData,
            donorOrgans,
            recipientOrgans,
            donorHla,
            recipientHla
        ] = await Promise.all([
            fetchTable('recipient'),
            fetchTable('donor'),
            fetchTable('donor_organ'),
            fetchTable('recipient_organ'),
            fetchTable('donor_hla_test'),
            fetchTable('recipient_hla_test')
        ]);

        recipients = recipientsData.map(r => ({
            id: `R${r.r_id}`,
            name: r.name,
            bloodType: 'N/A',
            hla: 'Pending',
            urgency: 'N/A',
            age: 'N/A'
        }));

        donors = donorsData.map(d => ({
            id: `D${d.d_id}`,
            name: d.name,
            bloodType: 'N/A',
            hla: 'Pending',
            age: 'N/A',
            type: d.type === 'Alive' ? 'Living' : 'Deceased'
        }));

        matches = buildHlaMatches({
            donors: donorsData,
            recipients: recipientsData,
            donorOrgans,
            recipientOrgans,
            donorHla,
            recipientHla
        });

        engineStatusTitle.textContent = 'Supabase Connected';
        engineStatusText.textContent = `Loaded ${recipients.length} recipients and ${donors.length} donors.`;
    } catch (error) {
        console.error(error);
        recipients = fallbackRecipients;
        donors = fallbackDonors;
        matches = fallbackMatches;
        engineStatusTitle.textContent = 'Demo Mode';
        engineStatusText.textContent = 'Supabase connection failed. Using local demo data.';
    }

    // Update Counts
    document.getElementById('recipients-count').textContent = recipients.length;
    document.getElementById('donors-count').textContent = donors.length;

    // Helper to get initials
    const getInitials = (name) => {
        if (name === 'Anonymous') return 'AN';
        return name.split(' ').map(n => n[0]).join('');
    };

    // Render Recipients
    recipients.forEach((p, index) => {
        const delay = index * 0.1;
        const card = document.createElement('div');
        card.className = 'person-card recipient-card';
        card.style.animationDelay = `${delay}s`;
        card.innerHTML = `
            <div class="avatar">${getInitials(p.name)}</div>
            <div class="info">
                <h4>${p.name}</h4>
                <div class="traits">
                    <span class="trait-badge trait-blood"><i class="fa-solid fa-droplet"></i> ${p.bloodType}</span>
                    <span class="trait-badge trait-hla">HLA: ${p.hla}</span>
                    <span class="trait-badge" style="color: ${p.urgency === 'Critical' ? '#ef4444' : p.urgency === 'High' ? '#f59e0b' : '#94a3b8'}">
                        <i class="fa-solid fa-circle-exclamation"></i> ${p.urgency}
                    </span>
                </div>
            </div>
        `;
        recipientsList.appendChild(card);
    });

    // Render Donors
    donors.forEach((d, index) => {
        const delay = index * 0.1;
        const card = document.createElement('div');
        card.className = 'person-card donor-card';
        card.style.animationDelay = `${delay}s`;
        card.innerHTML = `
            <div class="avatar">${getInitials(d.name)}</div>
            <div class="info">
                <h4>${d.name}</h4>
                <div class="traits">
                    <span class="trait-badge trait-blood"><i class="fa-solid fa-droplet"></i> ${d.bloodType}</span>
                    <span class="trait-badge trait-hla">HLA: ${d.hla}</span>
                    <span class="trait-badge"><i class="fa-solid fa-user-tag"></i> ${d.type}</span>
                </div>
            </div>
        `;
        donorsList.appendChild(card);
    });

    // Run Matching Engine Simulation
    runBtn.addEventListener('click', () => {
        // Change state to matching
        engineStatus.classList.add('is-matching');
        runBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Cross-matching Vectors...';
        runBtn.classList.add('btn-outline');
        runBtn.classList.remove('btn-primary', 'btn-glow');
        runBtn.disabled = true;
        
        matchesPreview.classList.remove('visible');
        setTimeout(() => {
            matchesPreview.style.display = 'none';
        }, 300);

        // Simulate calculation time
        setTimeout(() => {
            engineStatus.classList.remove('is-matching');
            runBtn.innerHTML = '<i class="fa-solid fa-rotate-right"></i> Rerun Analysis';
            runBtn.classList.remove('btn-outline');
            runBtn.classList.add('btn-primary');
            runBtn.disabled = false;
            
            engineStatusTitle.textContent = 'Analysis Complete';
            engineStatusText.textContent = `Identified ${matches.length} high-probability matches based on genetic markers.`;

            renderMatches(matches);
            
            matchesPreview.style.display = 'flex';
            setTimeout(() => {
                matchesPreview.classList.add('visible');
            }, 50);

        }, 3500);
    });

    function renderMatches(matchResults) {
        matchesList.innerHTML = '';
        matchResults.forEach((match, index) => {
            const card = document.createElement('div');
            card.className = 'match-result-card';
            card.style.animation = `slideIn 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards ${index * 0.2}s`;
            card.style.opacity = '0';
            
            let color = match.score > 90 ? '#10b981' : match.score > 80 ? '#f59e0b' : '#3b82f6';

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
                        <div class="avatar" style="background: rgba(112,0,255,0.15); border: 1px solid rgba(112,0,255,0.4); color: #b37fff;">${getInitials(match.recipient.name)}</div>
                        <div>
                            <h5>${match.recipient.name}</h5>
                            <span>Recipient • Blood: ${match.recipient.bloodType}</span>
                        </div>
                    </div>
                    
                    <div class="match-link" style="color: ${color};">
                        <i class="fa-solid fa-link"></i>
                    </div>

                    <div class="match-person donor">
                        <div class="avatar" style="background: rgba(0,240,255,0.1); border: 1px solid rgba(0,240,255,0.4); color: #00f0ff;">${getInitials(match.donor.name)}</div>
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
});
