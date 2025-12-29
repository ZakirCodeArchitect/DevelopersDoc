import nodemailer from 'nodemailer';

// Email configuration from environment variables
const emailUser = process.env.EMAIL_USER;
const emailPass = process.env.EMAIL_PASS;

if (!emailUser || !emailPass) {
  console.warn('Email credentials not configured. Email sending will be disabled.');
}

// Create reusable transporter
const transporter = emailUser && emailPass
  ? nodemailer.createTransport({
      service: 'gmail', // You can change this to your email provider
      auth: {
        user: emailUser,
        pass: emailPass,
      },
    })
  : null;

export interface ShareInvitationEmailParams {
  recipientEmail: string;
  recipientName?: string;
  sharerName?: string;
  itemName: string;
  itemType: 'document' | 'project';
  role: 'viewer' | 'editor';
  signUpUrl: string;
}

/**
 * Send a share invitation email
 */
export async function sendShareInvitationEmail({
  recipientEmail,
  recipientName,
  sharerName,
  itemName,
  itemType,
  role,
  signUpUrl,
}: ShareInvitationEmailParams): Promise<boolean> {
  if (!transporter) {
    console.warn('Email transporter not configured. Skipping email send.');
    return false;
  }

  try {
    const roleText = role === 'editor' ? 'edit' : 'view';
    const itemTypeText = itemType === 'document' ? 'document' : 'project';

    const mailOptions = {
      from: `"Developers Doc" <${emailUser}>`,
      to: recipientEmail,
      subject: `${sharerName || 'Someone'} shared a ${itemTypeText} with you`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #333;">You've been invited</h2>
          <p>
            ${sharerName ? `<strong>${sharerName}</strong> has` : 'You have been'} shared a ${itemTypeText} with you.
          </p>
          <p>
            <strong>${itemName}</strong><br>
            Permission: You can ${roleText} this ${itemTypeText}
          </p>
          <p>
            <a href="${signUpUrl}" style="background-color: #CC561E; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; display: inline-block;">
              ${recipientName ? 'View ' + itemTypeText : 'Sign up to access'}
            </a>
          </p>
          <p style="color: #666; font-size: 14px; margin-top: 30px;">
            If you don't have an account, you'll be prompted to sign up when you click the link above.
          </p>
        </div>
      `,
      text: `
You've been invited!

${sharerName || 'Someone'} has shared a ${itemTypeText} with you: ${itemName}

Permission: You can ${roleText} this ${itemTypeText}

${recipientName ? 'View the ' + itemTypeText + ':' : 'Sign up to access:'}
${signUpUrl}

If you don't have an account, you'll be prompted to sign up when you click the link above.
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Share invitation email sent:', info.messageId);
    return true;
  } catch (error) {
    console.error('Error sending share invitation email:', error);
    return false;
  }
}

