const { Resend } = require('resend');
const nodemailer = require('nodemailer');

// Initialize Resend client if API key is present
const getResendClient = () => {
  if (process.env.RESEND_API_KEY) {
    return new Resend(process.env.RESEND_API_KEY);
  }
  return null;
};

// Fallback Nodemailer Transporter for local dev when RESEND_API_KEY is not set
let nodemailerTransporter = null;
const getNodemailerTransporter = () => {
  if (!nodemailerTransporter) {
    if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
      nodemailerTransporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
        },
      });
    } else {
      nodemailerTransporter = nodemailer.createTransport({
        jsonTransport: true,
      });
    }
  }
  return nodemailerTransporter;
};

/**
 * Core unified email sending function.
 * Uses Resend HTTPS API when RESEND_API_KEY is provided (bypasses Render SMTP port blocking),
 * otherwise falls back to Nodemailer SMTP / JSON transport.
 */
const sendEmail = async ({ to, subject, html, text }) => {
  const recipient = Array.isArray(to) ? to : [to];
  const fromAddress = process.env.RESEND_FROM_EMAIL || 'ExamPortal <onboarding@resend.dev>';

  console.log(`\n=================== SENDING EMAIL ===================`);
  console.log(`[Email] Recipient(s):`, recipient);
  console.log(`[Email] Subject:`, subject);
  console.log(`[Email] Provider:`, process.env.RESEND_API_KEY ? 'Resend HTTPS API' : 'Nodemailer Fallback');
  console.log(`=====================================================\n`);

  const resend = getResendClient();

  if (resend) {
    try {
      const response = await resend.emails.send({
        from: fromAddress,
        to: recipient,
        subject,
        html,
        text: text || '',
      });

      console.log('[Resend Email Response]:', JSON.stringify(response, null, 2));

      if (response.error) {
        console.error('[Resend Error Details]:');
        console.error('error.message:', response.error.message);
        console.error('error.name:', response.error.name);
        console.error('Full Error:', response.error);
        return { success: false, error: response.error };
      }

      return { success: true, info: response.data || response };
    } catch (resendErr) {
      console.error('[Resend Exception FULL Error Object]:');
      console.error('error.message:', resendErr.message);
      console.error('error.name:', resendErr.name);
      console.error('error.stack:', resendErr.stack);
      console.error('Full Error Object:', resendErr);
      return { success: false, error: resendErr };
    }
  }

  // Fallback to Nodemailer if RESEND_API_KEY is not set
  try {
    const transporter = getNodemailerTransporter();
    const info = await transporter.sendMail({
      from: process.env.EMAIL_USER || fromAddress,
      to: recipient.join(', '),
      subject,
      html,
      text: text || '',
    });
    console.log('[Nodemailer Sent Success]:', info);
    return { success: true, info };
  } catch (nmErr) {
    console.error('[Nodemailer Exception FULL Error Object]:');
    console.error('error.message:', nmErr.message);
    console.error('error.code:', nmErr.code);
    console.error('Full Error Object:', nmErr);
    return { success: false, error: nmErr };
  }
};

/**
 * Verify Email Service Connection on Server Startup
 */
const verifyTransporterOnStartup = async () => {
  console.log('\n=================== EMAIL SERVICE INITIALIZATION ===================');
  if (process.env.RESEND_API_KEY) {
    console.log('[EmailService] Resend HTTPS API Key detected.');
    console.log('[EmailService] Provider: Resend API (https://resend.com)');
    console.log('[EmailService] Default Sender:', process.env.RESEND_FROM_EMAIL || 'ExamPortal <onboarding@resend.dev>');
    console.log('====================================================================\n');
    return { success: true, provider: 'Resend' };
  } else {
    console.log('[EmailService] RESEND_API_KEY not found in environment.');
    console.log('[EmailService] Falling back to Nodemailer SMTP config.');
    console.log('[EmailService] Note: Render free tier blocks outbound SMTP ports (587/465).');
    console.log('[EmailService] To ensure reliable delivery on Render, set RESEND_API_KEY in environment.');
    console.log('====================================================================\n');
    return { success: false, provider: 'Nodemailer Fallback' };
  }
};

/**
 * Debug Route Handler for GET /api/test-email
 */
const testEmailDebug = async (req, res) => {
  console.log('\n=================== EMAIL DEBUG TEST ===================');
  const targetRecipient = req.query.to || process.env.EMAIL_USER || 'delivered@resend.dev';
  
  const result = await sendEmail({
    to: targetRecipient,
    subject: 'ExamPortal Debug Test Email',
    text: 'This is a test email sent from the GET /api/test-email debug endpoint.',
    html: '<h3>ExamPortal Email Debugger</h3><p>Resend HTTPS Email API configuration is working!</p>',
  });

  if (result.success) {
    return res.status(200).json({
      success: true,
      message: 'Test email sent successfully',
      provider: process.env.RESEND_API_KEY ? 'Resend API' : 'Nodemailer Fallback',
      recipient: targetRecipient,
      info: result.info,
    });
  } else {
    return res.status(500).json({
      success: false,
      message: 'Test email sending failed',
      provider: process.env.RESEND_API_KEY ? 'Resend API' : 'Nodemailer Fallback',
      recipient: targetRecipient,
      error: result.error,
    });
  }
};

/**
 * Send Exam Start Reminder (30 mins before start)
 */
const sendExamReminderEmail = async ({ toEmail, studentName, examTitle, examCode, startTime, durationMinutes }) => {
  const formattedStartTime = new Date(startTime).toLocaleString();
  const html = `
    <div style="font-family: Arial, sans-serif; background-color: #0f172a; color: #f8fafc; padding: 30px; border-radius: 12px;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #1e293b; border: 1px solid #334155; border-radius: 12px; padding: 24px;">
        <h2 style="color: #818cf8; margin-top: 0;">Online Examination Portal</h2>
        <hr style="border-color: #334155; margin: 16px 0;" />
        <h3 style="color: #ffffff;">Hello ${studentName || 'Student'},</h3>
        <p style="color: #cbd5e1; line-height: 1.6;">
          This is a reminder that your scheduled examination <strong>"${examTitle}"</strong> (Code: <code>${examCode}</code>) will start in <strong>30 minutes</strong>.
        </p>
        <div style="background-color: #0f172a; padding: 16px; border-radius: 8px; margin: 20px 0; border: 1px solid #475569;">
          <p style="margin: 4px 0; color: #94a3b8; font-size: 13px;">📅 Start Time: <strong style="color: #f8fafc;">${formattedStartTime}</strong></p>
          <p style="margin: 4px 0; color: #94a3b8; font-size: 13px;">⏱️ Duration: <strong style="color: #f8fafc;">${durationMinutes || 60} Minutes</strong></p>
        </div>
        <p style="color: #cbd5e1; font-size: 14px;">
          Please make sure you log into your student dashboard on time with a stable internet connection.
        </p>
        <div style="margin-top: 24px; text-align: center;">
          <a href="${process.env.CLIENT_URL || 'http://localhost:5173'}/student" 
             style="background-color: #4f46e5; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
            Go to Student Dashboard
          </a>
        </div>
      </div>
    </div>
  `;

  return await sendEmail({
    to: toEmail,
    subject: `⏰ Upcoming Exam Reminder: ${examTitle} Starts in 30 Minutes`,
    html,
  });
};

/**
 * Send Exam Results Ready Email
 */
const sendExamResultsEmail = async ({ toEmail, studentName, examTitle, score, totalMarks, isPassed, attemptId }) => {
  const percentage = Math.round((score / (totalMarks || 100)) * 100);
  const resultStatusText = isPassed ? 'PASSED 🎉' : 'NEEDS IMPROVEMENT';
  const statusColor = isPassed ? '#10b981' : '#f43f5e';

  const html = `
    <div style="font-family: Arial, sans-serif; background-color: #0f172a; color: #f8fafc; padding: 30px; border-radius: 12px;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #1e293b; border: 1px solid #334155; border-radius: 12px; padding: 24px;">
        <h2 style="color: #818cf8; margin-top: 0;">Online Examination Portal</h2>
        <hr style="border-color: #334155; margin: 16px 0;" />
        <h3 style="color: #ffffff;">Hello ${studentName || 'Student'},</h3>
        <p style="color: #cbd5e1; line-height: 1.6;">
          Your evaluation for the examination <strong>"${examTitle}"</strong> is now complete and published.
        </p>
        <div style="background-color: #0f172a; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #475569; text-align: center;">
          <span style="font-size: 12px; text-transform: uppercase; color: #94a3b8; letter-spacing: 1px; font-weight: bold;">Status</span>
          <h3 style="color: ${statusColor}; margin: 6px 0 12px 0;">${resultStatusText}</h3>
          <div style="font-size: 32px; font-weight: bold; color: #ffffff;">
            ${score} <span style="font-size: 16px; color: #94a3b8;">/ ${totalMarks || 100} Points (${percentage}%)</span>
          </div>
        </div>
        <p style="color: #cbd5e1; font-size: 14px;">
          ${isPassed ? 'Congratulations on passing the exam! You can view your detailed question analysis and download your official certificate on the portal.' : 'You can log into the portal to review your answers and solutions.'}
        </p>
        <div style="margin-top: 24px; text-align: center;">
          <a href="${process.env.CLIENT_URL || 'http://localhost:5173'}/results/${attemptId}" 
             style="background-color: #4f46e5; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
            View Detailed Results Breakdown
          </a>
        </div>
      </div>
    </div>
  `;

  return await sendEmail({
    to: toEmail,
    subject: `📊 Your Exam Results are Ready: ${examTitle}`,
    html,
  });
};

/**
 * Send OTP Email Verification Code
 */
const sendOtpVerificationEmail = async ({ toEmail, userName, otpCode }) => {
  console.log(`\n==================================================`);
  console.log(`[OTP Service] VERIFICATION CODE FOR ${toEmail}: ${otpCode}`);
  console.log(`==================================================\n`);

  const html = `
    <div style="font-family: Arial, sans-serif; background-color: #fafafa; color: #111827; padding: 30px; border-radius: 12px;">
      <div style="max-width: 500px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 32px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
        <div style="text-align: center; margin-bottom: 24px;">
          <span style="font-size: 24px; font-weight: bold; color: #dc2626;">ExamPortal</span>
        </div>
        <h2 style="color: #111827; font-size: 20px; font-weight: bold; margin-top: 0; text-align: center;">Verify Your Email Address</h2>
        <p style="color: #4b5563; font-size: 14px; line-height: 1.6; text-align: center;">
          Hello <strong>${userName || 'User'}</strong>,<br/>
          Thank you for registering with ExamPortal! Use the 6-digit OTP code below to verify your email address:
        </p>
        <div style="background-color: #fef2f2; border: 1px solid #fca5a5; padding: 20px; border-radius: 8px; margin: 24px 0; text-align: center;">
          <span style="font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #dc2626;">${otpCode}</span>
        </div>
        <p style="color: #6b7280; font-size: 13px; text-align: center;">
          This code will expire in <strong>10 minutes</strong>. If you did not request this code, please ignore this email.
        </p>
      </div>
    </div>
  `;

  return await sendEmail({
    to: toEmail,
    subject: `Your ExamPortal Verification Code`,
    html,
    text: `Your ExamPortal verification code is: ${otpCode}`,
  });
};

/**
 * Send Teacher Approval Notification Email
 */
const sendTeacherApprovalEmail = async ({ toEmail, userName }) => {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 12px; background-color: #ffffff;">
      <div style="text-align: center; border-bottom: 1px solid #e5e7eb; padding-bottom: 16px; margin-bottom: 20px;">
        <h2 style="color: #dc2626; margin: 0; font-size: 24px; font-weight: 800;">EXAM<span style="color: #111827;">PORTAL</span></h2>
        <p style="color: #6b7280; font-size: 12px; margin: 4px 0 0 0; text-transform: uppercase;">Teacher Approval Notification</p>
      </div>
      <div style="padding: 10px 0;">
        <h3 style="color: #111827; margin-top: 0;">Congratulations, ${userName || 'Teacher'}!</h3>
        <p style="color: #374151; font-size: 14px; line-height: 1.6;">
          Your teacher account has been <strong>approved by platform administrators</strong>. You now have full access to create courses, build exams, invite candidates, and review student grades.
        </p>
        <div style="background-color: #ecfdf5; border: 1px solid #a7f3d0; padding: 16px; border-radius: 8px; margin: 24px 0; text-align: center;">
          <span style="font-size: 16px; font-weight: 700; color: #047857;">Account Status: APPROVED & ACTIVE</span>
        </div>
        <p style="color: #6b7280; font-size: 13px; text-align: center;">
          Log in to your Teacher Dashboard now to start building your assessments.
        </p>
      </div>
    </div>
  `;

  return await sendEmail({
    to: toEmail,
    subject: '✅ Teacher Account Approved - ExamPortal',
    html,
  });
};

/**
 * Send Teacher Rejection Notification Email
 */
const sendTeacherRejectionEmail = async ({ toEmail, userName, reason }) => {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 12px; background-color: #ffffff;">
      <div style="text-align: center; border-bottom: 1px solid #e5e7eb; padding-bottom: 16px; margin-bottom: 20px;">
        <h2 style="color: #dc2626; margin: 0; font-size: 24px; font-weight: 800;">EXAM<span style="color: #111827;">PORTAL</span></h2>
        <p style="color: #6b7280; font-size: 12px; margin: 4px 0 0 0; text-transform: uppercase;">Teacher Approval Notification</p>
      </div>
      <div style="padding: 10px 0;">
        <h3 style="color: #111827; margin-top: 0;">Hello ${userName || 'User'},</h3>
        <p style="color: #374151; font-size: 14px; line-height: 1.6;">
          Thank you for registering a teacher account on ExamPortal. After administrative review, your request for teacher access was not approved at this time.
        </p>
        ${reason ? `
        <div style="background-color: #fef2f2; border: 1px solid #fca5a5; padding: 16px; border-radius: 8px; margin: 20px 0; color: #991b1b; font-size: 13px;">
          <strong>Reason specified by Admin:</strong><br />
          ${reason}
        </div>
        ` : ''}
        <p style="color: #6b7280; font-size: 13px;">
          If you believe this decision was made in error, please contact support or your institution administrator.
        </p>
      </div>
    </div>
  `;

  return await sendEmail({
    to: toEmail,
    subject: 'Teacher Account Status Update - ExamPortal',
    html,
  });
};

module.exports = {
  sendEmail,
  verifyTransporterOnStartup,
  testEmailDebug,
  sendExamReminderEmail,
  sendExamResultsEmail,
  sendOtpVerificationEmail,
  sendTeacherApprovalEmail,
  sendTeacherRejectionEmail,
};
