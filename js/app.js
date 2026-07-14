/* ============================================================
   SI DAGO GENERAL APP INTERACTIONS
   Handle Navbar toggles, FAQ accordions, and status banners.
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {
    // 1. Mobile Menu Hamburger Toggle
    const navToggle = document.getElementById('nav-toggle');
    const navMenu = document.getElementById('nav-menu');

    if (navToggle && navMenu) {
        navToggle.addEventListener('click', () => {
            navMenu.classList.toggle('active');
            // Toggle icon if boxicons is used
            const icon = navToggle.querySelector('i');
            if (icon) {
                if (navMenu.classList.contains('active')) {
                    icon.className = 'bx bx-x';
                } else {
                    icon.className = 'bx bx-menu';
                }
            }
        });
    }

    // 2. FAQ Accordion Logic
    const faqQuestions = document.querySelectorAll('.faq-question');
    faqQuestions.forEach(question => {
        question.addEventListener('click', () => {
            const item = question.parentElement;
            
            // Close other items
            document.querySelectorAll('.faq-item').forEach(otherItem => {
                if (otherItem !== item) {
                    otherItem.classList.remove('active');
                }
            });

            // Toggle current item
            item.classList.toggle('active');
        });
    });

    // 3. Simple Dynamic Update Date/Time
    const updateTimes = document.querySelectorAll('.update-time-str');
    const now = new Date();
    const timeStr = now.toLoc
    aleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB';
    
    updateTimes.forEach(el => {
        el.textContent = timeStr;
    });
});
