# Rule: Implementation Planning & Model Execution Policy

## 1. Implementation Plan Requirement

- **Wajib buat `implementation_plan.md`**: Hanya ketika mengeksplorasi **fitur baru berukuran besar (heavy features)** yang membutuhkan keputusan arsitektur signifikan atau riset mendalam.
- **Langsung Eksekusi**: Untuk tugas di luar heavy feature (seperti bug fixes, perbaikan kecil, penambahan endpoint sederhana, refactoring minor, atau instruksi langsung dari user), agent **wajib langsung mengeksekusi** tanpa membuat implementation plan atau menunda pekerjaan.

---

## 2. Claude Model Execution Restriction

- **Aturan Khusus Model Claude**: Apabila sesi berjalan menggunakan **model Claude** (misalnya *Claude 3.5 Sonnet*, *Claude 3 Opus*, atau *Claude Code*):
  - Agent **DILARANG KERAS mengeksekusi kode** atau mengubah file repositori.
  - Sesi dengan model Claude hanya digunakan khusus untuk **diskusi, brainstorming, review arsitektur, dan tanya jawab**.
