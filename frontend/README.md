https://arnav-alt-ai.github.io/javalifelineai-01/ this is our website

## SOS SMS setup

The SOS API sends SMS through Twilio when these server environment variables are configured:

```text
TWILIO_ACCOUNT_SID=...
TWILIO_AUTH_TOKEN=...
TWILIO_FROM_NUMBER=...
```

The API retries failed messages up to three times. Without provider credentials, the UI keeps the alert active and shows `Call Now` actions for saved contacts.
