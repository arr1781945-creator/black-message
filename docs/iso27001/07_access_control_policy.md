# Access Control Policy
**Organization:** BlackMess Research
**Version:** 1.0
**Date:** April 2026

## 1. Principles
- Least privilege access
- Need-to-know basis
- Separation of duties where applicable

## 2. Access Levels
| Role | Permissions |
|------|-------------|
| Super Admin | Full system access |
| Admin | Workspace management |
| Compliance Officer | Audit + compliance data |
| Member | Own workspace only |
| Guest | Limited read access |

## 3. Authentication Requirements
- MFA mandatory for all users
- FIDO2/WebAuthn supported
- PQ MFA (ML-DSA-65) available
- JWT access token: 15 minutes
- JWT refresh token: 1 day
- Session invalidation on suspicious activity

## 4. Privileged Access
- Admin actions logged in audit trail
- Remote wipe capability for compromised devices
- JWT blacklist for immediate revocation

## 5. Emergency Access Procedure (Key Person Dependency Mitigation)
In the event the primary owner (Akbar Ramadhan) is unavailable:
1. All system documentation is version-controlled in GitHub (documentation-as-code)
2. Encrypted emergency access credentials stored in PQC vault (ML-KEM-1024)
3. Recovery procedure documented in /docs/emergency_recovery.md
4. Automated backup: PostgreSQL daily, IPFS distributed redundancy
5. Any designated successor must complete background screening per Control 6.1
