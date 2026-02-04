import { EmailClient } from "@azure/communication-email";
import { Event, Registration } from "./db";

const connectionString = process.env.COMMUNICATION_SERVICES_CONNECTION_STRING;
// Ensure no leading/trailing whitespace which is a common copy-paste error
const senderAddress = process.env.SENDER_EMAIL_ADDRESS?.trim();

export async function sendConfirmationEmail(event: Event, registration: Registration) {
  if (!connectionString || !senderAddress) {
    console.warn("Azure Communication Services credentials not found. Email not sent.");
    return;
  }

  // Sanity check for Azure Managed Domains
  if (senderAddress.includes("azurecomm.net") && !senderAddress.toLowerCase().startsWith("donotreply@")) {
      console.warn(`WARNING: Azure Managed Domains usually require the sender to start with 'DoNotReply@'. You provided: ${senderAddress}`);
  }

  try {
    const client = new EmailClient(connectionString);

    // Determine Recipient (Team Leader or Individual)
    // The top-level 'email' field in Registration is assumed to be the registrant/team leader.
    const recipientEmail = registration.email;
    const recipientName = registration.name || registration.teamName || "Participant";

    if (!recipientEmail) {
      console.warn("No recipient email found. Skipping confirmation email.");
      return;
    }

    const { title, startDate, startTime, location, eventId, imageUrl } = {
       title: event.title,
       startDate: event.startDate,
       startTime: event.startTime,
       location: event.location,
       eventId: event.id,
       imageUrl: event.imageUrl
    };

    const isTeam = !!registration.teamName;
    
    // Construct Email Content
    const subject = `Registration Confirmed: ${title}`;
    
    let htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
    `;

    // Add Image Header if available
    if (imageUrl) {
        htmlContent += `
          <div style="width: 100%; margin-bottom: 20px;">
            <img src="${imageUrl}" alt="${title}" style="width: 100%; max-height: 300px; object-fit: cover; border-radius: 5px;" />
          </div>
        `;
    }

    htmlContent += `
        <h2 style="color: #0078d4;">Registration Confirmed!</h2>
        <p>Hi ${recipientName},</p>
        <p>Thank you for registering for <strong>${title}</strong>.</p>
        
        <div style="background-color: #f3f2f1; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <h3 style="margin-top: 0;">Event Details</h3>
          <p><strong>Date:</strong> ${startDate}</p>
          <p><strong>Time:</strong> ${startTime || 'All Day'}</p>
          <p><strong>Location:</strong> ${location}</p>
        </div>
    `;

    // Prepare Question Map for Readable Labels
    const questionMap = new Map(event.customQuestions?.map(q => [q.id, q.text]) || []);

    if (isTeam) {
      htmlContent += `
        <div style="margin-bottom: 20px;">
          <h3>Team Details</h3>
          <p><strong>Team Name:</strong> ${registration.teamName}</p>
          <p><strong>Members:</strong></p>
          <ul style="list-style-type: none; padding-left: 0;">
            ${registration.members?.map(m => {
                let memberInfo = `<li style="margin-bottom: 10px; border-bottom: 1px solid #eee; padding-bottom: 10px;">
                    <strong>${m.name}</strong> (${m.email})`;
                
                if (m.answers && Object.keys(m.answers).length > 0) {
                     memberInfo += `<ul style="margin-top: 5px; font-size: 0.9em; color: #555;">`;
                     for (const [key, value] of Object.entries(m.answers)) {
                        const questionText = questionMap.get(key) || key;
                        memberInfo += `<li><strong>${questionText}:</strong> ${value}</li>`;
                     }
                     memberInfo += `</ul>`;
                }
                memberInfo += `</li>`;
                return memberInfo;
            }).join('') || '<li>No members listed</li>'}
          </ul>
        </div>
      `;
    } else {
        htmlContent += `
        <div style="margin-bottom: 20px;">
          <h3>Participant Details</h3>
          <p><strong>Name:</strong> ${registration.name}</p>
          <p><strong>Email:</strong> ${registration.email}</p>
        </div>
      `;
    }
    
    // Add custom answers (Team Leader or Individual)
    if (registration.answers && Object.keys(registration.answers).length > 0) {
        htmlContent += `<h3>${isTeam ? 'Team Responses' : 'Your Responses'}</h3><ul>`;
        for (const [key, value] of Object.entries(registration.answers)) {
             const questionText = questionMap.get(key) || key;
             htmlContent += `<li><strong>${questionText}:</strong> ${value}</li>`;
        }
         htmlContent += `</ul>`;
    }

    htmlContent += `
        <p>See you there!</p>
        <hr />
        <p style="font-size: 12px; color: #666;">TechXPO Registration System</p>
      </div>
    `;

    const sendEmail = async () => {
        return await client.beginSend({
          senderAddress: senderAddress,
          content: {
            subject: subject,
            plainText: `Registration Confirmed for ${title}. See you on ${startDate} at ${location}.`,
            html: htmlContent,
          },
          recipients: {
            to: [{ address: recipientEmail, displayName: recipientName }],
          },
        });
    };

    // Simple retry logic for 429 TooManyRequests
    let poller;
    const maxRetries = 3;
    for (let i = 0; i < maxRetries; i++) {
        try {
            poller = await sendEmail();
            break;
        } catch (error: any) {
             if (i < maxRetries - 1 && (error?.statusCode === 429 || error?.code === 'TooManyRequests')) {
                 const delay = 1000 * Math.pow(2, i); // 1s, 2s, 4s
                 console.warn(`Email sending rate limited. Retrying in ${delay}ms...`);
                 await new Promise(resolve => setTimeout(resolve, delay));
             } else {
                 throw error;
             }
        }
    }

    // We don't wait for the full polling to complete to avoid blocking the API response for too long
    // But we initiate it. In serverless, we might want to await it or use a background job.
    // user wants "when they fill the form they get email", so let's await the initial send request at least.
    
    // For Vercel/Next.js Serverless, it's safer to await the result or use `waitUntil` (if using Workers), 
    // but standard await poller.pollUntilDone() can be slow. 
    // We will just await the initial acceptance.
    
    console.log(`Email initiated for ${recipientEmail}. Operation ID: ${poller?.getResult()?.id}`);

  } catch (error) {
    console.error("Failed to send confirmation email:", error);
    // Don't throw error to prevent failing the registration itself if email fails
  }
}
