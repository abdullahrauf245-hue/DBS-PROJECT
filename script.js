document.addEventListener('DOMContentLoaded', () => {
    // 1. Number Counter Animation for Stats Cards
    const counters = document.querySelectorAll('.counter');
    const speed = 200; // The lower the slower

    counters.forEach(counter => {
        const updateCount = () => {
            const target = +counter.getAttribute('data-target');
            const count = +counter.innerText;

            // Lower inc to slow and higher to speed up
            const inc = target / speed;

            // Check if target is reached
            if (count < target) {
                // Add inc to count and output in counter
                counter.innerText = Math.ceil(count + inc);
                // Call function every ms
                setTimeout(updateCount, 15);
            } else {
                counter.innerText = target;
            }
        };

        updateCount();
    });

    // 2. Active State Toggling in Sidebar
    const navItems = document.querySelectorAll('.nav-item');
    
    navItems.forEach(item => {
        item.addEventListener('click', function(e) {
            if(this.classList.contains('text-danger')) return; // Ignore logout
            e.preventDefault();
            
            // Remove active from all
            navItems.forEach(nav => nav.classList.remove('active'));
            
            // Add active to clicked
            this.classList.add('active');
        });
    });

    // 3. Simple Search Interaction
    const searchInput = document.querySelector('.search-bar input');
    
    searchInput.addEventListener('focus', () => {
        document.querySelector('.search-bar').style.boxShadow = '0 0 0 4px rgba(230, 57, 70, 0.1)';
    });

    searchInput.addEventListener('blur', () => {
        document.querySelector('.search-bar').style.boxShadow = 'none';
    });
});
