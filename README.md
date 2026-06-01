# 🚗 NYC Collision Severity Predictor

![React](https://img.shields.io/badge/react-%2320232a.svg?style=for-the-badge&logo=react&logoColor=%2361DAFB)
![FastAPI](https://img.shields.io/badge/FastAPI-005571?style=for-the-badge&logo=fastapi)
![TensorFlow](https://img.shields.io/badge/TensorFlow-%23FF6F00.svg?style=for-the-badge&logo=TensorFlow&logoColor=white)
![Electron.js](https://img.shields.io/badge/Electron-191970?style=for-the-badge&logo=Electron&logoColor=white)

**Sistem Cerdas Final Project** — A Decision Support System (Desktop Application) designed to predict the severity of motor vehicle collisions in New York City using an Artificial Neural Network (Multilayer Perceptron).

## 📌 Project Overview
This application leverages the **NYC Open Data API** to predict whether a given collision scenario will result in an **Injury/Fatality (Class 1)** or remain **Safe / Property Damage Only (Class 0)**. 

The system achieves **>70% Accuracy** by evaluating:
- Crash Hour
- Day of the Week
- Month
- NYC Borough
- Vehicle Type
- Contributing Factor (e.g., Driver Inattention, Alcohol)

## 📁 Project Structure

This repository is divided into two main parts:
1. **`frontend/`** — The React.js User Interface wrapped in Electron for desktop deployment.
2. **`backend/`** — The Python backend containing the Data Science Pipeline and FastAPI server.

### Detail Penjelasan Folder & File
* **`frontend/src/App.jsx`**: File utama antarmuka pengguna (UI). Bertugas menampilkan form input, mengirim request prediksi ke API, dan me-render hasil (grafik probabilitas & insight kendaraan).
* **`frontend/electron/main.js`**: Konfigurasi Electron. Membungkus aplikasi web React menjadi aplikasi Desktop bawaan sistem operasi.
* **`backend/app.py`**: Server API yang dibangun dengan **FastAPI**. File ini menjadi jembatan antara Frontend dan Model AI. Bertugas menerima input user, melakukan *preprocessing* (mengubah teks menjadi angka menggunakan `preprocessor.pkl`), dan memanggil model ANN (`severity_model.keras`) untuk mendapatkan hasil prediksi.
* **`backend/notebooks/training.ipynb`**: Pusat dari Data Science pipeline. Tempat di mana data diunduh, dibersihkan, diubah, lalu digunakan untuk melatih (train) Artificial Neural Network.

---

## 🧠 Jupyter Notebook Breakdown (`training.ipynb`)

Berikut adalah penjelasan fungsi dari setiap bagian (Step) kode di dalam file *Jupyter Notebook*:

### **STEP 0 — Imports & Configuration**
* **Fungsi:** Mengimpor semua "alat bantu" (library) yang dibutuhkan seperti Pandas (manipulasi data), Scikit-Learn (preprocessing), TensorFlow/Keras (membuat model Neural Network), dan Matplotlib/Seaborn (membuat grafik). Juga mengatur struktur folder untuk menyimpan model.

### **STEP 1 — Data Acquisition**
* **Fungsi:** Menghubungkan program ke API *NYC Open Data* menggunakan pustaka `requests`. Program ini menarik 50.000 data historis kecelakaan nyata dari server pemerintah New York dan menyimpannya sebagai `NYC_Collisions.csv`.

### **STEP 2 — Feature Engineering & Target Creation**
* **Fungsi:** Tahap meramu data mentah. 
    - *Target Creation*: Mengubah kolom jumlah korban menjadi label Biner. Jika korban > 0, maka Kelas = 1 (Injury/Fatal). Jika tidak ada korban, Kelas = 0 (Safe).
    - *Feature Engineering*: Mengekstrak nilai "Jam", "Hari", dan "Bulan" dari teks tanggal kecelakaan agar Neural Network dapat membaca pola waktu kecelakaan.

### **STEP 3 — Data Preprocessing**
* **Fungsi:** Menerjemahkan bahasa manusia ke bahasa mesin. Neural Network tidak mengerti kata "MANHATTAN" atau "SEDAN". Di sinilah `ColumnTransformer` dan `OneHotEncoder` bekerja untuk memecah teks tersebut menjadi representasi biner (angka 0 dan 1). Komponen penterjemah ini disimpan sebagai `preprocessor.pkl`.

### **STEP 4 — Build & Train the ANN (MLP)**
* **Fungsi:** Tahap membangun otak AI. Menggunakan arsitektur `Sequential` dengan tiga lapisan padat (*Dense Layers*) yang mengecil (256 node -> 128 node -> 64 node) dan ditutup dengan lapisan *Softmax* untuk mengeluarkan persentase probabilitas. *Dropout* ditambahkan agar model tidak sekadar "menghafal" (overfitting). Model dilatih selama 100 *epochs*.

### **STEP 5 — Evaluation & Visualization**
* **Fungsi:** Menilai seberapa pintar model setelah belajar. Menghasilkan:
    - **Accuracy/Loss Curve:** Grafik garis untuk melihat apakah AI semakin membaik atau justru stagnan.
    - **Classification Report & Confusion Matrix:** Matriks untuk melihat tebakan AI secara mendetail (Berapa kecelakaan fatal yang berhasil ditebak dengan benar? Berapa kecelakaan aman yang salah diprediksi sebagai fatal?).

### **STEP 6 & 7 — Export Model & Demo**
* **Fungsi:** Tahap final. Otak AI yang sudah pintar ini disimpan dalam file `severity_model.keras` agar bisa dipanggil (load) oleh file `backend/app.py`. Step 7 adalah sel pengujian untuk memasukkan simulasi data satu kasus secara langsung.

---

## 🚀 How to Run Locally

### 1. Prerequisites
- Node.js (v18+)
- Python (v3.11+)

### 2. Running the Backend API
```bash
cd backend
python -m venv .venv
source .venv/Scripts/activate  # (On Windows)
pip install -r requirements.txt
uvicorn app:app --reload --host 0.0.0.0 --port 8000
```
*(Note: If it's your first time, you must run the Jupyter Notebook completely once to generate the `.keras` model files inside `backend/models/` before starting the FastAPI server).*

### 3. Running the Frontend Desktop App
Open a new terminal:
```bash
cd frontend
npm install
npm run electron:dev
```
