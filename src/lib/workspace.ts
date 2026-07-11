import { getAccessToken } from './firebase';

export async function sendEmail(to: string, subject: string, body: string) {
  const token = await getAccessToken();
  if (!token) throw new Error('Not authenticated for Workspace');

  const email = [
    `To: ${to}`,
    'Subject: ' + subject,
    'MIME-Version: 1.0',
    'Content-Type: text/html; charset=utf-8',
    '',
    body
  ].join('\r\n');

  const encodedEmail = btoa(unescape(encodeURIComponent(email)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  const response = await fetch('https://gmail.googleapis.com/upload/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ raw: encodedEmail })
  });

  if (!response.ok) {
    throw new Error('Failed to send email');
  }
  return await response.json();
}

export async function sendChatMessage(spaceName: string, message: string) {
  const token = await getAccessToken();
  if (!token) throw new Error('Not authenticated for Workspace');

  // Typically spaces/SPACE_ID. If they just provide a name, it needs to be the resource name.
  // We'll assume spaceName is something like 'spaces/xyz'
  const response = await fetch(`https://chat.googleapis.com/v1/${spaceName}/messages`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ text: message })
  });

  if (!response.ok) {
    throw new Error('Failed to send chat message');
  }
  return await response.json();
}

export async function listChatSpaces() {
  const token = await getAccessToken();
  if (!token) throw new Error('Not authenticated for Workspace');

  const response = await fetch(`https://chat.googleapis.com/v1/spaces`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  if (!response.ok) {
    throw new Error('Failed to list chat spaces');
  }
  return await response.json();
}

export async function createForm(title: string, documentTitle: string) {
  const token = await getAccessToken();
  if (!token) throw new Error('Not authenticated for Workspace');

  const response = await fetch('https://forms.googleapis.com/v1/forms', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      info: {
        title,
        documentTitle
      }
    })
  });

  if (!response.ok) {
    throw new Error('Failed to create form');
  }
  return await response.json();
}

export async function addFormQuestion(formId: string, title: string, options: string[]) {
  const token = await getAccessToken();
  if (!token) throw new Error('Not authenticated for Workspace');

  const requests = [
    {
      createItem: {
        item: {
          title,
          questionItem: {
            question: {
              required: true,
              choiceQuestion: {
                type: 'RADIO',
                options: options.map(opt => ({ value: opt }))
              }
            }
          }
        },
        location: {
          index: 0
        }
      }
    }
  ];

  const response = await fetch(`https://forms.googleapis.com/v1/forms/${formId}:batchUpdate`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ requests })
  });

  if (!response.ok) {
    throw new Error('Failed to add question to form');
  }
  return await response.json();
}
