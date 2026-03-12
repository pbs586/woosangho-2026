# 🎯 2026 강원특별자치도지사 후보 우상호 캠페인 프로젝트

## 📌 프로젝트 개요
이 프로젝트는 **2026 강원특별자치도지사 선거**를 위한 우상호 후보의 공식 캠페인 웹사이트입니다. 시민들에게 후보의 비전을 전달하고, 지역별 맞춤 공약을 인터랙티브 지도를 통해 제공하며, 최신 소식과 현장 사진을 공유하는 것을 목표로 합니다.

## 🚀 개발 미션
1.  **시각적 탁월함 (Visual Excellence)**: 강원의 역동성과 신뢰감을 줄 수 있는 프리미엄 디자인 유지.
2.  **안정적인 콘텐츠 관리 (CMS Integration)**: 관리자 페이지를 통한 투명하고 신속한 뉴스/갤러리 업데이트.
3.  **사용자 경험 (UX/Interactive)**: 지역 주민들이 자신의 시군 공약을 쉽게 확인할 수 있는 인터랙티브 지도 기능 고도화.
4.  **보안 및 성능**: 관리자 기능의 보안 강화 및 이미지 최적화를 통한 빠른 로딩 속도 유지.

## 🛠 기술 스택
-   **Frontend**: Vanilla HTML5, CSS3 (Modern UI/UX), JavaScript (ES6+), SVG Interaction.
-   **Backend**: Node.js, Express.js.
-   **Storage**: JSON based Data Store (for news, gallery), Filesystem for uploads.
-   **Libraries**: Sharp (Image Optimization), Multer (File Upload), CORS, Body-parser.

## 📂 주요 구조
-   `index.html`: 메인 랜딩 페이지 (후보 소개, 공약 지도, 지지 폼).
-   `server.js`: API 및 정적 파일 서버.
-   `admin.html`: 관리자 대시보드 (뉴스 및 사진 등록).
-   `data/`: `news.json`, `gallery.json` 데이터 저장소.
-   `uploads/`: WebP로 최적화된 업로드 이미지 저장소.

## ⚖️ 핵심 원칙 (Project Rules)
-   가독성과 정돈됨을 최우선으로 함 (ANTIGRAVITY 프로젝트 규칙 준수).
-   SOLID 원칙 및 DRY 준수.
-   한국어 주석 및 '왜(Why)'에 집중한 설명.
-   상세한 로깅 및 에러 핸들링.
