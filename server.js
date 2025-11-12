const express = require('express');
const cors = require('cors');
const sgMail = require('@sendgrid/mail');

const app = express();

// Set SendGrid API key from environment variable
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));

const PORT = process.env.PORT || 3000;

// ============ EMAIL ENDPOINT ============
app.post('/send-pdf-email', async (req, res) => {
  try {
    const { 
      recipientEmail, 
      recipientName, 
      senderName, 
      senderType, // 'owner' or 'manager'
      pdfBase64, 
      pdfFilename,
      ccEmail,
      quartersLabel 
    } = req.body;

    // Validate required fields
    if (!recipientEmail || !pdfBase64 || !pdfFilename) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Validate email format
    if (!recipientEmail.includes('@')) {
      return res.status(400).json({ error: 'Invalid email address' });
    }

    // Generate subject and email body based on type
    const today = new Date();
    const dateStr = today.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    
    let subject, htmlBody;
    
    if (senderType === 'owner') {
      subject = `Your Quarterly Pipeline Snapshot - ${dateStr}`;
      htmlBody = `
        <html>
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; background-color: #f9f9f9; padding: 20px;">
            <div style="background-color: #ffffff; padding: 30px; border-radius: 8px; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #031c59; margin-top: 0;">Your Quarterly Pipeline Snapshot</h2>
              
              <p>Hi ${recipientName},</p>
              
              <p>Please find attached your quarterly pipeline snapshot. This report provides a comprehensive overview of your pipeline metrics, quota attainment, and key performance indicators.</p>
              
              <p><strong>Review the attached PDF for details on:</strong></p>
              <ul>
                <li>Your current quota status</li>
                <li>Closed won progress and attainment percentage</li>
                <li>Pipeline forecast breakdown</li>
                <li>Pipeline to remaining quota coverage ratios</li>
                <li>Detailed pipeline analysis and recommendations</li>
              </ul>
              
              <p>If you have any questions about your pipeline or metrics, please reach out.</p>
              
              <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
              <p style="font-size: 12px; color: #666;">Best regards,<br/>Sales Operations Team</p>
            </div>
          </body>
        </html>
      `;
    } else {
      subject = `${senderName}'s Team Pipeline Snapshot - ${dateStr}`;
      htmlBody = `
        <html>
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; background-color: #f9f9f9; padding: 20px;">
            <div style="background-color: #ffffff; padding: 30px; border-radius: 8px; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #031c59; margin-top: 0;">${senderName}'s Team Pipeline Snapshot</h2>
              
              <p>Hi ${recipientName},</p>
              
              <p>Please find attached your team's quarterly pipeline snapshot. This report provides a comprehensive overview of your team's collective pipeline metrics, quota attainment, and key performance indicators.</p>
              
              <p><strong>Review the attached PDF for details on:</strong></p>
              <ul>
                <li>Team quota status and breakdown</li>
                <li>Team closed won progress and attainment percentage</li>
                <li>Team pipeline forecast breakdown</li>
                <li>At-risk team members and their status</li>
                <li>Team pipeline to remaining quota coverage ratios</li>
                <li>Detailed team pipeline analysis and recommendations</li>
              </ul>
              
              <p>If you have any questions about your team's pipeline or metrics, please reach out.</p>
              
              <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
              <p style="font-size: 12px; color: #666;">Best regards,<br/>Sales Operations Team</p>
            </div>
          </body>
        </html>
      `;
    }

    // Convert base64 to buffer
    const pdfBuffer = Buffer.from(pdfBase64, 'base64');

    // Prepare email message
    const msg = {
      to: recipientEmail,
      cc: ccEmail,
      from: 'michael.rybacki@smartsheet.com',
      subject: subject,
      html: htmlBody,
      attachments: [
        {
          content: pdfBuffer.toString('base64'),
          filename: pdfFilename,
          type: 'application/pdf',
          disposition: 'attachment'
        }
      ]
    };

    // Send email via SendGrid
    await sgMail.send(msg);

    console.log(`Email sent successfully to ${recipientEmail}`);
    res.json({ 
      success: true, 
      message: `Email sent to ${recipientEmail}`,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error sending email:', error);
    
    // Send detailed error message for debugging
    let errorMessage = error.message;
    if (error.response) {
     errorMessage = `SendGrid Error: ${error.response?.body?.errors?.[0]?.message || error.message}`;
    }
    
    res.status(500).json({ 
      error: errorMessage,
      timestamp: new Date().toISOString()
    });
  }
});

// ============ HEALTH CHECK ENDPOINT ============
app.get('/health', (req, res) => {
  res.json({ 
    status: 'Backend is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// ============ LOGGING ENDPOINT ============
app.get('/logs', (req, res) => {
  res.json({ 
    message: 'Backend is operational',
    sendgridConfigured: !!process.env.SENDGRID_API_KEY,
    timestamp: new Date().toISOString()
  });
});

// ============ ERROR HANDLING ============
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ 
    error: 'Internal server error',
    message: err.message 
  });
});

// ============ START SERVER ============
app.listen(PORT, () => {
  console.log(`🚀 CGE Backend Server running on port ${PORT}`);
  console.log(`📧 Email service: ${process.env.SENDGRID_API_KEY ? 'Configured' : 'NOT CONFIGURED'}`);
  console.log(`⏰ Started at: ${new Date().toISOString()}`);
});
