# Emergency Recovery & Succession Procedure
**Organization:** BlackMess Research
**Version:** 1.0
**Date:** April 2026

## 1. Purpose
This document provides recovery procedures in case the primary system owner (Akbar Ramadhan) is temporarily or permanently unavailable.

## 2. Key Person Risk
| Risk | Likelihood | Impact | Score |
|------|-----------|--------|-------|
| Key Person Dependency | 2 | 5 | 10 |

## 3. Recovery Assets
| Asset | Location | Access Method |
|-------|----------|---------------|
| Source code | GitHub (public) | git clone |
| Documentation | GitHub /docs/ | git clone |
| DB credentials | PQC Vault (ML-KEM-1024) | Emergency key |
| Infrastructure | Railway/Vercel | GitHub OAuth |
| PQC keys | Memory only (by design) | Re-generate |

## 4. Recovery Procedure
1. Clone repository from GitHub
2. Follow /docs/iso27001/ for system overview
3. Use requirements.txt to restore dependencies
4. Re-provision database from latest backup
5. Generate new PQC keypairs (keys never stored to disk by design)
6. Re-deploy via Railway/Vercel CI/CD pipeline

## 5. Documentation-as-Code
All operational knowledge is captured in:
- /docs/iso27001/ — 20 ISMS documents
- README.md — system overview
- .env.example — environment variables template
- requirements.txt — all dependencies
- Dockerfile — containerized deployment

## 6. Succession Screening
Any successor or collaborator must:
- Provide CV and government-issued ID (KTP/Passport)
- Sign NDA before accessing any credentials
- Complete security awareness training
