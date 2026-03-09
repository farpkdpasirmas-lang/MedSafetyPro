const YOUR_SERVICE_ID = 'service_f74vyvs';
const YOUR_TEMPLATE_ID = 'template_e09jdh8';
const YOUR_PUBLIC_KEY = 'nNWVl0z63PnC1p8z4';

const templateParams = {
    to_email: 'test@example.com',
    reporter_name: 'Test Reporter'
};

const data = {
    service_id: YOUR_SERVICE_ID,
    template_id: YOUR_TEMPLATE_ID,
    user_id: YOUR_PUBLIC_KEY,
    template_params: templateParams
};

fetch('https://api.emailjs.com/api/v1.0/email/send', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json'
    },
    body: JSON.stringify(data)
})
    .then(response => {
        if (response.ok) {
            console.log('Success! Email sent.');
        } else {
            response.text().then(text => {
                console.error('Failed API Response:', response.status, text);
            });
        }
    })
    .catch(error => console.error('Error:', error));
