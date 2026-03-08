import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// =====================================================
// TYPES
// =====================================================

export interface NotificationData {
  recipient_id: string;
  template_code: string;
  variables: Record<string, any>;
  related_entity_type?: string;
  related_entity_id?: string;
  priority?: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
}

export interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
}

// =====================================================
// EMAIL TRANSPORTER
// =====================================================

let emailTransporter: any = null;

function getEmailTransporter() {
  if (!emailTransporter) {
    const config: EmailConfig = {
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: false,
      auth: {
        user: process.env.SMTP_USER || '',
        pass: process.env.SMTP_PASS || '',
      },
    };

    if (config.auth.user && config.auth.pass) {
      try {
        const nodemailer = require('nodemailer');
        emailTransporter = nodemailer.createTransport(config);
      } catch (error) {
        console.log('nodemailer not installed. Email notifications disabled.');
      }
    }
  }

  return emailTransporter;
}

// =====================================================
// CREATE NOTIFICATION
// =====================================================

export async function createNotification(
  data: NotificationData
): Promise<string> {
  try {
    const result = await pool.query(
      `SELECT send_notification($1, $2, $3, $4, $5) as notification_id`,
      [
        data.recipient_id,
        data.template_code,
        JSON.stringify(data.variables),
        data.related_entity_type || null,
        data.related_entity_id || null,
      ]
    );

    const notificationId = result.rows[0].notification_id;

    // Queue for async delivery
    setImmediate(() => {
      deliverNotification(notificationId).catch(err => {
        console.error('Error delivering notification:', err);
      });
    });

    return notificationId;

  } catch (error: any) {
    console.error('❌ Error creating notification:', error);
    throw error;
  }
}

// =====================================================
// DELIVER NOTIFICATION
// =====================================================

async function deliverNotification(notificationId: string): Promise<void> {
  try {
    // Get notification details
    const result = await pool.query(
      `SELECT 
        n.*,
        t.email_subject,
        t.email_body,
        t.sms_body
       FROM notifications n
       LEFT JOIN notification_templates t ON n.notification_type = t.template_code
       WHERE n.id = $1`,
      [notificationId]
    );

    if (result.rows.length === 0) {
      return;
    }

    const notification = result.rows[0];

    // Replace variables in templates
    const variables = notification.metadata || {};
    let emailSubject = notification.email_subject || notification.title;
    let emailBody = notification.email_body || notification.message;
    let smsBody = notification.sms_body || notification.message;

    for (const [key, value] of Object.entries(variables)) {
      const placeholder = `{{${key}}}`;
      emailSubject = emailSubject?.replace(new RegExp(placeholder, 'g'), String(value));
      emailBody = emailBody?.replace(new RegExp(placeholder, 'g'), String(value));
      smsBody = smsBody?.replace(new RegExp(placeholder, 'g'), String(value));
    }

    // Send email
    if (notification.send_email && notification.recipient_email) {
      try {
        await sendEmail(
          notification.recipient_email,
          emailSubject,
          emailBody
        );

        await pool.query(
          `UPDATE notifications 
           SET email_sent = true, email_sent_at = NOW()
           WHERE id = $1`,
          [notificationId]
        );
      } catch (emailError: any) {
        await pool.query(
          `UPDATE notifications 
           SET email_error = $1
           WHERE id = $2`,
          [emailError.message, notificationId]
        );
      }
    }

    // Send SMS
    if (notification.send_sms && notification.recipient_phone) {
      try {
        await sendSMS(
          notification.recipient_phone,
          smsBody
        );

        await pool.query(
          `UPDATE notifications 
           SET sms_sent = true, sms_sent_at = NOW()
           WHERE id = $1`,
          [notificationId]
        );
      } catch (smsError: any) {
        await pool.query(
          `UPDATE notifications 
           SET sms_error = $1
           WHERE id = $2`,
          [smsError.message, notificationId]
        );
      }
    }

  } catch (error: any) {
    console.error('❌ Error delivering notification:', error);
  }
}

// =====================================================
// SEND EMAIL
// =====================================================

async function sendEmail(
  to: string,
  subject: string,
  body: string
): Promise<void> {
  const transporter = getEmailTransporter();

  if (!transporter) {
    console.log('Email transporter not configured. Skipping email delivery.');
    return;
  }

  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to,
      subject,
      text: body,
      html: body.replace(/\n/g, '<br>'),
    });

    console.log(`✅ Email sent to ${to}`);
  } catch (error: any) {
    console.error(`❌ Error sending email to ${to}:`, error.message);
    throw error;
  }
}

// =====================================================
// SEND SMS
// =====================================================

async function sendSMS(
  to: string,
  message: string
): Promise<void> {
  // Twilio integration (optional)
  if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
    try {
      const twilio = require('twilio');
      const client = twilio(
        process.env.TWILIO_ACCOUNT_SID,
        process.env.TWILIO_AUTH_TOKEN
      );

      await client.messages.create({
        body: message,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: to,
      });

      console.log(`✅ SMS sent to ${to}`);
    } catch (error: any) {
      console.error(`❌ Error sending SMS to ${to}:`, error.message);
      throw error;
    }
  } else {
    console.log('SMS service not configured. Skipping SMS delivery.');
  }
}

// =====================================================
// NOTIFY LEAVE SUBMITTED
// =====================================================

export async function notifyLeaveSubmitted(
  leaveRequestId: string,
  managerId: string
): Promise<void> {
  try {
    // Get leave request details
    const result = await pool.query(
      `SELECT 
        lr.*,
        lt.name as leave_type_name,
        s.firstname || ' ' || s.lastname as manager_name
       FROM leave_requests lr
       LEFT JOIN leave_types lt ON lr.leave_type_id = lt.id
       LEFT JOIN staff s ON s.staffid = $2
       WHERE lr.id = $1`,
      [leaveRequestId, managerId]
    );

    if (result.rows.length === 0) {
      return;
    }

    const leave = result.rows[0];

    await createNotification({
      recipient_id: managerId,
      template_code: 'LEAVE_SUBMITTED',
      variables: {
        employee_name: leave.employee_name,
        manager_name: leave.manager_name,
        leave_type: leave.leave_type_name,
        start_date: leave.start_date,
        end_date: leave.end_date,
        days_count: leave.working_days_count,
        reason: leave.reason,
        action_url: `${process.env.NEXT_PUBLIC_APP_URL}/hr/leaves/requests?id=${leaveRequestId}`,
      },
      related_entity_type: 'LEAVE_REQUEST',
      related_entity_id: leaveRequestId,
    });

  } catch (error: any) {
    console.error('❌ Error notifying leave submitted:', error);
  }
}

// =====================================================
// NOTIFY PENDING APPROVAL
// =====================================================

export async function notifyPendingApproval(
  leaveRequestId: string,
  approverId: string
): Promise<void> {
  try {
    const result = await pool.query(
      `SELECT 
        lr.*,
        lt.name as leave_type_name,
        s.firstname || ' ' || s.lastname as approver_name
       FROM leave_requests lr
       LEFT JOIN leave_types lt ON lr.leave_type_id = lt.id
       LEFT JOIN staff s ON s.staffid = $2
       WHERE lr.id = $1`,
      [leaveRequestId, approverId]
    );

    if (result.rows.length === 0) {
      return;
    }

    const leave = result.rows[0];

    await createNotification({
      recipient_id: approverId,
      template_code: 'LEAVE_PENDING_APPROVAL',
      variables: {
        approver_name: leave.approver_name,
        employee_name: leave.employee_name,
        leave_type: leave.leave_type_name,
        start_date: leave.start_date,
        end_date: leave.end_date,
        days_count: leave.working_days_count,
        action_url: `${process.env.NEXT_PUBLIC_APP_URL}/hr/leaves/approvals`,
      },
      related_entity_type: 'LEAVE_REQUEST',
      related_entity_id: leaveRequestId,
      priority: 'HIGH',
    });

  } catch (error: any) {
    console.error('❌ Error notifying pending approval:', error);
  }
}

// =====================================================
// GET USER NOTIFICATIONS
// =====================================================

export async function getUserNotifications(
  userId: string,
  limit: number = 50,
  unreadOnly: boolean = false
): Promise<any[]> {
  try {
    let query = `
      SELECT 
        id,
        notification_type,
        category,
        priority,
        title,
        message,
        action_url,
        action_label,
        is_read,
        created_at
      FROM notifications
      WHERE recipient_id = $1
    `;

    if (unreadOnly) {
      query += ` AND is_read = false`;
    }

    query += ` ORDER BY created_at DESC LIMIT $2`;

    const result = await pool.query(query, [userId, limit]);

    return result.rows;

  } catch (error: any) {
    console.error('❌ Error getting user notifications:', error);
    return [];
  }
}

// =====================================================
// MARK NOTIFICATION AS READ
// =====================================================

export async function markAsRead(
  notificationId: string,
  userId: string
): Promise<boolean> {
  try {
    const result = await pool.query(
      `UPDATE notifications
       SET is_read = true, read_at = NOW()
       WHERE id = $1 AND recipient_id = $2`,
      [notificationId, userId]
    );

    return (result.rowCount || 0) > 0;

  } catch (error: any) {
    console.error('❌ Error marking notification as read:', error);
    return false;
  }
}

// =====================================================
// MARK ALL AS READ
// =====================================================

export async function markAllAsRead(userId: string): Promise<number> {
  try {
    const result = await pool.query(
      `UPDATE notifications
       SET is_read = true, read_at = NOW()
       WHERE recipient_id = $1 AND is_read = false`,
      [userId]
    );

    return result.rowCount || 0;

  } catch (error: any) {
    console.error('❌ Error marking all as read:', error);
    return 0;
  }
}

// =====================================================
// GET UNREAD COUNT
// =====================================================

export async function getUnreadCount(userId: string): Promise<number> {
  try {
    const result = await pool.query(
      `SELECT COUNT(*) as count
       FROM notifications
       WHERE recipient_id = $1 AND is_read = false`,
      [userId]
    );

    return parseInt(result.rows[0].count);

  } catch (error: any) {
    console.error('❌ Error getting unread count:', error);
    return 0;
  }
}

// =====================================================
// EXPORTS
// =====================================================

export default {
  createNotification,
  notifyLeaveSubmitted,
  notifyPendingApproval,
  getUserNotifications,
  markAsRead,
  markAllAsRead,
  getUnreadCount,
};
