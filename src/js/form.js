// Form validation and submission
document.getElementById('contact-form').addEventListener('submit', async function(e) {
    e.preventDefault();

    const form = this;
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;

    // Get form data
    const formData = new FormData(form);
    const data = Object.fromEntries(formData);

    // Validate form
    if (!data.name || !data.email || !data.message) {
        alert('Please fill in all fields');
        return;
    }

    if (!isValidEmail(data.email)) {
        alert('Please enter a valid email address');
        return;
    }

    // Recipient (your email)
    const recipientEmail = 'binh.vd01500@sinhvien.hoasen.edu.vn';

    // Helper to reset button state
    function resetButton() {
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
    }

    submitBtn.textContent = 'Sending...';
    submitBtn.disabled = true;

    // 1) Try EmailJS if available and configured via data attributes on the form
    // To use EmailJS: set data-emailjs-service and data-emailjs-template on the <form>
    // and call emailjs.init('YOUR_PUBLIC_KEY') in index.html (see README comments).
    const emailjsService = form.dataset.emailjsService; // e.g. 'service_xxx'
    const emailjsTemplate = form.dataset.emailjsTemplate; // e.g. 'template_xxx'

    if (window.emailjs && emailjsService && emailjsTemplate) {
        try {
            // template params - adjust according to your EmailJS template fields
            const templateParams = {
                from_name: data.name,
                from_email: data.email,
                message: data.message,
                to_email: recipientEmail,
            };

            await emailjs.send(emailjsService, emailjsTemplate, templateParams);
            submitBtn.textContent = 'Message Sent! ✓';
            form.reset();
            setTimeout(resetButton, 3000);
            return;
        } catch (err) {
            console.error('EmailJS error:', err);
            alert('Không gửi được qua EmailJS. Thử phương thức khác.');
            // fall through to next method
        }
    }

    // 2) If the form action points to Formspree (or similar) submit via fetch
    // If you want to use Formspree, set the <form action="https://formspree.io/f/your-id" method="POST"> in HTML
    const action = form.getAttribute('action') || '';
    if (action.includes('formspree.io')) {
        try {
            const resp = await fetch(action, {
                method: form.method || 'POST',
                body: formData,
                headers: { 'Accept': 'application/json' }
            });
            const json = await resp.json();
            if (resp.ok) {
                submitBtn.textContent = 'Message Sent! ✓';
                form.reset();
                setTimeout(resetButton, 3000);
                return;
            } else {
                console.error('Formspree error:', json);
                alert('Formspree: Không gửi được. Vui lòng kiểm tra cấu hình Formspree.');
            }
        } catch (err) {
            console.error('Formspree fetch error:', err);
            alert('Formspree: Lỗi mạng hoặc cấu hình.');
        }
    }

    // 3) Fallback: open user's email client with mailto: (will NOT auto-send)
    // Construct mailto link with subject and body
    const subject = encodeURIComponent(`Contact from ${data.name}`);
    const body = encodeURIComponent(`From: ${data.name} <${data.email}>\n\n${data.message}`);
    const mailto = `mailto:${recipientEmail}?subject=${subject}&body=${body}`;

    // Open mail client
    window.location.href = mailto;
    submitBtn.textContent = 'Opened email client';
    setTimeout(() => {
        resetButton();
        form.reset();
    }, 2000);
});

// Email validation
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}