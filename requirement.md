Ringkasan Pengembangan Sistem Digital Product Passport (DPP) & Traceability

1. Konteks Bisnis & Ruang Lingkup

Sistem ini melacak rantai pasok tekstil melalui 6 tahapan utama:

Farm

Ginner

Cotton Trader

Spinner

Knitter / Weaver / Fabric

Garment Manufacturing / Finished Goods

Catatan Penting (Dynamic Mapping): Peran perusahaan di dalam 6 tahapan ini bersifat dinamis dan bisa berubah tergantung case, order, atau tipe produk. Oleh karena itu, sistem tidak memaku (hardcode) tahapan tertentu sebagai internal. Sistem memungkinkan setiap tahapan di-set sebagai "Internal" (dikerjakan sendiri) atau "Eksternal" (melibatkan vendor/supplier) pada setiap alur produksi.

2. Pengguna Utama (End-Users) & Tujuannya

Sistem ini akan dioperasikan oleh dua departemen utama dengan antarmuka dan kebutuhan output yang berbeda:

A. Departemen SCM (Supply Chain Management)

Peran: Mengelola data entry, validasi dokumen vendor, audit, dan melacak relasi material dari tahapan yang berstatus "Eksternal".

Karakteristik Data: Unstandardized (beragam format dari eksternal).

Kebutuhan UI: Dashboard pelacakan, manajemen batch, unggah dokumen, dan form input ekstraksi data (untuk vendor).

B. Departemen Marketing

Peran: Memanfaatkan data yang sudah tervalidasi untuk sustainability branding dan storytelling B2B/B2C.

Karakteristik Data: Standardized (agregasi dari data internal dan eksternal).

Kebutuhan UI: Generator dokumen internal (Template DPP, Packing List), visualisasi data (traceability tree), dan generator QR Code (untuk landing page scan produk akhir).

3. Strategi UI/UX Frontend: Pendekatan "Split-Screen Data Entry"

Untuk menangani tahapan yang berstatus Eksternal, sistem menggunakan pendekatan Split-Screen pada modul SCM untuk mempercepat data entry dari berbagai format dokumen acak:

Sisi Kiri (Document Viewer): Menampilkan file (PDF/Image) yang diunggah menggunakan library (misal: pdf.js). User dapat melakukan blok teks (CTRL+C).

Sisi Kanan (Input Form): Menampilkan form isian ringkas tempat user menempelkan (CTRL+V) teks kunci dari dokumen di sisi kiri.

4. Struktur Form Input SCM (UI Components untuk Tahapan Eksternal)

Pada sisi kanan antarmuka split-screen, frontend harus memuat kelompok data berikut untuk merangkai relasi Parent-Child di database:

A. Data Header (Metadata Transaksi)

Nama Vendor: Dropdown/Select (berelasi dengan master data ERP).

Tahapan Supply Chain: Dropdown (Farm, Ginner, Trader, Spinner, dll - sesuai alur yang sedang aktif).

Tanggal Transaksi: Date Picker.

B. Core Traceability (Kunci Relasi Database)

Ini adalah field terpenting untuk membentuk pohon pelacakan.

Batch / Lot Number Input (Asal): Text Input (Bahan baku yang dipakai vendor).

Batch / Lot Number Output (Hasil): Text Input (Barang yang dikirim vendor ke perusahaan atau tahap selanjutnya).

Kuantitas & Satuan: Number Input & Dropdown.

Komposisi/Spesifikasi: Text Input.

C. Checklist Dokumen Wajib Pendukung

Sediakan Checkbox atau File Uploader multi-slot beserta satu kolom text input pendamping untuk Nomor Dokumen/Sertifikat:

Operasional & Logistik:

[ ] PO (Purchase Order) + No. PO

[ ] INV (Invoice) + No. Invoice

[ ] WO (Work Order)

[ ] BL (Bill of Lading)

[ ] CD (Customs Declaration)

[ ] CO (Certificate of Origin)

Audit & Kepatuhan (Compliance):

[ ] TR (Transaction Certificate) + No. Sertifikat

[ ] FP (Facility Profile)

[ ] AVD (Audit Vendor Document)

[ ] AFL (Approved Facility List)

[ ] BIR (Buyer/Business Inspection Report)

[ ] VFR (Vendor Facility/Verification Report)

5. Flow Pembentukan Traceability Dinamis (Bagan Logika Frontend)

Inisialisasi Project/Order: Admin/SCM menentukan ruang lingkup tahapan untuk suatu produk (misal: Tahap 1-3 Eksternal, Tahap 4-6 Internal).

Data Ingestion (Eksternal): Untuk tahap berstatus Eksternal, SCM mengunggah dokumen vendor -> mengekstrak Batch ID menggunakan split-screen -> Sistem menyimpan relasi parent-child.

Data Ingestion (Internal): Untuk tahap berstatus Internal, sistem frontend tidak meminta upload dokumen vendor, melainkan menarik Batch ID secara otomatis dari modul produksi (ERP) internal perusahaan.

Handover Seamless: Output Batch ID dari tahapan Eksternal terakhir otomatis masuk sebagai material Input di tahapan Internal pertama.

Marketing Output: Marketing memilih Batch ID produk akhir -> Sistem merunut rantai (baik internal maupun eksternal) hingga ke hulu -> Frontend me-render QR Code dan halaman Storytelling (DPP).