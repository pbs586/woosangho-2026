require('dotenv').config();
const express = require('express');
const multer = require('multer');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());
app.use(express.static(__dirname));
// 외부 마운트 디스크를 위한 정적 파일 서빙 추가
const UPLOADS_DIR = process.env.UPLOADS_DIR || path.join(__dirname, 'uploads');
app.use('/uploads', express.static(UPLOADS_DIR));

// 관리자 비밀번호 (보안을 위해 환경변수 사용)
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ? process.env.ADMIN_PASSWORD.trim() : null;

// 비밀번호 검증 미들웨어
const verifyPassword = (req, res, next) => {
    const password = req.headers['x-admin-password'] || req.body.password;
    if (password === ADMIN_PASSWORD) {
        next();
    } else {
        res.status(401).json({ error: '인증 실패: 올바른 비밀번호가 아닙니다.' });
    }
};

// 데이터 파일 경로
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
const NEWS_FILE = path.join(DATA_DIR, 'news.json');
const GALLERY_FILE = path.join(DATA_DIR, 'gallery.json');
const PLEDGES_FILE = path.join(DATA_DIR, 'pledges.json');
const TODAY_FILE = path.join(DATA_DIR, 'today.json');
// UPLOADS_DIR는 상단에서 이미 정의됨

// 기본 데이터 파일이 없으면 생성
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR);
if (!fs.existsSync(NEWS_FILE)) fs.writeFileSync(NEWS_FILE, JSON.stringify([]));
if (!fs.existsSync(GALLERY_FILE)) fs.writeFileSync(GALLERY_FILE, JSON.stringify([]));
if (!fs.existsSync(PLEDGES_FILE)) fs.writeFileSync(PLEDGES_FILE, JSON.stringify({}));
if (!fs.existsSync(TODAY_FILE)) fs.writeFileSync(TODAY_FILE, JSON.stringify([]));
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR);

// 간단한 로거 미들웨어
app.use((req, res, next) => {
    const now = new Date().toISOString();
    console.log(`[${now}] ${req.method} ${req.url}`);
    next();
});

// Multer 설정 (메모리 저장소 사용)
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// 이미지 최적화 유틸리티
async function optimizeImage(buffer, filename) {
    const webpName = `${Date.now()}-${filename.split('.')[0]}.webp`;
    const outputPath = path.join(UPLOADS_DIR, webpName);

    await sharp(buffer)
        .resize(1200, null, { withoutEnlargement: true })
        .webp({ quality: 80 })
        .toFile(outputPath);

    return `/uploads/${webpName}`;
}

// === API 엔드포인트 ===

// 뉴스 목록 조회
app.get('/api/news', (req, res) => {
    const data = JSON.parse(fs.readFileSync(NEWS_FILE));
    // 날짜 연월일 스트링 기준 내림차순 정렬 (최신순)
    data.sort((a, b) => {
        const dateCompare = (b.date || '').localeCompare(a.date || '');
        if (dateCompare !== 0) return dateCompare;
        return b.id - a.id;
    });
    res.json(data);
});

// 공약 목록 조회
app.get('/api/pledges', (req, res) => {
    try {
        const data = JSON.parse(fs.readFileSync(PLEDGES_FILE));
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: '공약 데이터를 불러오는데 실패했습니다.' });
    }
});

// 뉴스 등록 (비밀번호 검증 추가)
app.post('/api/news', verifyPassword, upload.single('thumbnail'), async (req, res) => {
    try {
        const { title, date, content, detailContent, link } = req.body;
        let thumbnailUrl = '';

        if (req.file) {
            thumbnailUrl = await optimizeImage(req.file.buffer, req.file.originalname);
        }

        const news = JSON.parse(fs.readFileSync(NEWS_FILE));
        const newPost = {
            id: Date.now(),
            title,
            date,
            content,
            detailContent: detailContent || '',
            thumbnailUrl,
            link: link || ''
        };
        news.unshift(newPost);
        fs.writeFileSync(NEWS_FILE, JSON.stringify(news, null, 2));

        res.status(201).json(newPost);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 뉴스 수정 (비밀번호 검증 추가)
app.put('/api/news/:id', verifyPassword, upload.single('thumbnail'), async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const { title, date, content, detailContent, link } = req.body;
        let news = JSON.parse(fs.readFileSync(NEWS_FILE));
        const itemIndex = news.findIndex(item => item.id === id);

        if (itemIndex === -1) {
            return res.status(404).json({ error: '해당 뉴스를 찾을 수 없습니다.' });
        }

        const item = news[itemIndex];
        if (title) item.title = title;
        if (date) item.date = date;
        if (content) item.content = content;
        if (detailContent !== undefined) item.detailContent = detailContent;
        if (link !== undefined) item.link = link;

        if (req.file) {
            item.thumbnailUrl = await optimizeImage(req.file.buffer, req.file.originalname);
        }

        fs.writeFileSync(NEWS_FILE, JSON.stringify(news, null, 2));
        res.json(item);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 뉴스 삭제 (비밀번호 검증 추가)
app.delete('/api/news/:id', verifyPassword, (req, res) => {
    console.log(`Delete news request received for ID: ${req.params.id}`);
    try {
        const id = parseInt(req.params.id);
        let news = JSON.parse(fs.readFileSync(NEWS_FILE));
        const itemIndex = news.findIndex(item => item.id === id);

        if (itemIndex === -1) {
            return res.status(404).json({ error: '해당 뉴스를 찾을 수 없습니다.' });
        }

        const item = news[itemIndex];
        if (item.thumbnailUrl) {
            const filePath = path.join(__dirname, item.thumbnailUrl);
            if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        }

        news.splice(itemIndex, 1);
        fs.writeFileSync(NEWS_FILE, JSON.stringify(news, null, 2));
        res.json({ message: '뉴스가 삭제되었습니다.' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 갤러리 목록 조회
app.get('/api/gallery', (req, res) => {
    const data = JSON.parse(fs.readFileSync(GALLERY_FILE));
    data.sort((a, b) => {
        const dateCompare = (b.date || '').localeCompare(a.date || '');
        if (dateCompare !== 0) return dateCompare;
        return b.id - a.id;
    });
    res.json(data);
});

// 갤러리 사진 업로드 (다중 업로드, 비밀번호 검증 추가)
app.post('/api/gallery', verifyPassword, upload.array('photos', 10), async (req, res) => {
    try {
        const { description } = req.body;
        const gallery = JSON.parse(fs.readFileSync(GALLERY_FILE));
        const newItems = [];

        for (const file of req.files) {
            const url = await optimizeImage(file.buffer, file.originalname);
            const item = {
                id: Date.now() + Math.random(),
                url,
                description,
                date: new Date().toISOString().split('T')[0]
            };
            newItems.push(item);
            gallery.unshift(item);
        }

        fs.writeFileSync(GALLERY_FILE, JSON.stringify(gallery, null, 2));
        res.status(201).json(newItems);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 갤러리 수정 (설명 변경, 비밀번호 검증 추가)
app.put('/api/gallery/:id', verifyPassword, (req, res) => {
    try {
        const id = parseFloat(req.params.id);
        const { description } = req.body;
        let gallery = JSON.parse(fs.readFileSync(GALLERY_FILE));
        const itemIndex = gallery.findIndex(item => item.id === id);

        if (itemIndex === -1) {
            return res.status(404).json({ error: '해당 사진을 찾을 수 없습니다.' });
        }

        gallery[itemIndex].description = description;
        fs.writeFileSync(GALLERY_FILE, JSON.stringify(gallery, null, 2));
        res.json(gallery[itemIndex]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 갤러리 사진 삭제 (비밀번호 검증 추가)
app.delete('/api/gallery/:id', verifyPassword, (req, res) => {
    console.log(`Delete gallery request received for ID: ${req.params.id}`);
    try {
        const id = parseFloat(req.params.id);
        let gallery = JSON.parse(fs.readFileSync(GALLERY_FILE));
        const itemIndex = gallery.findIndex(item => item.id === id);

        if (itemIndex === -1) {
            return res.status(404).json({ error: '해당 사진을 찾을 수 없습니다.' });
        }

        const item = gallery[itemIndex];
        const filePath = path.join(__dirname, item.url);

        // 실제 파일 삭제
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }

        // 목록에서 제거
        gallery.splice(itemIndex, 1);
        fs.writeFileSync(GALLERY_FILE, JSON.stringify(gallery, null, 2));

        res.json({ message: '사진이 성공적으로 삭제되었습니다.' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// === 우상호의 오늘 API ===

app.get('/api/today', (req, res) => {
    const data = JSON.parse(fs.readFileSync(TODAY_FILE));
    data.sort((a, b) => {
        const dateCompare = (b.date || '').localeCompare(a.date || '');
        if (dateCompare !== 0) return dateCompare;
        return b.id - a.id;
    });
    res.json(data);
});

app.post('/api/today', verifyPassword, upload.single('photo'), async (req, res) => {
    try {
        const { description } = req.body;
        let imageUrl = '';

        if (req.file) {
            imageUrl = await optimizeImage(req.file.buffer, req.file.originalname);
        }

        const today = JSON.parse(fs.readFileSync(TODAY_FILE));
        const newItem = {
            id: Date.now(),
            imageUrl,
            description: description || '',
            date: new Date().toISOString().split('T')[0]
        };
        today.unshift(newItem);
        fs.writeFileSync(TODAY_FILE, JSON.stringify(today, null, 2));

        res.status(201).json(newItem);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/today/:id', verifyPassword, (req, res) => {
    try {
        const id = parseInt(req.params.id);
        let today = JSON.parse(fs.readFileSync(TODAY_FILE));
        const itemIndex = today.findIndex(item => item.id === id);

        if (itemIndex === -1) {
            return res.status(404).json({ error: '해당 항목을 찾을 수 없습니다.' });
        }

        const item = today[itemIndex];
        if (item.imageUrl) {
            const filePath = path.join(__dirname, item.imageUrl);
            if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        }

        today.splice(itemIndex, 1);
        fs.writeFileSync(TODAY_FILE, JSON.stringify(today, null, 2));
        res.json({ message: '삭제되었습니다.' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

const { exec } = require('child_process');

// === 깃허브 자동 백업 API ===
app.post('/api/backup', verifyPassword, (req, res) => {
    const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
    if (!GITHUB_TOKEN) {
        return res.status(400).json({ error: '서버에 GITHUB_TOKEN이 설정되어 있지 않습니다. 클라우드타입 설정 분과에 추가해 주세요.' });
    }

    const repoUrl = `https://${GITHUB_TOKEN}@github.com/pbs586/woosangho-2026.git`;
    
    // 리눅스 명령어 (CloudType 탑재 환경)
    const cmd = `git config user.name "BackupBot" && git config user.email "backup@bot.com" && git add . && git commit -m "data: manual backup" && git push ${repoUrl} main`;

    exec(cmd, (error, stdout, stderr) => {
        if (error) {
            console.error(`Git push error: ${error.message}`);
            // 이미 최신 상태(nothing to commit)인 경우 성공으로 간주할 수도 있음
            if (stderr.includes('nothing to commit')) {
                return res.json({ message: '이미 최신 데이터가 반영되어 있습니다.' });
            }
            return res.status(500).json({ error: '백업 실패: ' + error.message, details: stderr });
        }
        res.json({ message: '백업 완료! 데이터가 깃허브에 저장되었습니다.' });
    });
});

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
