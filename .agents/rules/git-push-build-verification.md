# Rule: Mandatory Build & Test Verification Before Git Push

## Description
Setiap kali agent melakukan perubahan kode pada backend Go (`api`) atau frontend Next.js (`app`), agent **DILARANG KERAS** menjalankan `git push` sebelum kompilasi build dan pengujian pada kedua subfolder tersebut dinyatakan **100% SUKSES (Exit Code 0)**.

---

## Mandatory Pre-Push Verification Checklist

Sebelum mengeksekusi `git push`:

1. **Go Backend (`api`) Verification**:
   - Wajib menjalankan kompilasi Go:
     ```powershell
     cd api; & "C:\Program Files\Go\bin\go.exe" build -v ./...
     ```
   - Pastikan output kompilasi sukses tanpa error dan tanpa warning `sqlrowserr`.

2. **Next.js Frontend (`app`) Verification**:
   - Wajib menjalankan Next.js production build:
     ```powershell
     cd app; pnpm build
     ```
   - Pastikan proses `pnpm build` selesai dengan status **`✓ Compiled successfully`** dan **Exit Code 0**.

3. **Strict Gate**:
   - Jika salah satu kompilasi gagal, mengalami type error, atau dibatalkan, agent **TIDAK BOLEH** mengeksekusi `git push`.
   - Perbaiki terlebih dahulu semua error kompilasi hingga kedua build terkonfirmasi lulus sepenuhnya.
