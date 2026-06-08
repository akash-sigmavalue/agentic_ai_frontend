"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import type { GmailNewIntent, WorkflowOperationType, WorkflowResponse } from "./types";
import { getGmailNewIntentFromResponse, mapPrimaryIntentToOperation } from "./types";

type WorkflowFormBoxProps = {
  response: WorkflowResponse;
  partialIntent?: Record<string, unknown> | null;
  operationType: WorkflowOperationType;
  onRerun: (payload: {
    prompt: string;
    partialIntent: Record<string, unknown>;
    executionMode: "one_time_action" | "automation_rule";
  }) => void;
};

function toStringValue(value: unknown, fallback = "") {
  return typeof value === "string" ? value : value == null ? fallback : String(value);
}

function toNumberValue(value: unknown, fallback: number) {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return Math.floor(value);
  }

  if (typeof value === "string") {
    const parsed = Number.parseInt(value, 10);
    if (Number.isFinite(parsed) && parsed > 0) {
      return parsed;
    }
  }

  return fallback;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function getNestedRecord(source: Record<string, unknown>, key: string) {
  return asRecord(source[key]);
}

function getNestedPath(source: Record<string, unknown>, ...keys: string[]) {
  let current: unknown = source;

  for (const key of keys) {
    if (!current || typeof current !== "object" || Array.isArray(current)) {
      return undefined;
    }
    current = (current as Record<string, unknown>)[key];
  }

  return current;
}

function getNewIntentFromFormContext(
  response: WorkflowResponse,
  partialIntent?: Record<string, unknown> | null,
): GmailNewIntent | null {
  const fromResponse = getGmailNewIntentFromResponse(response);
  if (fromResponse) return fromResponse;

  if (
    partialIntent &&
    typeof partialIntent === "object" &&
    ("intent_understanding_output" in partialIntent || "intent_details" in partialIntent)
  ) {
    return partialIntent as GmailNewIntent;
  }

  const nested =
    partialIntent &&
    typeof partialIntent === "object" &&
    partialIntent.gmail_intent &&
    typeof partialIntent.gmail_intent === "object"
      ? (partialIntent.gmail_intent as GmailNewIntent)
      : null;

  if (
    nested &&
    ("intent_understanding_output" in nested || "intent_details" in nested)
  ) {
    return nested;
  }

  return null;
}

function getPrimaryIntent(newIntent: GmailNewIntent | null) {
  return toStringValue(
    newIntent?.intent_understanding_output?.primary_intent,
    "",
  );
}

function getIntentDetail(
  newIntent: GmailNewIntent | null,
  detailName: string,
): Record<string, unknown> {
  return asRecord(newIntent?.intent_details?.[detailName]);
}

function getSearchScope(newIntent: GmailNewIntent | null): Record<string, unknown> {
  const searchDetail =
    getIntentDetail(newIntent, "search_email") ||
    getIntentDetail(newIntent, "fetch_email");

  return asRecord(searchDetail.search_scope);
}

function getClarificationMissingField(newIntent: GmailNewIntent | null) {
  const missing = newIntent?.clarification?.missing_information || [];
  return Array.isArray(missing) && missing.length ? String(missing[0]) : "";
}

function getNewIntentQuestion(newIntent: GmailNewIntent | null) {
  return toStringValue(newIntent?.clarification?.question, "");
}

function isNewIntentConfirmationPending(newIntent: GmailNewIntent | null) {
  return (
    newIntent?.safety_and_permission?.permission_status === "pending_confirmation" ||
    newIntent?.next_stage?.stage_name === "policy_confirmation"
  );
}

function deriveOperationFromNewIntent(
  newIntent: GmailNewIntent | null,
  fallback: WorkflowOperationType,
): WorkflowOperationType {
  const mapped = mapPrimaryIntentToOperation(getPrimaryIntent(newIntent));
  return mapped || fallback;
}

function getStatusActionFromPrimaryIntent(primaryIntent: string) {
  switch (primaryIntent) {
    case "mark_as_read":
      return "mark_read";
    case "mark_as_unread":
      return "mark_unread";
    case "star_email":
      return "star";
    case "unstar_email":
      return "unstar";
    case "mark_as_important":
      return "mark_important";
    default:
      return "";
  }
}

function buildUpdatedNewIntent({
  newIntent,
  primaryIntent,
  senderEmail,
  toEmail,
  subject,
  body,
  labelName,
  statusAction,
  reportScope,
  maxEmails,
  replyTone,
  isConfirmationFlow,
}: {
  newIntent: GmailNewIntent | null;
  primaryIntent: string;
  senderEmail: string;
  toEmail: string;
  subject: string;
  body: string;
  labelName: string;
  statusAction: string;
  reportScope: string;
  maxEmails: string;
  replyTone: string;
  isConfirmationFlow: boolean;
}) {
  if (!newIntent) return undefined;

  const updated: GmailNewIntent = structuredCloneSafe(newIntent);
  const intentDetails = { ...(updated.intent_details || {}) } as Record<string, any>;
  const searchDetail = {
    ...(intentDetails.search_email || intentDetails.fetch_email || {}),
  };
  const searchScope = {
    ...(searchDetail.search_scope || {}),
  };

  if (senderEmail) searchScope.sender = senderEmail;
  if (toEmail) searchScope.recipient = toEmail;
  if (Number.isFinite(Number(maxEmails))) searchScope.max_results = Number(maxEmails);

  searchDetail.search_scope = searchScope;

  if (primaryIntent === "fetch_email") {
    intentDetails.fetch_email = {
      ...(intentDetails.fetch_email || {}),
      is_required: true,
      search_scope: searchScope,
    };
  } else {
    intentDetails.search_email = {
      ...(intentDetails.search_email || {}),
      is_required: true,
      search_scope: searchScope,
    };
  }

  if (labelName) {
    intentDetails.label_email = {
      ...(intentDetails.label_email || {}),
      is_required: true,
      label_name: labelName,
    };
  }

  if (statusAction) {
    const statusIntent =
      statusAction === "mark_unread"
        ? "mark_as_unread"
        : statusAction === "star"
          ? "star_email"
          : statusAction === "unstar"
            ? "unstar_email"
            : statusAction === "mark_important"
              ? "mark_as_important"
              : "mark_as_read";

    intentDetails[statusIntent] = {
      ...(intentDetails[statusIntent] || {}),
      is_required: true,
    };
  }

  if (reportScope && primaryIntent === "contact_report") {
    intentDetails.contact_report = {
      ...(intentDetails.contact_report || {}),
      is_required: true,
      reason: reportScope,
    };
  }

  if (reportScope && primaryIntent === "email_insight_report") {
    intentDetails.email_insight_report = {
      ...(intentDetails.email_insight_report || {}),
      is_required: true,
      reason: reportScope,
    };
  }

  if (toEmail || subject || body) {
    const emailIntent =
      primaryIntent === "send_new_email"
        ? "send_new_email"
        : primaryIntent === "create_draft"
          ? "create_draft"
          : primaryIntent === "draft_reply"
            ? "draft_reply"
            : primaryIntent === "send_reply"
              ? "send_reply"
              : "create_draft";

    intentDetails[emailIntent] = {
      ...(intentDetails[emailIntent] || {}),
      is_required: true,
      to: toEmail ? [toEmail] : (intentDetails[emailIntent]?.to || []),
      subject: subject || intentDetails[emailIntent]?.subject || "",
      body_instruction:
        body ||
        intentDetails[emailIntent]?.body_instruction ||
        intentDetails[emailIntent]?.reply_instruction ||
        "",
      draft_tone: replyTone,
      tone: replyTone,
    };
  }

  updated.intent_details = intentDetails as any;

  updated.safety_and_permission = {
    ...(updated.safety_and_permission || {}),
    permission_status: isConfirmationFlow ? "allowed" : updated.safety_and_permission?.permission_status,
  };

  updated.clarification = {
    ...(updated.clarification || {}),
    required: false,
    question: "",
    missing_information: [],
  };

  return updated;
}

function structuredCloneSafe<T>(value: T): T {
  try {
    return structuredClone(value);
  } catch {
    return JSON.parse(JSON.stringify(value));
  }
}

function getWorkflowFormCopy(operationType: WorkflowOperationType) {
  switch (operationType) {
    case "label":
      return {
        title: "Confirm label / organize action",
        description:
          "Review the label or archive action before applying it to Gmail messages.",
        confirmText: "Confirm & Apply",
        fieldPlaceholder: "Example: Bank, SBI, Important",
      };

    case "draft":
      return {
        title: "Review draft action",
        description:
          "Confirm the draft details or provide missing draft information.",
        confirmText: "Create Draft",
        fieldPlaceholder: "Enter draft subject or message",
      };

    case "contact_report":
      return {
        title: "Generate people report",
        description: "Confirm the sender/contact report scope.",
        confirmText: "Generate Report",
        fieldPlaceholder: "Example: this week, SBI, valuation",
      };

    case "status_update":
      return {
        title: "Confirm status update",
        description:
          "Review before marking emails read/unread, starred, or important.",
        confirmText: "Confirm & Update",
        fieldPlaceholder: "Example: mark read, star, mark important",
      };

    case "delete":
      return {
        title: "Confirm delete action",
        description:
          "This will move matching emails to Gmail Trash. It will not permanently delete them.",
        confirmText: "Confirm Delete",
        fieldPlaceholder: "Type confirm to continue",
      };

    case "insight_report":
      return {
        title: "Generate email insight report",
        description: "Confirm the report type and filter scope.",
        confirmText: "Generate Insight",
        fieldPlaceholder: "Example: top senders this week",
      };

    case "chain":
      return {
        title: "Confirm multi-step workflow",
        description:
          "This workflow has multiple dependent steps. Review before continuing.",
        confirmText: "Confirm & Run Workflow",
        fieldPlaceholder: "Add any missing instruction",
      };

    case "send":
      return {
        title: "Confirm email send",
        description: "Review the recipient, subject, and body before sending.",
        confirmText: "Confirm & Send",
        fieldPlaceholder: "Add missing email detail",
      };

    case "reply":
    case "reply_to_thread":
      return {
        title: "Confirm reply action",
        description: "Review the reply details before sending or drafting.",
        confirmText: "Confirm Reply",
        fieldPlaceholder: "Add reply instruction",
      };

    case "automate":
      return {
        title: "Confirm automation",
        description: "Review the automation trigger and action before saving it.",
        confirmText: "Confirm Automation",
        fieldPlaceholder: "Add automation detail",
      };

    default:
      return {
        title: "Action required",
        description:
          "Please provide the missing information or confirm the action.",
        confirmText: "Continue",
        fieldPlaceholder: "Enter value",
      };
  }
}

function getFieldLabel(operationType: WorkflowOperationType, missingField?: string) {
  if (missingField === "sender_email") return "Sender email";
  if (missingField === "sender_name_or_email") return "Sender name or email";
  if (missingField === "to" || missingField === "recipient_email") return "Recipient email";
  if (missingField === "label") return "Label name";
  if (missingField === "action") return "Action";
  if (missingField === "subject") return "Subject";
  if (missingField === "body") return "Message";
  if (missingField === "date_range") return "Date range";

  switch (operationType) {
    case "label":
      return "Label name";
    case "status_update":
      return "Status action";
    case "delete":
      return "Confirmation";
    case "draft":
      return "Draft detail";
    case "insight_report":
      return "Report filter";
    case "contact_report":
      return "People filter";
    case "chain":
      return "Additional instruction";
    default:
      return "Value";
  }
}

function buildRerunPrompt({
  operationType,
  originalPrompt,
  fieldValue,
  partialIntent,
  isConfirmation,
  labelName,
  statusAction,
  reportScope,
  senderEmail,
  toEmail,
  subject,
  body,
  replyTone,
  maxEmails,
}: {
  operationType: WorkflowOperationType;
  originalPrompt: string;
  fieldValue: string;
  partialIntent: Record<string, unknown>;
  isConfirmation: boolean;
  labelName: string;
  statusAction: string;
  reportScope: string;
  senderEmail: string;
  toEmail: string;
  subject: string;
  body: string;
  replyTone: string;
  maxEmails: string;
}) {
  const cleanOriginal = originalPrompt.trim();
  const cleanValue = fieldValue.trim();

  if (isConfirmation) {
    switch (operationType) {
      case "delete":
        return `Confirmed. Move matching emails to Trash. Original request: ${cleanOriginal}`;

      case "send":
        return `Confirmed. Send the email. Original request: ${cleanOriginal}`;

      case "reply":
      case "reply_to_thread":
        return `Confirmed. Send the reply. Original request: ${cleanOriginal}`;

      case "automate":
        return `Confirmed. Create this Gmail automation. Original request: ${cleanOriginal}`;

      case "label":
        return `Confirmed. Apply the Gmail label/organize action. Original request: ${cleanOriginal}`;

      case "status_update":
        return `Confirmed. Apply the Gmail status update. Original request: ${cleanOriginal}`;

      case "chain":
        return `Confirmed. Run the full multi-step Gmail workflow. Original request: ${cleanOriginal}`;

      default:
        return `Confirmed. Continue. Original request: ${cleanOriginal}`;
    }
  }

  const missingField = String(
    partialIntent?.missing_field ||
      partialIntent?.field ||
      partialIntent?.required_field ||
      "",
  );

  switch (operationType) {
    case "label": {
      const label = labelName.trim() || cleanValue;
      const sender = senderEmail.trim();
      if (label && sender) return `${cleanOriginal} from ${sender} with label ${label}`;
      if (label) return `${cleanOriginal} with label ${label}`;
      return cleanOriginal;
    }

    case "draft": {
      if (missingField === "to" || missingField === "recipient_email") {
        return `${cleanOriginal} to ${cleanValue || toEmail}`;
      }
      if (missingField === "subject") {
        return `${cleanOriginal} with subject ${cleanValue || subject}`;
      }
      if (missingField === "body") {
        return `${cleanOriginal} saying ${cleanValue || body}`;
      }
      if (toEmail || subject || body) {
        return `draft email to ${toEmail || "recipient"} with subject "${subject}" saying "${body}"`;
      }
      return cleanValue ? `${cleanOriginal} ${cleanValue}` : cleanOriginal;
    }

    case "status_update": {
      const action = statusAction.trim() || cleanValue;
      const sender = senderEmail.trim();
      if (action && sender) return `${cleanOriginal} from ${sender} action ${action}`;
      if (action) return `${cleanOriginal} action ${action}`;
      return cleanOriginal;
    }

    case "delete":
      return cleanValue ? `${cleanOriginal} ${cleanValue}` : cleanOriginal;

    case "contact_report":
    case "insight_report": {
      const scope = reportScope.trim() || cleanValue;
      return scope ? `${cleanOriginal} for ${scope}` : cleanOriginal;
    }

    case "chain":
      return cleanValue
        ? `${cleanOriginal}. Additional instruction: ${cleanValue}`
        : cleanOriginal;

    case "send": {
      const recipient = toEmail.trim() || cleanValue;
      if (recipient || subject || body) {
        return `send email to ${recipient || "recipient"} with subject "${subject}" saying "${body}"`;
      }
      return cleanOriginal;
    }

    case "reply":
    case "reply_to_thread": {
      if (missingField === "sender_email") {
        return `${cleanOriginal} from ${cleanValue || senderEmail}`;
      }
      if (body) {
        return `reply to ${toEmail || senderEmail || "the sender"} with subject "${subject}" saying "${body}" in a ${replyTone || "professional"} tone`;
      }
      return cleanValue ? `${cleanOriginal} ${cleanValue}` : cleanOriginal;
    }

    case "automate":
      return `when ${senderEmail || "the sender"} emails me, automatically reply saying "${body}" in a ${replyTone || "professional"} tone`;

    case "fetch":
    case "search":
      return senderEmail
        ? `show ${maxEmails || "10"} emails from ${senderEmail}`
        : cleanValue
          ? `${cleanOriginal} ${cleanValue}`
          : cleanOriginal;

    case "read":
      return senderEmail
        ? `show full thread from ${senderEmail}`
        : cleanValue
          ? `${cleanOriginal} ${cleanValue}`
          : cleanOriginal;

    case "read_attachment":
      return senderEmail
        ? `read the attachment in the last email from ${senderEmail}`
        : cleanValue
          ? `${cleanOriginal} ${cleanValue}`
          : cleanOriginal;

    case "analyze":
    case "classify":
      return senderEmail
        ? `extract key details from the last email from ${senderEmail}`
        : cleanValue
          ? `${cleanOriginal} ${cleanValue}`
          : cleanOriginal;

    default:
      return cleanValue ? `${cleanOriginal} ${cleanValue}` : cleanOriginal;
  }
}

export default function WorkflowFormBox({
  response,
  partialIntent,
  operationType,
  onRerun,
}: WorkflowFormBoxProps) {
  const partialIntentRecord = (partialIntent || {}) as Record<string, unknown>;
  const newIntent = getNewIntentFromFormContext(response, partialIntentRecord);
  const primaryIntent = getPrimaryIntent(newIntent);
  const resolvedOperationType = deriveOperationFromNewIntent(newIntent, operationType);
  const filters = getNestedRecord(partialIntentRecord, "filters");
  const emailPayload = getNestedRecord(partialIntentRecord, "email_payload");
  const existingOutputRequirement =
    partialIntentRecord.output_requirement &&
    typeof partialIntentRecord.output_requirement === "object"
      ? (partialIntentRecord.output_requirement as Record<string, unknown>)
      : {};

  const originalPrompt = toStringValue(
    partialIntentRecord.original_prompt || response.plan?.goal || response.message,
    "",
  );

  const missingField =
    response.missing_field ||
    getClarificationMissingField(newIntent) ||
    toStringValue(
      partialIntentRecord.missing_field ||
        partialIntentRecord.field ||
        partialIntentRecord.required_field,
      "",
    );

  const fieldQuestion =
    response.question ||
    response.missing_field_question ||
    response.sender_email_question ||
    getNewIntentQuestion(newIntent) ||
    "Please provide the missing information.";

  const copy = getWorkflowFormCopy(resolvedOperationType);

  const isConfirmationFlow =
    response.status === "needs_confirmation" ||
    response.approval_status === "pending" ||
    response.policy_decision?.required_user_action === "confirm" ||
    response.policy_decision?.confirmation_required === true ||
    response.policy_decision?.requires_approval === true ||
    isNewIntentConfirmationPending(newIntent);

  const searchScope = getSearchScope(newIntent);
  const labelDetail = getIntentDetail(newIntent, "label_email");
  const sendNewEmailDetail = getIntentDetail(newIntent, "send_new_email");
  const createDraftDetail = getIntentDetail(newIntent, "create_draft");
  const draftReplyDetail = getIntentDetail(newIntent, "draft_reply");
  const sendReplyDetail = getIntentDetail(newIntent, "send_reply");
  const contactReportDetail = getIntentDetail(newIntent, "contact_report");
  const insightReportDetail = getIntentDetail(newIntent, "email_insight_report");
  const primaryStatusAction = getStatusActionFromPrimaryIntent(primaryIntent);

  const [senderEmail, setSenderEmail] = useState(() =>
    toStringValue(
      response.from_email ||
        searchScope.sender ||
        partialIntentRecord.sender_email ||
        filters.sender_email ||
        filters.sender ||
        filters.from,
    ),
  );
  const [toEmail, setToEmail] = useState(() =>
    toStringValue(
      partialIntentRecord.to ||
        response.to ||
        emailPayload.to ||
        sendNewEmailDetail.to ||
        createDraftDetail.to ||
        filters.to ||
        searchScope.recipient,
    ),
  );
  const [subject, setSubject] = useState(() =>
    toStringValue(
      response.subject ||
        partialIntentRecord.subject ||
        emailPayload.subject ||
        sendNewEmailDetail.subject ||
        createDraftDetail.subject ||
        filters.subject,
    ),
  );
  const [emailBody, setEmailBody] = useState(() =>
    toStringValue(
      partialIntentRecord.body ||
        emailPayload.body ||
        emailPayload.body_instruction ||
        sendNewEmailDetail.body_instruction ||
        createDraftDetail.body_instruction ||
        draftReplyDetail.reply_instruction ||
        sendReplyDetail.reply_instruction,
    ),
  );
  const [maxEmails, setMaxEmails] = useState(() =>
    String(toNumberValue(partialIntentRecord.max_results || filters.max_results || searchScope.max_results, 10)),
  );
  const [execType, setExecType] = useState(() =>
    toStringValue(response.execution_type, resolvedOperationType === "automate" ? "automated" : "one_time") ||
    "one_time",
  );
  const [replyTone, setReplyTone] = useState(() =>
    toStringValue(
      partialIntentRecord.reply_tone ||
        existingOutputRequirement.tone ||
        emailPayload.tone ||
        draftReplyDetail.draft_tone ||
        sendNewEmailDetail.tone ||
        createDraftDetail.tone,
      "professional",
    ) || "professional",
  );
  const [fieldValue, setFieldValue] = useState("");
  const [labelName, setLabelName] = useState(() =>
    toStringValue(partialIntentRecord.label || filters.label || emailPayload.label || labelDetail.label_name),
  );
  const [statusAction, setStatusAction] = useState(() =>
    toStringValue(partialIntentRecord.action || filters.action || emailPayload.action || primaryStatusAction, "mark_read"),
  );
  const [reportScope, setReportScope] = useState(() =>
    toStringValue(
      partialIntentRecord.report_scope ||
        contactReportDetail.reason ||
        insightReportDetail.reason ||
        filters.date_range ||
        filters.sender ||
        filters.subject,
    ),
  );
  const [confirmText, setConfirmText] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const senderValue = senderEmail.trim();
  const toValue = toEmail.trim();
  const subjectValue = subject.trim();
  const emailBodyValue = emailBody.trim();
  const labelValue = labelName.trim();
  const statusActionValue = statusAction.trim();
  const reportScopeValue = reportScope.trim();
  const replyToneValue = replyTone.trim() || "professional";
  const isAutomated =
    execType.trim().toLowerCase() === "automated" ||
    resolvedOperationType === "automate";
  const executionMode: "one_time_action" | "automation_rule" = isAutomated
    ? "automation_rule"
    : "one_time_action";

  const isReadSideOperation = [
    "fetch",
    "search",
    "read",
    "read_attachment",
    "analyze",
    "classify",
    "contact_report",
    "insight_report",
  ].includes(resolvedOperationType);

  const showSenderInput =
    isReadSideOperation ||
    ["reply", "reply_to_thread", "automate", "label", "status_update", "delete"].includes(
      operationType,
    );

  const showRecipientFields =
    ["send", "reply", "reply_to_thread", "draft", "automate"].includes(resolvedOperationType) &&
    !isConfirmationFlow;

  const showLabelFields = resolvedOperationType === "label" && !isConfirmationFlow;
  const showStatusFields = resolvedOperationType === "status_update" && !isConfirmationFlow;
  const showReportFields =
    ["contact_report", "insight_report"].includes(resolvedOperationType) && !isConfirmationFlow;
  const showGenericField =
    !isConfirmationFlow &&
    !showLabelFields &&
    !showStatusFields &&
    !showReportFields &&
    !showRecipientFields &&
    Boolean(missingField || fieldQuestion);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);

    if (isConfirmationFlow && resolvedOperationType === "delete") {
      const normalizedConfirm = confirmText.trim().toLowerCase();
      if (!["confirm", "confirmed", "yes", "delete"].includes(normalizedConfirm)) {
        setFormError("Type confirm to continue with the delete action.");
        return;
      }
    }

    if (!isConfirmationFlow && resolvedOperationType === "label" && !labelValue) {
      setFormError("Please enter the label name.");
      return;
    }

    if (!isConfirmationFlow && resolvedOperationType === "status_update" && !statusActionValue) {
      setFormError("Please select or enter the status action.");
      return;
    }

    const prompt = buildRerunPrompt({
      operationType: resolvedOperationType,
      originalPrompt,
      fieldValue,
      partialIntent: partialIntentRecord,
      isConfirmation: isConfirmationFlow,
      labelName: labelValue,
      statusAction: statusActionValue,
      reportScope: reportScopeValue,
      senderEmail: senderValue,
      toEmail: toValue,
      subject: subjectValue,
      body: emailBodyValue,
      replyTone: replyToneValue,
      maxEmails,
    });

    const sendDirectly =
      isConfirmationFlow && ["send", "reply", "reply_to_thread"].includes(resolvedOperationType);

    const updatedNewIntent = buildUpdatedNewIntent({
      newIntent,
      primaryIntent,
      senderEmail: senderValue,
      toEmail: toValue,
      subject: subjectValue,
      body: emailBodyValue,
      labelName: labelValue,
      statusAction: statusActionValue,
      reportScope: reportScopeValue,
      maxEmails,
      replyTone: replyToneValue,
      isConfirmationFlow,
    });

    onRerun({
      prompt,
      executionMode,
      partialIntent: {
        ...partialIntentRecord,
        original_prompt: originalPrompt || response.plan?.goal || response.message || prompt,
        intent_understanding: updatedNewIntent,
        gmail_intent: updatedNewIntent,
        primary_intent: primaryIntent || undefined,
        operation: resolvedOperationType === "reply_to_thread" ? "reply" : resolvedOperationType,
        sender_email: senderValue || undefined,
        sender: senderValue || undefined,
        to: toValue || undefined,
        subject: subjectValue || undefined,
        body: emailBodyValue || undefined,
        label: labelValue || undefined,
        action: statusActionValue || undefined,
        report_scope: reportScopeValue || undefined,
        field_value: fieldValue.trim() || undefined,
        missing_field: missingField || undefined,
        max_results: Number.isFinite(Number(maxEmails)) ? Number(maxEmails) : undefined,
        execution_type: execType,
        confirmed: isConfirmationFlow ? true : undefined,
        user_confirmed: isConfirmationFlow ? true : undefined,
        approval_confirmed: isConfirmationFlow ? true : undefined,
        approved: isConfirmationFlow ? true : undefined,
        send_directly: sendDirectly,
        filters: {
          ...filters,
          sender: senderValue || filters.sender,
          sender_email: senderValue || filters.sender_email,
          label: labelValue || filters.label,
          action: statusActionValue || filters.action,
          max_results: Number.isFinite(Number(maxEmails)) ? Number(maxEmails) : filters.max_results,
        },
        email_payload: {
          ...emailPayload,
          to: toValue || emailPayload.to,
          subject: subjectValue || emailPayload.subject,
          body: emailBodyValue || emailPayload.body,
          body_instruction: emailBodyValue || emailPayload.body_instruction,
          tone: replyToneValue,
        },
        output_requirement: {
          ...existingOutputRequirement,
          send_directly: sendDirectly,
          draft_only: ["reply", "reply_to_thread", "draft"].includes(resolvedOperationType) && !sendDirectly,
          reply_required: ["reply", "reply_to_thread"].includes(resolvedOperationType),
          tone: replyToneValue,
        },
      },
    });
  };

  return (
    <form
      onSubmit={handleSubmit}
      className={`mb-8 rounded-2xl border bg-white p-5 shadow-sm ${
        resolvedOperationType === "delete"
          ? "border-rose-200"
          : isConfirmationFlow
            ? "border-amber-200"
            : "border-slate-200"
      }`}
    >
      <div className="flex flex-col gap-1">
        <h4 className="text-xs font-black uppercase tracking-[0.15em] text-slate-500">
          {copy.title}
        </h4>
        <p className="text-sm leading-relaxed text-slate-600">
          {isConfirmationFlow ? copy.description : fieldQuestion || copy.description}
        </p>
      </div>

      {isConfirmationFlow ? (
        <div
          className={`mt-5 rounded-2xl border p-4 ${
            resolvedOperationType === "delete"
              ? "border-rose-200 bg-rose-50"
              : "border-amber-200 bg-amber-50"
          }`}
        >
          <p
            className={`text-sm font-semibold ${
              resolvedOperationType === "delete" ? "text-rose-800" : "text-amber-800"
            }`}
          >
            {copy.description}
          </p>

          {resolvedOperationType === "delete" ? (
            <div className="mt-4">
              <label className="flex flex-col gap-2">
                <span className="text-[11px] font-black uppercase tracking-[0.15em] text-rose-700">
                  Type confirm to continue
                </span>
                <input
                  value={confirmText}
                  onChange={(event) => {
                    setConfirmText(event.target.value);
                    setFormError(null);
                  }}
                  type="text"
                  placeholder="confirm"
                  className="rounded-2xl border border-rose-200 bg-white px-4 py-3 text-sm font-medium text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-rose-400 focus:ring-2 focus:ring-rose-400/15"
                />
              </label>
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        {showSenderInput ? (
          <label className="flex flex-col gap-2 lg:col-span-2">
            <span className="text-[11px] font-black uppercase tracking-[0.15em] text-slate-500">
              Sender name or email
            </span>
            <input
              value={senderEmail}
              onChange={(event) => setSenderEmail(event.target.value)}
              type="text"
              placeholder="sender@example.com"
              className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#525ceb] focus:ring-2 focus:ring-[#525ceb]/15"
            />
          </label>
        ) : null}

        {showLabelFields ? (
          <label className="flex flex-col gap-2 lg:col-span-2">
            <span className="text-[11px] font-black uppercase tracking-[0.15em] text-slate-500">
              Label name
            </span>
            <input
              value={labelName}
              onChange={(event) => {
                setLabelName(event.target.value);
                setFormError(null);
              }}
              type="text"
              placeholder="Bank"
              className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#525ceb] focus:ring-2 focus:ring-[#525ceb]/15"
            />
          </label>
        ) : null}

        {showStatusFields ? (
          <label className="flex flex-col gap-2 lg:col-span-2">
            <span className="text-[11px] font-black uppercase tracking-[0.15em] text-slate-500">
              Status action
            </span>
            <select
              value={statusAction}
              onChange={(event) => {
                setStatusAction(event.target.value);
                setFormError(null);
              }}
              className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-900 outline-none transition focus:border-[#525ceb] focus:ring-2 focus:ring-[#525ceb]/15"
            >
              <option value="mark_read">Mark read</option>
              <option value="mark_unread">Mark unread</option>
              <option value="star">Star</option>
              <option value="unstar">Unstar</option>
              <option value="mark_important">Mark important</option>
              <option value="mark_not_important">Mark not important</option>
            </select>
          </label>
        ) : null}

        {showReportFields ? (
          <label className="flex flex-col gap-2 lg:col-span-2">
            <span className="text-[11px] font-black uppercase tracking-[0.15em] text-slate-500">
              Report scope / filter
            </span>
            <input
              value={reportScope}
              onChange={(event) => setReportScope(event.target.value)}
              type="text"
              placeholder={copy.fieldPlaceholder}
              className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#525ceb] focus:ring-2 focus:ring-[#525ceb]/15"
            />
          </label>
        ) : null}

        {showRecipientFields ? (
          <>
            <label className="flex flex-col gap-2">
              <span className="text-[11px] font-black uppercase tracking-[0.15em] text-slate-500">
                To / Recipient
              </span>
              <input
                type="email"
                value={toEmail}
                onChange={(event) => setToEmail(event.target.value)}
                className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-900 outline-none transition focus:border-[#525ceb] focus:ring-2 focus:ring-[#525ceb]/15"
              />
            </label>

            <label className="flex flex-col gap-2">
              <span className="text-[11px] font-black uppercase tracking-[0.15em] text-slate-500">
                Subject
              </span>
              <input
                value={subject}
                onChange={(event) => setSubject(event.target.value)}
                type="text"
                placeholder="Email subject"
                className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#525ceb] focus:ring-2 focus:ring-[#525ceb]/15"
              />
            </label>

            <label className="flex flex-col gap-2 lg:col-span-2">
              <span className="text-[11px] font-black uppercase tracking-[0.15em] text-slate-500">
                Message body
              </span>
              <textarea
                rows={4}
                value={emailBody}
                onChange={(event) => setEmailBody(event.target.value)}
                className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-900 outline-none transition focus:border-[#525ceb] focus:ring-2 focus:ring-[#525ceb]/15"
              />
            </label>

            <label className="flex flex-col gap-2 lg:col-span-2">
              <span className="text-[11px] font-black uppercase tracking-[0.15em] text-slate-500">
                Reply Tone
              </span>
              <input
                value={replyTone}
                onChange={(event) => setReplyTone(event.target.value)}
                type="text"
                placeholder="professional"
                className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#525ceb] focus:ring-2 focus:ring-[#525ceb]/15"
              />
            </label>
          </>
        ) : null}

        {!isConfirmationFlow ? (
          <label className="flex flex-col gap-2">
            <span className="text-[11px] font-black uppercase tracking-[0.15em] text-slate-500">
              Max Emails
            </span>
            <input
              value={maxEmails}
              onChange={(event) => setMaxEmails(event.target.value)}
              type="number"
              min={1}
              step={1}
              className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#525ceb] focus:ring-2 focus:ring-[#525ceb]/15"
            />
          </label>
        ) : null}

        {!isConfirmationFlow ? (
          <label className="flex flex-col gap-2">
            <span className="text-[11px] font-black uppercase tracking-[0.15em] text-slate-500">
              Execution Type
            </span>
            <select
              value={execType}
              onChange={(event) => setExecType(event.target.value)}
              className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-900 outline-none transition focus:border-[#525ceb] focus:ring-2 focus:ring-[#525ceb]/15"
            >
              <option value="one_time">One time</option>
              <option value="automated">Automated</option>
            </select>
          </label>
        ) : null}

        {showGenericField ? (
          <label className="flex flex-col gap-2 lg:col-span-2">
            <span className="text-[11px] font-black uppercase tracking-[0.15em] text-slate-500">
              {getFieldLabel(resolvedOperationType, missingField)}
            </span>
            <input
              value={fieldValue}
              onChange={(event) => setFieldValue(event.target.value)}
              type="text"
              placeholder={copy.fieldPlaceholder}
              className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#525ceb] focus:ring-2 focus:ring-[#525ceb]/15"
            />
          </label>
        ) : null}
      </div>

      {formError ? (
        <p className="mt-3 text-sm font-semibold text-rose-600">{formError}</p>
      ) : null}

      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-xs font-medium leading-relaxed text-slate-500">
          {isConfirmationFlow
            ? "This will rerun the workflow with explicit confirmation."
            : "The workflow is submitted with structured form values when you submit."}
        </div>

        <button
          type="submit"
          className={`inline-flex items-center justify-center rounded-2xl px-5 py-3 text-sm font-bold text-white shadow-sm transition focus:outline-none focus:ring-2 ${
            resolvedOperationType === "delete"
              ? "bg-rose-600 hover:bg-rose-700 focus:ring-rose-500/30"
              : "bg-[#525ceb] hover:bg-[#464fd7] focus:ring-[#525ceb]/30"
          }`}
        >
          {isConfirmationFlow ? copy.confirmText : "Rerun workflow"}
        </button>
      </div>
    </form>
  );
}
