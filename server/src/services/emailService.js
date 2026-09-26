const nodemailer = require('nodemailer');

// Initialize Nodemailer Transporter with real Gmail SMTP configuration
let transporter = null;

const getTransporter = () => {
  if (!transporter) {
    if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
      transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
        },
      });
    } else {
      // Fallback JSON transporter if EMAIL_USER/EMAIL_PASS are not yet populated in .env
      transporter = nodemailer.createTransport({
        jsonTransport: true,
      });
    }
  }
  return transporter;
};

/**
 * Verify Transporter Connection on Server Startup
 */
const verifyTransporterOnStartup = async () => {
  console.log('\n=================== SMTP CONNECTION VERIFICATION ===================');
  const userVal = process.env.EMAIL_USER || '(NOT SET)';
  const passVal = process.env.EMAIL_PASS || '';
  
  console.log('[SMTP] process.env.EMAIL_USER:', userVal);
  if (passVal) {
    console.log(`[SMTP] process.env.EMAIL_PASS: ${passVal.substring(0, 4)}**** (length: ${passVal.length})`);
  } else {
    console.log('[SMTP] process.env.EMAIL_PASS: (NOT SET)');
  }

  try {
    const activeTransporter = getTransporter();
    const result = await activeTransporter.verify();
    console.log('[SMTP] transporter.verify() Status: SUCCESS');
    console.log('[SMTP] transporter.verify() Output:', result);
    console.log('====================================================================\n');
    return { success: true, result };
  } catch (err) {
    console.error('[SMTP] transporter.verify() Status: FAILED');
    console.error('[SMTP] error.message:', err.message);
    console.error('[SMTP] error.code:', err.code);
    console.error('[SMTP] Full error:', err);
    console.log('====================================================================\n');
    return { success: false, error: err };
  }
};

/**
 * Temporary Debug Route Handler for GET /api/test-email
 */
const testEmailDebug = async (req, res) => {
  console.log('\n=================== EMAIL DEBUG TEST ===================');

  const rawUser = process.env.EMAIL_USER || '(NOT SET)';
  const rawPass = process.env.EMAIL_PASS || '';

  console.log('process.env.EMAIL_USER value (full):', rawUser);

  if (rawPass) {
    const maskedPass = `${rawPass.substring(0, 4)}${'*'.repeat(Math.max(0, rawPass.length - 4))} (length: ${rawPass.length})`;
    console.log('process.env.EMAIL_PASS (masked):', maskedPass);
  } else {
    console.log('process.env.EMAIL_PASS (masked): (NOT SET)');
  }

  // Check transporter.verify()
  const activeTransporter = getTransporter();
  let verifySuccess = false;
  let verifyResult = null;

  try {
    verifyResult = await activeTransporter.verify();
    verifySuccess = true;
    console.log('transporter.verify() status: SUCCEEDED');
    console.log('transporter.verify() exact output:', verifyResult);
  } catch (vErr) {
    verifySuccess = false;
    verifyResult = vErr;
    console.error('transporter.verify() status: FAILED');
    console.error('transporter.verify() exact output:', vErr);
  }

  // Target recipient
  const targetRecipient = req.query.to || process.env.EMAIL_USER || 'test@example.com';
  console.log(`Attempting to send debug test email to: ${targetRecipient}`);

  try {
    const mailOptions = {
      from: process.env.EMAIL_USER || '"Online Exam Portal" <no-reply@examportal.com>',
      to: targetRecipient,
      subject: 'ExamPortal Debug Test Email',
      text: 'This is a test email sent from the GET /api/test-email debug endpoint.',
      html: '<h3>ExamPortal Email Debugger</h3><p>Nodemailer Gmail SMTP configuration is working!</p>',
    };

    const sendInfo = await activeTransporter.sendMail(mailOptions);
    console.log('Nodemailer complete success response:', sendInfo);
    console.log('Message ID returned:', sendInfo.messageId);
    console.log('========================================================\n');

    return res.status(200).json({
      success: true,
      message: 'Test email sent successfully',
      emailUser: rawUser,
      emailPassMasked: rawPass ? `${rawPass.substring(0, 4)}**** (length: ${rawPass.length})` : '(NOT SET)',
      transporterVerifySuccess: verifySuccess,
      transporterVerifyResult: verifyResult,
      messageId: sendInfo.messageId,
      sendInfo,
    });
  } catch (sendErr) {
    console.error('Nodemailer COMPLETE ERROR OBJECT:');
    console.error('error.message:', sendErr.message);
    console.error('error.code:', sendErr.code);
    console.error('Full error object:', sendErr);
    console.log('========================================================\n');

    return res.status(500).json({
      success: false,
      message: 'Test email sending failed',
      emailUser: rawUser,
      emailPassMasked: rawPass ? `${rawPass.substring(0, 4)}**** (length: ${rawPass.length})` : '(NOT SET)',
      transporterVerifySuccess: verifySuccess,
      transporterVerifyResult: verifyResult ? (verifyResult.message || verifyResult) : null,
      error: {
        message: sendErr.message,
        code: sendErr.code,
        fullError: sendErr,
      },
    });
  }
};

/**
 * Send Exam Start Reminder (30 mins before start)
 */
const sendExamReminderEmail = async ({ toEmail, studentName, examTitle, examCode, startTime, durationMinutes }) => {
  try {
    const fromAddress = process.env.EMAIL_USER || '"Online Exam Portal" <no-reply@examportal.com>';
    const formattedStartTime = new Date(startTime).toLocaleString();

    const mailOptions = {
      from: fromAddress,
      to: toEmail,
      subject: `⏰ Upcoming Exam Reminder: ${examTitle} Starts in 30 Minutes`,
      html: `
        <div style="font-family: Arial, sans-serif; background-color: #0f172a; color: #f8fafc; padding: 30px; borderRadius: 12px;">
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
      `,
    };

    const info = await getTransporter().sendMail(mailOptions);
    console.log(`[EmailService] Reminder email sent to ${toEmail}. Message ID / Response:`, info.messageId || info.message);
    return { success: true, info };
  } catch (err) {
    console.error(`[EmailService] Error sending reminder email to ${toEmail}:`, err.message);
    return { success: false, error: err.message };
  }
};

/**
 * Send Exam Results Ready Email
 */
const sendExamResultsEmail = async ({ toEmail, studentName, examTitle, score, totalMarks, isPassed, attemptId }) => {
  try {
    const fromAddress = process.env.EMAIL_USER || '"Online Exam Portal" <no-reply@examportal.com>';
    const percentage = Math.round((score / (totalMarks || 100)) * 100);
    const resultStatusText = isPassed ? 'PASSED 🎉' : 'NEEDS IMPROVEMENT';
    const statusColor = isPassed ? '#10b981' : '#f43f5e';

    const mailOptions = {
      from: fromAddress,
      to: toEmail,
      subject: `📊 Your Exam Results are Ready: ${examTitle}`,
      html: `
        <div style="font-family: Arial, sans-serif; background-color: #0f172a; color: #f8fafc; padding: 30px; borderRadius: 12px;">
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
      `,
    };

    const info = await getTransporter().sendMail(mailOptions);
    console.log(`[EmailService] Results email sent to ${toEmail}. Message ID / Response:`, info.messageId || info.message);
    return { success: true, info };
  } catch (err) {
    console.error(`[EmailService] Error sending results email to ${toEmail}:`, err.message);
    return { success: false, error: err.message };
  }
};

/**
 * Send OTP Email Verification Code
 */
const sendOtpVerificationEmail = async ({ toEmail, userName, otpCode }) => {
  try {
    const fromAddress = process.env.EMAIL_USER || '"Online Exam Portal" <no-reply@examportal.com>';

    console.log(`\n==================================================`);
    console.log(`[OTP Service] VERIFICATION CODE FOR ${toEmail}: ${otpCode}`);
    console.log(`==================================================\n`);

    const mailOptions = {
      from: fromAddress,
      to: toEmail,
      subject: `Your ExamPortal Verification Code`,
      html: `
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
      `,
    };

    const info = await getTransporter().sendMail(mailOptions);
    console.log(`[EmailService] OTP email sent successfully to ${toEmail}. Message ID / Response:`, info.messageId || info.message || info);
    return { success: true, info };
  } catch (err) {
    console.error(`[EmailService] ERROR sending OTP email to ${toEmail}:`);
    console.error(`error.message: ${err.message}`);
    console.error(`error.code: ${err.code}`);
    console.error(`Full error object:`, err);
    return { success: false, error: err.message, code: err.code, fullError: err };
  }
};

/**
 * Send Teacher Approval Notification Email
 */
const sendTeacherApprovalEmail = async ({ toEmail, userName }) => {
  try {
    const mailOptions = {
      from: `"Exam Portal Admin" <${process.env.EMAIL_USER || 'no-reply@examportal.com'}>`,
      to: toEmail,
      subject: '✅ Teacher Account Approved - ExamPortal',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 12px; background-color: #ffffff;">
          <div style="text-align: center; border-b: 1px solid #e5e7eb; padding-bottom: 16px; margin-bottom: 20px;">
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
      `,
    };

    const info = await getTransporter().sendMail(mailOptions);
    console.log(`[EmailService] Teacher approval email sent to ${toEmail}`);
    return { success: true, info };
  } catch (err) {
    console.error(`[EmailService] Error sending teacher approval email to ${toEmail}:`, err.message);
    return { success: false, error: err.message };
  }
};

/**
 * Send Teacher Rejection Notification Email
 */
const sendTeacherRejectionEmail = async ({ toEmail, userName, reason }) => {
  try {
    const mailOptions = {
      from: `"Exam Portal Admin" <${process.env.EMAIL_USER || 'no-reply@examportal.com'}>`,
      to: toEmail,
      subject: 'Teacher Account Status Update - ExamPortal',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 12px; background-color: #ffffff;">
          <div style="text-align: center; border-b: 1px solid #e5e7eb; padding-bottom: 16px; margin-bottom: 20px;">
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
      `,
    };

    const info = await getTransporter().sendMail(mailOptions);
    console.log(`[EmailService] Teacher rejection email sent to ${toEmail}`);
    return { success: true, info };
  } catch (err) {
    console.error(`[EmailService] Error sending teacher rejection email to ${toEmail}:`, err.message);
    return { success: false, error: err.message };
  }
};

module.exports = {
  getTransporter,
  verifyTransporterOnStartup,
  testEmailDebug,
  sendExamReminderEmail,
  sendExamResultsEmail,
  sendOtpVerificationEmail,
  sendTeacherApprovalEmail,
  sendTeacherRejectionEmail,
};



