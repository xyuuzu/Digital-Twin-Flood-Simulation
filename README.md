# Citarum Basin Command View Simulation

Website simulasi FFews untuk monitoring kondisi sungai Citarum dan eksekusi integrasi simulasi HEC-HMS & HEC-RAS berbasis data telemetri bendungan (PDA).

## Cara Menjalankan Menggunakan Docker

Proyek ini telah dikonfigurasi menggunakan Docker agar mempermudah proses deployment pada perangkat lokal maupun server tanpa harus menginstal dependensi node manual.

### Prasyarat
- [Docker](https://docs.docker.com/get-docker/) terinstal di perangkat.
- [Docker Compose](https://docs.docker.com/compose/install/) terinstal (opsional, namun direkomendasikan).

### Menggunakan Docker Compose (Direkomendasikan)
Cara termudah untuk melakukan build dan menjalankan aplikasi adalah menggunakan Docker Compose:

1. Buka terminal/command prompt pada direktori utama proyek ini.
2. Jalankan perintah berikut:
   ```bash
   docker-compose up -d --build
   ```
3. Akses aplikasi melalui browser pada: `http://localhost:8080/`

Untuk mematikan container:
```bash
docker-compose down
```

### Menggunakan Docker Murni
Jika ingin membangun image Docker secara manual:

1. Build image Docker:
   ```bash
   docker build -t citarum-simulation-app .
   ```
2. Jalankan container Docker:
   ```bash
   docker run -p 8080:80 -d citarum-simulation-app
   ```
3. Akses melalui browser di `http://localhost:8080/`

## Teknologi
- **Engine**: Vite + React
- **Peta 3D**: CesiumJS (Bumi 3D dengan gedung OSM)
- **Styling**: Tailwind CSS
- **Visualisasi Chart**: Recharts
# Digital-Twin-Flood-Simulation
