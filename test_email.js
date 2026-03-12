const { Resend } = require('resend');

// Test the Resend API key directly
async function run() {
  const apiKey = 'YOUR_API_KEY'; // Replace when running locally or use process.env

  try {
    const resend = new Resend(process.env.RESEND_API_KEY || apiKey);

    console.log("Sending test email...");
    const data = await resend.emails.send({
      from: 'MedSafety Pro <onboarding@resend.dev>',
      to: ['your_email@example.com'], // Replace when running locally
      subject: 'Resend API Test',
      html: '<h1>Test Email</h1><p>Checking if API key and from address work.</p>'
    });

    console.log("Success:", data);
  } catch (error) {
    console.error("Error sending email:", error);
  }
}

run();
