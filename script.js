// Mock Data for the Organ Matching System
const recipients = [
    { id: 'R001', name: 'John Doe', bloodType: 'O+', hla: 'A*02, B*07', urgency: 'High', age: 45 },
    { id: 'R002', name: 'Sarah Smith', bloodType: 'A-', hla: 'A*01, B*08', urgency: 'Medium', age: 32 },
    { id: 'R003', name: 'Michael Chen', bloodType: 'B+', hla: 'A*24, B*15', urgency: 'Critical', age: 50 },
    { id: 'R004', name: 'Emily Davis', bloodType: 'AB+', hla: 'A*03, B*35', urgency: 'Medium', age: 28 },
    { id: 'R005', name: 'Robert Wilson', bloodType: 'O-', hla: 'A*11, B*44', urgency: 'Low', age: 60 },
    { id: 'R006', name: 'Jessica Taylor', bloodType: 'A+', hla: 'A*02, B*27', urgency: 'High', age: 41 },
];

const donors = [
    { id: 'D001', name: 'Anonymous', bloodType: 'O+', hla: 'A*02, B*07', age: 35, type: 'Deceased' },
    { id: 'D002', name: 'William Brown', bloodType: 'A-', hla: 'A*01, B*08', age: 29, type: 'Living' },
    { id: 'D003', name: 'David Lee', bloodType: 'O-', hla: 'A*11, B*44', age: 42, type: 'Living' },
    { id: 'D004', name: 'Anonymous', bloodType: 'B+', hla: 'A*24, B*15', age: 55, type: 'Deceased' },
    { id: 'D005', name: 'Lisa Anderson', bloodType: 'A+', hla: 'A*02, B*44', age: 31, type: 'Living' },
];

const mockMatches = [
    {
        recipient: recipients[0], // John Doe
        donor: donors[0], // Anonymous O+
        score: 98,
        matchFactors: ['Perfect Blood Match', '6/6 HLA Match', 'Age Compatibility']
    },
    {
        recipient: recipients[1], // Sarah Smith
        donor: donors[1], // William Brown
        score: 94,
        matchFactors: ['Blood Match', '5/6 HLA Match']
    },
    {
        recipient: recipients[4], // Robert Wilson O-
        donor: donors[2], // David Lee O-
        score: 89,
        matchFactors: ['Blood Match', '4/6 HLA Match']
    }
];

// Initialize UI
document.addEventListener('DOMContentLoaded', () => {
    const recipientsList = document.getElementById('recipients-list');
    const donorsList = document.getElementById('donors-list');
    const runBtn = document.getElementById('run-matching-btn');
    const matchesPreview = document.getElementById('matches-results');
    const matchesList = document.getElementById('matches-list');
    const engineStatus = document.querySelector('.center-panel');

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
            
            document.querySelector('.engine-status h3').textContent = 'Analysis Complete';
            document.querySelector('.engine-status p').textContent = `Identified ${mockMatches.length} high-probability matches based on genetic markers.`;

            renderMatches();
            
            matchesPreview.style.display = 'flex';
            setTimeout(() => {
                matchesPreview.classList.add('visible');
            }, 50);

        }, 3500);
    });

    function renderMatches() {
        matchesList.innerHTML = '';
        mockMatches.forEach((match, index) => {
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
