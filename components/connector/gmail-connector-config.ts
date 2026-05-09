export type GmailActionKey =
  | 'send-reply'
  | 'draft-reply'
  | 'read-email'
  | 'extract-content'
  | 'enable-trigger'
  | 'auto-reply'
  | 'inbound-sync';

export type GmailActionBadge = 'Action' | 'Trigger' | 'Workflow' | 'Read' | 'Sync';
export type GmailFieldType = 'text' | 'textarea' | 'select';

export interface GmailFieldOption {
  label: string;
  value: string;
}

export interface GmailFormValues {
  [key: string]: string;
}

export interface GmailFieldDefinition {
  key: string;
  label: string;
  type: GmailFieldType;
  required: boolean;
  placeholder: string;
  helperText?: string;
  options?: GmailFieldOption[];
  spanFull?: boolean;
  isRequired?: (values: GmailFormValues) => boolean;
}

export interface GmailActionDefinition {
  key: GmailActionKey;
  badge: GmailActionBadge;
  title: string;
  description: string;
  frontendRule: string;
  steps: string[];
  fields: GmailFieldDefinition[];
}

export interface GmailBrowserItem {
  key: GmailActionKey;
  section: 'Triggers' | 'Actions';
  title: string;
  description: string;
  badge: GmailActionBadge;
}

export const GMAIL_ACCOUNT_OPTIONS: GmailFieldOption[] = [
  { label: 'Primary connected account', value: 'primary_connected_account' },
  { label: 'Work Gmail account', value: 'work_gmail_account' },
  { label: 'Support Gmail account', value: 'support_gmail_account' },
];

export const GMAIL_ACTION_DEFINITIONS: GmailActionDefinition[] = [
  {
    key: 'send-reply',
    badge: 'Action',
    title: 'Send reply email',
    description:
      'Send an actual Gmail reply from the connected account. The form below should collect all user-entered fields for this action.',
    frontendRule: 'If To is not provided, backend can often take it from the incoming email sender.',
    steps: [
      'User selects the Gmail account or keeps the connected account.',
      'User fills Subject and Body.',
      'Optional reply fields can be added only if needed.',
      'Backend sends the reply directly through Gmail.',
    ],
    fields: [
      { key: 'subject', label: 'Subject', type: 'text', required: true, placeholder: 'Enter email subject' },
      { key: 'body', label: 'Body', type: 'textarea', required: true, placeholder: 'Write reply body', spanFull: true },
      { key: 'to', label: 'To', type: 'text', required: false, placeholder: 'recipient@example.com' },
      { key: 'cc', label: 'CC', type: 'text', required: false, placeholder: 'Add CC recipients' },
      { key: 'bcc', label: 'BCC', type: 'text', required: false, placeholder: 'Add BCC recipients' },
      { key: 'threadId', label: 'Thread ID', type: 'text', required: false, placeholder: 'Enter thread ID' },
      { key: 'messageId', label: 'Message ID', type: 'text', required: false, placeholder: 'Enter message ID' },
      { key: 'replyTo', label: 'Reply-To', type: 'text', required: false, placeholder: 'replyto@example.com' },
      {
        key: 'htmlBody',
        label: 'HTML Body',
        type: 'textarea',
        required: false,
        placeholder: 'Optional HTML body content',
        spanFull: true,
      },
      {
        key: 'attachments',
        label: 'Attachments',
        type: 'text',
        required: false,
        placeholder: 'Attach file names or URLs',
        helperText: 'Support file picker or backend attachment mapping later.',
        spanFull: true,
      },
    ],
  },
  {
    key: 'draft-reply',
    badge: 'Action',
    title: 'Create draft reply',
    description:
      'Create a Gmail draft instead of sending immediately. The same user input fields as send reply should be shown here as well.',
    frontendRule: 'Use the same compose fields as send reply, but the final service action becomes draft creation instead of direct send.',
    steps: [
      'User fills Subject and Body.',
      'Optional recipient and reference fields can be added.',
      'Backend creates a Gmail draft.',
      'User can review and send later from Gmail.',
    ],
    fields: [
      { key: 'subject', label: 'Subject', type: 'text', required: true, placeholder: 'Enter draft subject' },
      { key: 'body', label: 'Body', type: 'textarea', required: true, placeholder: 'Write draft body', spanFull: true },
      { key: 'to', label: 'To', type: 'text', required: false, placeholder: 'recipient@example.com' },
      { key: 'cc', label: 'CC', type: 'text', required: false, placeholder: 'Add CC recipients' },
      { key: 'bcc', label: 'BCC', type: 'text', required: false, placeholder: 'Add BCC recipients' },
      { key: 'threadId', label: 'Thread ID', type: 'text', required: false, placeholder: 'Enter thread ID' },
      { key: 'messageId', label: 'Message ID', type: 'text', required: false, placeholder: 'Enter message ID' },
      { key: 'replyTo', label: 'Reply-To', type: 'text', required: false, placeholder: 'replyto@example.com' },
      {
        key: 'htmlBody',
        label: 'HTML Body',
        type: 'textarea',
        required: false,
        placeholder: 'Optional HTML body content',
        spanFull: true,
      },
      {
        key: 'attachments',
        label: 'Attachments',
        type: 'text',
        required: false,
        placeholder: 'Attach file names or URLs',
        helperText: 'Support file picker or backend attachment mapping later.',
        spanFull: true,
      },
    ],
  },
  {
    key: 'read-email',
    badge: 'Read',
    title: 'Read email',
    description: 'Open and read a Gmail message using the message reference chosen by the user.',
    frontendRule: 'From frontend point of view, this can be treated as a lightweight read action with Message ID as the main required input.',
    steps: [
      'User provides Message ID.',
      'Frontend sends the selected message reference to backend.',
      'Backend fetches the Gmail message.',
      'Message content is displayed to the user.',
    ],
    fields: [
      { key: 'messageId', label: 'Message ID', type: 'text', required: true, placeholder: 'Enter message ID' },
      {
        key: 'connectedAccount',
        label: 'Connected Gmail account',
        type: 'select',
        required: false,
        placeholder: 'Select connected account',
        options: GMAIL_ACCOUNT_OPTIONS,
      },
    ],
  },
  {
    key: 'extract-content',
    badge: 'Read',
    title: 'Extract email content',
    description: 'Extract body, metadata, or content analysis from a Gmail message. This is very similar to Read Email on the frontend.',
    frontendRule: 'This can share almost the same frontend input structure as Read Email, because Message ID is the key input.',
    steps: [
      'User provides Message ID.',
      'Backend fetches email body and metadata.',
      'System extracts or analyzes content.',
      'Structured content is returned to UI.',
    ],
    fields: [
      { key: 'messageId', label: 'Message ID', type: 'text', required: true, placeholder: 'Enter message ID' },
      {
        key: 'connectedAccount',
        label: 'Connected Gmail account',
        type: 'select',
        required: false,
        placeholder: 'Select connected account',
        options: GMAIL_ACCOUNT_OPTIONS,
      },
    ],
  },
  {
    key: 'enable-trigger',
    badge: 'Trigger',
    title: 'Enable new email trigger',
    description: 'Enable automatic detection of new incoming Gmail messages using the connected account.',
    frontendRule:
      'If Gmail watch or Pub/Sub is used, backend needs topic configuration. If polling fallback is used, user usually does not need to enter extra fields after connecting the account.',
    steps: [
      'User connects Gmail account.',
      'User enables the new email trigger.',
      'Optional auto-reply behavior can be attached.',
      'Backend starts watch, Pub/Sub, or polling flow.',
    ],
    fields: [
      {
        key: 'connectedAccount',
        label: 'Connected Gmail account',
        type: 'select',
        required: true,
        placeholder: 'Select connected account',
        options: GMAIL_ACCOUNT_OPTIONS,
      },
      {
        key: 'enableAutoReply',
        label: 'Enable auto reply',
        type: 'select',
        required: false,
        placeholder: 'Choose yes or no',
        options: [
          { label: 'No', value: 'no' },
          { label: 'Yes', value: 'yes' },
        ],
      },
      {
        key: 'autoReplySenderEmail',
        label: 'Auto reply sender email',
        type: 'text',
        required: false,
        placeholder: 'sender@example.com',
      },
      {
        key: 'autoReplyInstruction',
        label: 'Auto reply instruction',
        type: 'textarea',
        required: false,
        placeholder: 'Add auto-reply instruction',
        spanFull: true,
      },
    ],
  },
  {
    key: 'auto-reply',
    badge: 'Workflow',
    title: 'Configure auto-reply workflow',
    description:
      'Set up the rule for when a new email comes in and the system automatically replies or creates a draft.',
    frontendRule:
      'If user selects specific_sender, then reply_target.email becomes mandatory. If latest_sender is selected, email can be auto-picked from incoming mail.',
    steps: [
      'User selects connected Gmail account.',
      'User sets subject template and body template.',
      'User chooses reply target mode.',
      'Backend applies workflow logic and sends or drafts based on action mode.',
    ],
    fields: [
      {
        key: 'connectedAccount',
        label: 'Connected Gmail account',
        type: 'select',
        required: true,
        placeholder: 'Select connected account',
        options: GMAIL_ACCOUNT_OPTIONS,
      },
      {
        key: 'subjectTemplate',
        label: 'Subject template',
        type: 'text',
        required: true,
        placeholder: 'Re: Thanks for reaching out',
      },
      {
        key: 'bodyTemplate',
        label: 'Body template',
        type: 'textarea',
        required: true,
        placeholder: 'Write the reply template body',
        spanFull: true,
      },
      {
        key: 'replyTargetMode',
        label: 'Reply target mode',
        type: 'select',
        required: true,
        placeholder: 'Choose reply target mode',
        options: [
          { label: 'latest_sender', value: 'latest_sender' },
          { label: 'specific_sender', value: 'specific_sender' },
        ],
      },
      {
        key: 'specificSenderEmail',
        label: 'Specific sender email',
        type: 'text',
        required: false,
        placeholder: 'Required only when specific_sender is selected',
        isRequired: (values) => values.replyTargetMode === 'specific_sender',
      },
      {
        key: 'actionMode',
        label: 'Action mode',
        type: 'select',
        required: false,
        placeholder: 'Choose action mode',
        options: [
          { label: 'auto_send', value: 'auto_send' },
          { label: 'draft_reply', value: 'draft_reply' },
        ],
      },
      {
        key: 'autoReplyInstruction',
        label: 'Auto reply instruction',
        type: 'textarea',
        required: false,
        placeholder: 'Add additional reply instruction',
        spanFull: true,
      },
      {
        key: 'autoReplySenderEmail',
        label: 'Auto reply sender email',
        type: 'text',
        required: false,
        placeholder: 'sender@example.com',
      },
    ],
  },
  {
    key: 'inbound-sync',
    badge: 'Sync',
    title: 'Inbound sync',
    description:
      'Manually sync or process incoming Gmail emails using the connected account without asking for credentials again.',
    frontendRule: 'Normally no fresh credentials are needed again. Optional workflow settings can be reused from the auto-reply flow.',
    steps: [
      'User selects connected Gmail account.',
      'User starts manual sync.',
      'Backend processes inbox messages.',
      'Processed output is returned in UI.',
    ],
    fields: [
      {
        key: 'connectedAccount',
        label: 'Connected Gmail account',
        type: 'select',
        required: true,
        placeholder: 'Select connected account',
        options: GMAIL_ACCOUNT_OPTIONS,
      },
      {
        key: 'senderRules',
        label: 'Sender rules',
        type: 'text',
        required: false,
        placeholder: 'Add sender filter or rule',
      },
      {
        key: 'subjectTemplate',
        label: 'Subject template',
        type: 'text',
        required: false,
        placeholder: 'Optional subject template',
      },
      {
        key: 'bodyTemplate',
        label: 'Body template',
        type: 'textarea',
        required: false,
        placeholder: 'Optional body template',
        spanFull: true,
      },
      {
        key: 'actionMode',
        label: 'Action mode',
        type: 'select',
        required: false,
        placeholder: 'Choose action mode',
        options: [
          { label: 'sync_only', value: 'sync_only' },
          { label: 'auto_send', value: 'auto_send' },
          { label: 'draft_reply', value: 'draft_reply' },
        ],
      },
    ],
  },
];

export const GMAIL_BROWSER_ITEMS: GmailBrowserItem[] = [
  {
    key: 'enable-trigger',
    section: 'Triggers',
    title: 'Enable new email trigger',
    description:
      'Enable automatic incoming email detection using a connected Gmail account. Optional settings include auto reply enablement, sender email, and reply instruction.',
    badge: 'Trigger',
  },
  {
    key: 'send-reply',
    section: 'Actions',
    title: 'Send reply email',
    description:
      'Send an actual Gmail reply. Required from user: subject and body. Optional: to, cc, bcc, thread ID, message ID, reply-to, HTML body, and attachments.',
    badge: 'Action',
  },
  {
    key: 'draft-reply',
    section: 'Actions',
    title: 'Create draft reply',
    description:
      'Create a Gmail draft instead of sending immediately. Required from user: subject and body. Optional fields remain the same as send reply.',
    badge: 'Action',
  },
  {
    key: 'read-email',
    section: 'Actions',
    title: 'Read email',
    description: 'Open and read a Gmail message using a required message ID.',
    badge: 'Read',
  },
  {
    key: 'extract-content',
    section: 'Actions',
    title: 'Extract email content',
    description: 'Extract body, metadata, or content analysis using a required message ID.',
    badge: 'Read',
  },
  {
    key: 'auto-reply',
    section: 'Actions',
    title: 'Configure auto-reply workflow',
    description:
      'Set up automatic reply logic using connected Gmail, subject template, body template, reply mode, and optional sender rules.',
    badge: 'Workflow',
  },
  {
    key: 'inbound-sync',
    section: 'Actions',
    title: 'Inbound sync',
    description: 'Manually sync or process incoming Gmail messages using the connected account. Optional custom workflow settings can also be applied.',
    badge: 'Sync',
  },
];

export const DEFAULT_GMAIL_ACTION_KEY: GmailActionKey = 'send-reply';

export function getGmailActionDefinition(actionKey: GmailActionKey): GmailActionDefinition {
  return GMAIL_ACTION_DEFINITIONS.find((definition) => definition.key === actionKey) || GMAIL_ACTION_DEFINITIONS[0];
}

export function buildInitialGmailFormValues(action: GmailActionDefinition): GmailFormValues {
  const values: GmailFormValues = {};
  action.fields.forEach((field) => {
    if (field.type === 'select' && field.required) {
      values[field.key] = field.options?.[0]?.value || '';
      return;
    }
    if (field.key === 'enableAutoReply') {
      values[field.key] = 'no';
      return;
    }
    values[field.key] = '';
  });
  return values;
}
