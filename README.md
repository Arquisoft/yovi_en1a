<div align="center">

<img src="https://capsule-render.vercel.app/api?type=waving&color=0:1a1a2e,50:16213e,100:e94560&height=150&section=header&text=%F0%9F%94%BA%20YOVI%20%F0%9F%94%BA&fontSize=55&fontColor=ffffff&fontAlignY=45&desc=Game%20Y%20at%20UniOvi&descAlignY=68&descSize=18&descColor=aaaaaa" width="100%"/>

[![Release](https://github.com/arquisoft/yovi_en1a/actions/workflows/release-deploy.yml/badge.svg)](https://github.com/arquisoft/yovi_en1a/actions/workflows/release-deploy.yml)
[![Quality Gate](https://sonarcloud.io/api/project_badges/measure?project=Arquisoft_yovi_en1a&metric=alert_status)](https://sonarcloud.io/summary/new_code?id=Arquisoft_yovi_en1a)
[![Coverage](https://sonarcloud.io/api/project_badges/measure?project=Arquisoft_yovi_en1a&metric=coverage)](https://sonarcloud.io/summary/new_code?id=Arquisoft_yovi_en1a)

### 🌐 [▶ Play now! → http://20.251.170.191](http://20.251.170.191)

*Outsmart your rivals — or the bot — on a triangular board where every move counts.*<br/>
*Built for the ASW course at Universidad de Oviedo — requested by Micrati.*

</div>

---

## 👥 Team

| | Name | GitHub |
|---|---|---|
| 👩‍💻 | Olga Alonso Grela | [@uo288066](https://github.com/uo288066) |
| 👩‍💻 | Clara Fernández Pérez | [@megu-hub](https://github.com/megu-hub) |
| 👨‍💻 | Emre Sen | [@emresen12](https://github.com/emresen12) |
| 👨‍💻 | Donato Giuliano | [@donatogiuliano](https://github.com/donatogiuliano) |
| 👨‍💻 | Marvin Kickel | [@m8rvin](https://github.com/m8rvin) |

---

## 🏗️ Architecture

```
yovi_en1a/
├── webapp/       ⚛️  React + Vite + TypeScript frontend
├── users/        🟢  Node.js + Express user service
├── gamey/        🦀  Rust game engine & bot
└── docs/         📐  Arc42 architecture documentation
```

---

## ✨ Features

| Feature | Description |
|---|---|
| 🎮 **Game Y** | Triangular board game with bot support via Rust engine |
| 👤 **User Registration** | Register and track players |
| 🤖 **Bot Play** | Play against an AI opponent |
| 📊 **Monitoring** | Prometheus + Grafana dashboards |

---

## 🚀 Running the Project

### 🐳 With Docker (recommended)

```bash
docker-compose up --build
```

| Service | URL |
|---|---|
| 🌐 Web App | http://localhost |
| 👤 Users API | http://localhost:3000 |
| 🦀 Gamey Engine | http://localhost:4000 |
| 🎮 Game API | http://localhost:3001 |
| 📈 Prometheus | http://localhost:9090 |
| 📊 Grafana | http://localhost:9091 |

---

### 💻 Without Docker

You'll need **Node.js** and **Rust/Cargo** installed.

**1. Users Service**
```bash
cd users && npm install && npm start
# → http://localhost:3000
```

**2. Web App**
```bash
cd webapp && npm install && npm run dev
# → http://localhost:5173
```

**3. Gamey Engine**
```bash
cd gamey && cargo run
# → http://localhost:4000
```

---

## 🧪 Scripts

### Webapp
| Command | Description |
|---|---|
| `npm run dev` | Start dev server |
| `npm test` | Run unit tests |
| `npm run test:e2e` | Run end-to-end tests |
| `npm run start:all` | Start webapp + users together |

### Users
| Command | Description |
|---|---|
| `npm start` | Start the service |
| `npm test` | Run tests |

### Gamey (Cargo)
| Command | Description |
|---|---|
| `cargo build` | Build the engine |
| `cargo test` | Run tests |
| `cargo run` | Run the engine |
| `cargo doc` | Generate docs |

---

<div align="center">

*Made with ❤️ at Universidad de Oviedo*

</div>
