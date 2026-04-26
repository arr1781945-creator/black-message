# OJK/BI Compliance Checklist
**Organization:** BlackMess Research
**Reference:** POJK 11/2022, PBI 23/2021
**Version:** 1.0
**Date:** April 2026

## POJK No. 11/POJK.03/2022 — Penerapan Manajemen Risiko TI

| No | Requirement | Status | Evidence |
|----|-------------|--------|----------|
| 1 | Kebijakan keamanan informasi | Done | 01_isms_policy.md |
| 2 | Manajemen risiko TI | Done | 02_risk_assessment.md |
| 3 | Enkripsi data sensitif | Done | AES-256-GCM field-level |
| 4 | Autentikasi kuat | Done | MFA + FIDO2 + PQ MFA |
| 5 | Log dan audit trail | Done | 520 audit tables |
| 6 | Pemisahan lingkungan | Done | Railway (prod) + local (dev) |
| 7 | Backup dan recovery | Done | 10_business_continuity_plan.md |
| 8 | Manajemen insiden | Done | 09_incident_response_plan.md |
| 9 | Retensi data minimal 5 tahun | Done | 12_data_retention_policy.md |
| 10 | Pelaporan insiden ke OJK | Done | compliance_incident_report table |

## PBI No. 23/6/PBI/2021 — Perlindungan Konsumen

| No | Requirement | Status | Evidence |
|----|-------------|--------|----------|
| 1 | Enkripsi komunikasi | Done | E2EE + Hybrid KEM |
| 2 | Kerahasiaan data nasabah | Done | Zero-knowledge architecture |
| 3 | Hak akses data | Done | GDPR endpoints + /compliance/gdpr/ |
| 4 | Notifikasi insiden ke nasabah | Done | 09_incident_response_plan.md |
| 5 | Retensi data komunikasi finansial | Done | 5 tahun per policy |

## Status: COMPLIANT ✅
