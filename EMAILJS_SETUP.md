# EmailJS Setup Guide for MedSafety Pro

This guide will help you set up EmailJS to send automatic email notifications when users submit feedback.

---

## 📧 Step 1: Create EmailJS Account

1. Go to **https://www.emailjs.com/**
2. Click **"Sign Up"** (top right)
3. Choose **"Sign up with Google"** or use email
4. Verify your email address
5. Complete registration

**Free Tier:** 200 emails/month (sufficient for most use cases)

---

## 🔗 Step 2: Add Email Service

1. Once logged in, go to **"Email Services"** in the left sidebar
2. Click **"Add New Service"**
3. Choose your email provider:
   - **Gmail** (Recommended - easiest setup)
   - Outlook
   - Yahoo
   - Or other SMTP service

### For Gmail:
1. Click **"Gmail"**
2. Click **"Connect Account"**
3. Sign in with your Gmail account
4. Allow EmailJS to send emails on your behalf
5. **Copy the Service ID** (e.g., `service_abc123`)
6. Click **"Create Service"**

**Important:** Save your **Service ID** - you'll need it later!

---

## 📝 Step 3: Create Email Template

1. Go to **"Email Templates"** in the left sidebar
2. Click **"Create New Template"**
3. Use this template configuration:

### Template Settings:

**Template Name:** `medsafety_feedback_notification`

**Subject:**
```
New Feedback Submission - MedSafety Pro
```

**Content (HTML):**
```html
<h2>New Feedback Submission</h2>

<p><strong>Submitted by:</strong> {{user_name}}</p>
<p><strong>Email:</strong> {{user_email}}</p>
<p><strong>Date:</strong> {{submission_date}}</p>

<hr>

<h3>Contributing Factors Selected:</h3>
<p>{{factors_list}}</p>

<hr>

<h3>Detailed Explanations:</h3>

{{#if staff_explanation}}
<h4>Staff Factor:</h4>
<p>{{staff_explanation}}</p>
{{/if}}

{{#if medication_explanation}}
<h4>Medication Related:</h4>
<p>{{medication_explanation}}</p>
{{/if}}

{{#if task_explanation}}
<h4>Task & Technology:</h4>
<p>{{task_explanation}}</p>
{{/if}}

{{#if environment_explanation}}
<h4>Work Environment:</h4>
<p>{{environment_explanation}}</p>
{{/if}}

{{#if team_explanation}}
<h4>Team Factors:</h4>
<p>{{team_explanation}}</p>
{{/if}}

{{#if others_explanation}}
<h4>Others:</h4>
<p>{{others_explanation}}</p>
{{/if}}

<hr>

<p><em>This is an automated notification from MedSafety Pro.</em></p>
```

4. Click **"Save"**
5. **Copy the Template ID** (e.g., `template_xyz789`)

---

## 🔑 Step 4: Get Your Public Key

1. Go to **"Account"** in the left sidebar
2. Find **"Public Key"** section
3. **Copy your Public Key** (e.g., `abcdefghijklmnop`)

---

## ✅ Step 5: Configure MedSafety Pro

Now you have three important credentials:

1. **Public Key:** `YOUR_PUBLIC_KEY`
2. **Service ID:** `YOUR_SERVICE_ID`
3. **Template ID:** `YOUR_TEMPLATE_ID`

### Update feedback.html:

Open `feedback.html` and find this section near the top of the `<script>` tag:

```javascript
// EmailJS Configuration
const EMAILJS_CONFIG = {
    publicKey: 'YOUR_PUBLIC_KEY',      // Replace with your Public Key
    serviceId: 'YOUR_SERVICE_ID',      // Replace with your Service ID
    templateId: 'YOUR_TEMPLATE_ID'     // Replace with your Template ID
};
```

**Replace the placeholder values** with your actual credentials:

```javascript
// EmailJS Configuration
const EMAILJS_CONFIG = {
    publicKey: 'abcdefghijklmnop',           // Your actual Public Key
    serviceId: 'service_abc123',             // Your actual Service ID
    templateId: 'template_xyz789'            // Your actual Template ID
};
```

**Save the file!**

---

## 🧪 Step 6: Test Email Notifications

1. Open your MedSafety Pro app
2. Login as a regular user (not reporter)
3. Go to **Maklumbalas** page
4. Select some contributing factors
5. Fill in explanations
6. Click **"Submit Feedback"**
7. You should see: **"Feedback submitted successfully! Admin has been notified."**
8. Check your email inbox - you should receive the notification!

---

## 📊 Step 7: Monitor Usage

1. Go to EmailJS dashboard
2. Click **"Email History"** to see sent emails
3. Monitor your quota (200 emails/month on free tier)
4. Upgrade if needed: https://www.emailjs.com/pricing/

---

## ⚠️ Troubleshooting

### Email not received?

1. **Check spam folder** - EmailJS emails might go to spam initially
2. **Verify credentials** - Make sure Public Key, Service ID, and Template ID are correct
3. **Check EmailJS dashboard** - Go to "Email History" to see if email was sent
4. **Check browser console** - Look for error messages (F12 → Console tab)

### Common Issues:

**Error: "Invalid public key"**
- Double-check your Public Key in EmailJS dashboard
- Make sure there are no extra spaces when copying

**Error: "Service not found"**
- Verify your Service ID
- Make sure the email service is active in EmailJS dashboard

**Error: "Template not found"**
- Check your Template ID
- Ensure the template is saved and published

**Emails going to spam:**
- Add your EmailJS sender address to your contacts
- Mark the first email as "Not Spam"
- Future emails should arrive in inbox

---

## 🔒 Security Notes

- ✅ Public Key is safe to expose in client-side code
- ✅ EmailJS prevents abuse with rate limiting
- ✅ Only configured templates can be sent
- ✅ No sensitive data is exposed

---

## 💡 Tips

1. **Test thoroughly** before deploying to production
2. **Add admin email to contacts** to avoid spam folder
3. **Monitor your quota** in EmailJS dashboard
4. **Upgrade if needed** - paid plans start at $7/month for 1000 emails

---

## 📞 Support

- **EmailJS Documentation:** https://www.emailjs.com/docs/
- **EmailJS Support:** support@emailjs.com
- **EmailJS Community:** https://www.emailjs.com/community/

---

## ✅ Setup Complete!

Once you've completed all steps and tested successfully, your MedSafety Pro app will automatically send email notifications to admins whenever users submit feedback!

**Next Steps:**
1. Deploy your updated app to Netlify
2. Test from the live site
3. Monitor email delivery
4. Enjoy automated notifications! 🎉
