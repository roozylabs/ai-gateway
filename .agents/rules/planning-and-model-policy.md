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
- **Satu-satunya model/agent** yang berwenang melakukan:
  1. Commit rilis & sinkronisasi versi (`package.json`, `apps/app/package.json`, `main.go`, `docs.go`, `CHANGELOG.md`, `PRD.md`, dll.).
  2. Pembukaan PR rilis (`chore(release): bump monorepo version...`).
  3. Pelabelan PR rilis (`release`, `chore`) via `issue_write`.
  4. Penggabungan PR (*squash merge*) dan penghapusan branch.
  5. Pembuatan dan push annotated Git tag (`git tag -a vX.Y.Z`).

---

## 3. Mandatory Post-Merge Branch Deletion Rule

> [!CRITICAL]
> **AUTOMATIC BRANCH DELETION AFTER PR MERGE**:
> Setiap kali Pull Request (`feat/*`, `fix/*`, `refactor/*`, `chore/*`, `docs/*`) telah di-merge ke `main`:
> 1. **Hapus Remote Branch**: `git push origin --delete <branch-name>`
> 2. **Hapus Local Branch**: `git checkout main && git pull origin main && git branch -D <branch-name>`
> Tidak boleh ada branch usang (*stale/dangling branch*) yang tertinggal di repositori.

