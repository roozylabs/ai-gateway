# Rule: Implementation Planning & Model Execution Policy

## 1. Implementation Plan Requirement

- **Wajib buat `implementation_plan.md`**: Hanya ketika mengeksplorasi **fitur baru berukuran besar (heavy features)** yang membutuhkan keputusan arsitektur signifikan atau riset mendalam.
- **Langsung Eksekusi**: Untuk tugas di luar heavy feature (seperti bug fixes, perbaikan kecil, penambahan endpoint sederhana, refactoring minor, atau instruksi langsung dari user), agent **wajib langsung mengeksekusi** tanpa membuat implementation plan atau menunda pekerjaan.

---

## 2. Model Roles & Execution Boundaries (Gemini, Claude & OpenCode)

> [!CRITICAL]
> **STRICT MODEL DEMARCATION**:
> - **Gemini & Claude**: Dikhususkan **hanya untuk proses penulisan kode user (coding), arsitektur, debugging, perbaikan UI, backend logic, implementasi fitur, dan pair programming**. Gemini & Claude **DILARANG** melakukan bumped version, membuat commit rilis, membuka PR rilis versi, atau melakukan release tagging.
> - **OpenCode**: Merupakan **satu-satunya engine yang diizinkan** mengeksekusi pipeline otomatisasi git: membuat commit rilis, version bump (sinkronisasi 17 target SemVer), pembuatan Pull Request rilis, merge PR, dan tagging rilis.

### A. Gemini Model Role:
- Digunakan untuk implementasi kode aplikasi (Next.js, Astro, Go proxy backend, database, schemas).
- Menulis test, debugging, refactoring komponen, dan menjalankan verifikasi build.

### B. Claude Model Role:
- Digunakan untuk review teknis, brainstorming arsitektur, desain sistem, penulisan spec, dan penyusunan `implementation_plan.md`.
- Jika sesi Claude digunakan untuk coding, batasi pada diskusi dan modifikasi kode yang diminta langsung oleh user.

### C. OpenCode Model Role (Exclusive Release Engine):
- **Satu-satunya model/agent** yang berwenang melakukan seluruh pipeline otomatisasi rilis: commit rilis, version bump (sinkronisasi 17 target SemVer), pembukaan PR rilis, pelabelan PR, merge PR, dan tagging rilis.
- Lihat `.agents/rules/semantic-versioning-and-releases.md` (proses rilis) dan `.agents/rules/pull-request-workflow.md` (flow delivery) untuk detail lengkap.

