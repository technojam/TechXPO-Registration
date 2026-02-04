import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { EmailClient } from "@azure/communication-email";

// Interfaces must be defined locally as we can't import from outside the project root easily in standard Azure Funcs structure
interface CustomQuestion {
    id: string;
    text: string;
    type: 'text' | 'select';
    options?: string[];
    required: boolean;
    scope?: 'team' | 'member';
}

interface Event {
    id: string;
    title: string;
    description: string;
    startDate: string;
    endDate: string;
    startTime?: string;
    endTime?: string;
    location: string;
    mapUrl?: string;
    imageUrl?: string;
    customQuestions?: CustomQuestion[];
}

interface Registration {
    id: string;
    name?: string;
    email?: string;
    teamName?: string;
    answers?: Record<string, string>;
    members?: {
        name?: string;
        email?: string;
        answers?: Record<string, string>;
    }[];
}

const connectionString = process.env.COMMUNICATION_SERVICES_CONNECTION_STRING;
const senderAddress = process.env.SENDER_EMAIL_ADDRESS?.trim();

export async function sendEmail(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    context.log(`Http function processed request for url "${request.url}"`);

    if (!connectionString || !senderAddress) {
        return { status: 500, body: "Email configuration missing on server." };
    }

    try {
        const body = await request.json() as { event: Event, registration: Registration };
        const { event, registration } = body;

        if (!event || !registration) {
            return { status: 400, body: "Missing event or registration data." };
        }

        const client = new EmailClient(connectionString);
        const recipientEmail = registration.email;
        const recipientName = registration.name || registration.teamName || "Participant";

        if (!recipientEmail) {
            return { status: 400, body: "No recipient email found." };
        }

        // Construct Content
        const { title, startDate, startTime, location, imageUrl } = {
            title: event.title,
            startDate: event.startDate,
            startTime: event.startTime,
            location: event.location,
            imageUrl: event.imageUrl
        };

        let htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        `;

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

        const questionMap = new Map(event.customQuestions?.map(q => [q.id, q.text]) || []);
        const isTeam = !!registration.teamName;

        if (isTeam) {
            htmlContent += `
              <div style="margin-bottom: 20px;">
                <h3>Team Details</h3>
                <p><strong>Team Name:</strong> ${registration.teamName}</p>
                <p><strong>Members:</strong></p>
                <ul>
            `;

            registration.members?.forEach((member, index) => {
                htmlContent += `<li><strong>${member.name || `Member ${index + 1}`}</strong>`;
                if (member.email) htmlContent += ` (${member.email})`;
                
                if (member.answers && Object.keys(member.answers).length > 0) {
                    htmlContent += `<ul>`;
                    Object.entries(member.answers).forEach(([key, value]) => {
                         const qText = questionMap.get(key) || key;
                         htmlContent += `<li>${qText}: ${value}</li>`;
                    });
                     htmlContent += `</ul>`;
                }
                htmlContent += `</li>`;
            });

            htmlContent += `</ul></div>`;
            
             if (registration.answers && Object.keys(registration.answers).length > 0) {
                htmlContent += `<h3>Team Questions</h3><ul>`;
                 Object.entries(registration.answers).forEach(([key, value]) => {
                    const qText = questionMap.get(key) || key;
                    htmlContent += `<li><strong>${qText}:</strong> ${value}</li>`;
                });
                htmlContent += `</ul>`;
             }

        } else {
             if (registration.answers && Object.keys(registration.answers).length > 0) {
                htmlContent += `<h3>Additional Details</h3><ul>`;
                 Object.entries(registration.answers).forEach(([key, value]) => {
                    const qText = questionMap.get(key) || key;
                    htmlContent += `<li><strong>${qText}:</strong> ${value}</li>`;
                });
                htmlContent += `</ul>`;
             }
        }

        htmlContent += `
           <hr style="border: 0; border-top: 1px solid #eee; margin: 30px 0;" />
           <p style="color: #666; font-size: 12px; text-align: center;">This is an automated message. Please do not reply.</p>
           </div>
        `;

        const emailMessage = {
            senderAddress: senderAddress,
            content: {
                subject: `Registration Confirmed: ${title}`,
                html: htmlContent,
            },
            recipients: {
                to: [{ address: recipientEmail }],
            },
        };

        const poller = await client.beginSend(emailMessage);
        
        return { status: 200, body: JSON.stringify({ message: "Email queued successfully" }) };

    } catch (error: any) {
        context.error("Error sending email:", error);
        return { status: 500, body: `Error sending email: ${error.message}` };
    }
}

app.http('sendEmail', {
    methods: ['POST'],
    authLevel: 'function',
    handler: sendEmail
});
