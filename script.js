// Header scroll behavior
        const header = document.getElementById('main-header');
        let lastScrollY = window.scrollY;
        
        window.addEventListener('scroll', () => {
            if (lastScrollY < window.scrollY && window.scrollY > 100) {
                header.classList.add('hidden');
            } else {
                header.classList.remove('hidden');
            }
            
            if (window.scrollY > 50) {
                header.classList.add('scrolled-up');
            } else {
                header.classList.remove('scrolled-up');
            }
            
            lastScrollY = window.scrollY;
        });
        
        // Mobile menu toggle
        const menuToggle = document.getElementById('menuToggle');
        const mainNav = document.getElementById('main-nav');
        
        menuToggle.addEventListener('click', () => {
            mainNav.classList.toggle('show');
        });
        
        // Theme toggle
        const themeToggle = document.getElementById('themeToggle');
        const themeIcon = themeToggle.querySelector('i');
        
        themeToggle.addEventListener('click', () => {
            document.body.classList.toggle('dark-theme');
            
            if (document.body.classList.contains('dark-theme')) {
                themeIcon.classList.remove('fa-moon');
                themeIcon.classList.add('fa-sun');
                localStorage.setItem('theme', 'dark');
            } else {
                themeIcon.classList.remove('fa-sun');
                themeIcon.classList.add('fa-moon');
                localStorage.setItem('theme', 'light');
            }
        });
        
        // Check for saved theme
        if (localStorage.getItem('theme') === 'dark') {
            document.body.classList.add('dark-theme');
            themeIcon.classList.remove('fa-moon');
            themeIcon.classList.add('fa-sun');
        }
        
        // Booking form submission
        const bookingForm = document.getElementById('bookingForm');

bookingForm.addEventListener('submit', (e) => {
  e.preventDefault();

  // Get form values
  const checkin = document.getElementById('checkin').value;
  const duration = document.getElementById('duration').value;
  const fullname = document.getElementById('fullname').value;
  const phone = document.getElementById('phone').value;
  const nic = document.getElementById('nic').value;
  const email = document.getElementById('email').value || 'Not provided';
  const address = document.getElementById('address').value || 'Not provided';

  // Construct the message text
  const message = 
`New Booking Request:
Name: ${fullname}
Phone: ${phone}
NIC: ${nic}
Check-in Date: ${checkin}
Duration: ${duration} months
Email: ${email}
Address: ${address}`;

  // Owner's WhatsApp number with country code (no +, no spaces)
  const ownerNumber = '94722775268'; // replace with actual number

  // WhatsApp URL with encoded message
  const whatsappURL = `https://wa.me/${ownerNumber}?text=${encodeURIComponent(message)}`;

  // Open WhatsApp chat in new tab/window
  window.open(whatsappURL, '_blank');

  // Optionally reset the form
  bookingForm.reset();
});

        
        // Set minimum date for booking (tomorrow)
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        const formattedDate = tomorrow.toISOString().split('T')[0];
        document.getElementById('checkin').min = formattedDate;
        
        // Smooth scrolling for anchor links
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', function(e) {
                e.preventDefault();
                
                document.querySelector(this.getAttribute('href')).scrollIntoView({
                    behavior: 'smooth'
                });
                
                // Close mobile menu if open
                mainNav.classList.remove('show');
            });
        });
        
        // Animate elements on scroll
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('animated');
                }
            });
        }, { threshold: 0.1 });
        
        // Observe elements for animations
        document.querySelectorAll('.property-card, .service-card, .testimonial-card').forEach(el => {
            observer.observe(el);
        });