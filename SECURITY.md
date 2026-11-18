# Security policy

Please do not publish secrets, tokens, personal data, or exploitable request samples in public issues.

For a suspected vulnerability, report it privately to the repository maintainer once the public GitHub repository has been created. Include the affected version, a minimal reproduction, and potential impact. Do not publicly disclose an unpatched vulnerability.

This package validates request shape and values. It is not a replacement for authentication, authorization, rate limiting, output encoding, database constraints, or application-specific security review. Keep the default `unknownKeys: 'strip'` or consider `unknownKeys: 'reject'` for security-sensitive request schemas. Never treat successful validation as proof that a user is authorized to perform an action.
