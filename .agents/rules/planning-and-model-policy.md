# Rule: Implementation Planning & Model Execution Policy

## 1. Implementation Plan Requirement

- **Wajib buat `implementation_plan.md`**: Hanya ketika mengeksplorasi **fitur baru berukuran besar (heavy features)** yang membutuhkan keputusan arsitektur signifikan atau riset mendalam.
- **Langsung Eksekusi**: Untuk tugas di luar heavy feature (seperti bug fixes, perbaikan kecil, penambahan endpoint sederhana, refactoring minor, atau instruksi langsung dari user), agent **wajib langsung mengeksekusi** tanpa membuat implementation plan atau menunda pekerjaan.

---

## 2. Model Roles & Execution Boundaries (Gemini, Claude & OpenCode)

> [!CRITICAL]
> **STRICT MODEL DEMARCATION & VERIFICATION POLICY**:
> - **Gemini & Claude**: Dikhususkan **100% hanya untuk proses penulisan kode user (coding), arsitektur, debugging cepat, perbaikan UI, backend logic, implementasi fitur, dan pair programming**. Gemini & Claude **TIDAK PERLU** menjalankan verifikasi build yang memakan waktu (`pnpm build`, `go test ./...`), commit git, bumped version, pembuatan PR, atau tagging rilis.
> - **OpenCode**: Merupakan **satu-satunya engine yang berwenang** menjalankan seluruh **Verification Plan (Automated Tests)** dan pipeline Git/Rilis:
>   1. Menjalankan automated test suite:
>      ```bash
>      # Run backend tests including middleware and authorization tests
>      cd apps/api && go test ./...
>      # Run frontend typecheck and production build
>      pnpm --filter prism-dashboard typecheck
>      pnpm --filter prism-dashboard build
>      ```
>   2. Membuat atomic commits & push branch.
>   3. Membuka Pull Request & melampirkan label (`issue_write`).
>   4. Melakukan squash merge & menghapus branch (`git push origin --delete <branch>`).
>   5. Melakukan version bump (sinkronisasi 17 target SemVer) dan push annotated Git tag (`vX.Y.Z`).

### A. Gemini Model Role:
- Implementasi kode aplikasi (Next.js, Astro, Go proxy backend, database, schemas).
- Menulis logika, komponen UI, bugfix, dan menyelesaikan request user secara instan dan responsif.

### B. Claude Model Role:
- Review arsitektur, brainstorming teknis, perancangan sistem, dan penulisan `implementation_plan.md`.

### C. OpenCode Model Role (Exclusive Verification & Release Engine):
- **Satu-satunya engine** yang mengeksekusi:
  - **Verification Plan**: Menjalankan `cd apps/api && go test ./...`, `pnpm typecheck`, dan `pnpm build`.
  - **Git & Release Pipeline**: Commit, PR, PR labels, Merge, Branch cleanup, SemVer version synchronization, dan Release tagging.
- Lihat `.agents/rules/semantic-versioning-and-releases.md` dan `.agents/rules/pull-request-workflow.md` untuk alur delivery lengkap.


