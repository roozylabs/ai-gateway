# Rule: Dynamic Build & Test Verification Before Git Push

## Description
Sebelum mengeksekusi `git push`, agent wajib mengecek berkas/subfolder mana yang mengalami perubahan (`api/` atau `app/`), dan hanya menjalankan proses build/tes pada subfolder yang relevan:

- **Hanya `api/` yang berubah**: Cukup jalankan build & tes pada Go Backend (`api`).
- **Hanya `app/` yang berubah**: Cukup jalankan build & tes pada Next.js Frontend (`app`).
- **Kedua subfolder (`api/` & `app/`) berubah**: Wajib menjalankan build & tes pada **KEDUA** subfolder (`api` dan `app`).

---

## Pre-Push Verification Flow

Sebelum mengeksekusi `git push`:

1. **Periksa Berkas Berubah**:
   Cek lokasi file yang diubah (`git status` atau file change scope).

2. **Eksekusi Build Relevan**:
   - **Jika menyentuh `apps/api/`**:
     ```powershell
     cd apps/api; go mod tidy; go vet ./...; go build -v ./...
     ```
     Pastikan `go mod tidy` bersih (tanpa perubahan untracked di `go.mod`/`go.sum`), `go vet` 0 error, dan kompilasi Go sukses tanpa error/warning.

   - **Jika menyentuh `app/`**:
     ```powershell
     cd app; pnpm build
     ```
     Pastikan `pnpm build` selesai dengan **`✓ Compiled successfully`** (Exit Code 0).

3. **Strict Gate**:
   - Jika kompilasi pada subfolder yang diubah mengalami error, agent **TIDAK BOLEH** mengeksekusi `git push`.
   - Perbaiki terlebih dahulu semua error kompilasi hingga build terkonfirmasi lulus (Exit Code 0).
