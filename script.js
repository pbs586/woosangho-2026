document.addEventListener('DOMContentLoaded', () => {
    // 1. Region Pledge Data (Fetched from API)
    let regionPledges = {};

    async function fetchPledges() {
        try {
            const res = await fetch('/api/pledges');
            regionPledges = await res.json();
        } catch (err) {
            console.error('공약 데이터 로드 실패:', err);
        }
    }

    const pledgeDisplay = document.getElementById('pledge-display');

    function updatePledges(region) {
        const pledges = regionPledges[region] || regionPledges['default'] || [];
        pledgeDisplay.style.opacity = '0';

        setTimeout(() => {
            pledgeDisplay.innerHTML = pledges.map(p => `
                <div class="pledge-card">
                    <div class="pledge-icon">${p.icon}</div>
                    <h3>${p.title}</h3>
                    <p>${p.text}</p>
                    <button class="btn-detail" onclick="openPledgeDetailModal('${p.title}', '${p.text}', '${p.icon}')" style="margin-top: 15px; width: 100%; padding: 8px; border: 1px solid var(--primary-color); color: var(--primary-color); background: none; border-radius: 8px; cursor: pointer; font-weight: 600;">상세보기</button>
                </div>
            `).join('');
            pledgeDisplay.style.opacity = '1';
        }, 300);
    }

    // ===== 동적 마커 생성 시스템 =====
    // 지도 SVG 내부 좌표 (3027pt × 2531pt)에서의 비율 좌표
    // x: 0~1 (좌→우), y: 0~1 (상→하)
    // 지도.svg의 각 지역명 텍스트 중앙 아래에 해당하는 비율 값
    // 지도 마커.svg (1125x942)에서 사용자가 직접 찍은 점의 좌표 기반 정밀 비율
    const regionPositions = [
        { region: 'cheorwon', name: '철원군', rx: 142.45 / 1125, ry: 217.52 / 942 },
        { region: 'hwacheon', name: '화천군', rx: 300.96 / 1125, ry: 274.09 / 942 },
        { region: 'yanggu', name: '양구군', rx: 455.11 / 1125, ry: 267.72 / 942 },
        { region: 'inje', name: '인제군', rx: 588.25 / 1125, ry: 334.55 / 942 },
        { region: 'goseong', name: '고성군', rx: 667.24 / 1125, ry: 177.44 / 942 },
        { region: 'sokcho', name: '속초시', rx: 819.35 / 1125, ry: 283.10 / 942 },
        { region: 'yangyang', name: '양양군', rx: 761.06 / 1125, ry: 387.20 / 942 },
        { region: 'chuncheon', name: '춘천시', rx: 322.12 / 1125, ry: 417.14 / 942 },
        { region: 'hongcheon', name: '홍천군', rx: 467.96 / 1125, ry: 523.72 / 942 },
        { region: 'hoengseong', name: '횡성군', rx: 478.16 / 1125, ry: 649.82 / 942 },
        { region: 'pyeongchang', name: '평창군', rx: 655.23 / 1125, ry: 654.15 / 942 },
        { region: 'gangneung', name: '강릉시', rx: 871.76 / 1125, ry: 546.37 / 942 },
        { region: 'wonju', name: '원주시', rx: 372.53 / 1125, ry: 779.07 / 942 },
        { region: 'jeongseon', name: '정선군', rx: 778.27 / 1125, ry: 761.94 / 942 },
        { region: 'yeongwol', name: '영월군', rx: 644.21 / 1125, ry: 837.18 / 942 },
        { region: 'donghae', name: '동해시', rx: 979.55 / 1125, ry: 700.76 / 942 },
        { region: 'samcheok', name: '삼척시', rx: 1009.42 / 1125, ry: 826.60 / 942 },
        { region: 'taebaek', name: '태백시', rx: 924.94 / 1125, ry: 917.17 / 942 },
    ];

    // SVG viewBox 크기
    const VB_W = 877, VB_H = 778;
    // 지도 이미지 원본 비율 (3027 × 2531)
    const IMG_RATIO = 3027 / 2531; // ≈ 1.196
    const VB_RATIO = VB_W / VB_H;  // ≈ 1.127

    // preserveAspectRatio="xMidYMid meet" 계산
    // 이미지가 더 넓으므로(1.196 > 1.127) → 너비에 맞춤, 상하 여백 발생
    const imgRenderedW = VB_W; // 877
    const imgRenderedH = VB_W / IMG_RATIO; // 877 / 1.196 ≈ 733.2
    const yOffset = (VB_H - imgRenderedH) / 2; // ≈ 22.4

    // 마커 컨테이너
    const container = document.getElementById('map-markers-container');
    const svgNS = 'http://www.w3.org/2000/svg';
    const tooltip = document.getElementById('map-region-tooltip');
    const regionTitle = document.getElementById('region-title');

    // 마커 동적 생성
    regionPositions.forEach(pos => {
        // 비율 좌표를 viewBox 좌표로 변환
        const cx = pos.rx * imgRenderedW;
        const cy = yOffset + pos.ry * imgRenderedH;

        const g = document.createElementNS(svgNS, 'g');
        g.classList.add('marker-group');
        g.dataset.region = pos.region;
        g.dataset.name = pos.name;

        const pulse = document.createElementNS(svgNS, 'circle');
        pulse.classList.add('marker-pulse');
        pulse.setAttribute('cx', cx);
        pulse.setAttribute('cy', cy);
        pulse.setAttribute('r', '24');

        const dot = document.createElementNS(svgNS, 'circle');
        dot.classList.add('marker-dot');
        dot.setAttribute('cx', cx);
        dot.setAttribute('cy', cy);
        dot.setAttribute('r', '12');

        g.appendChild(pulse);
        g.appendChild(dot);
        container.appendChild(g);

        // 클릭 이벤트 핸들러
        g.addEventListener('click', (e) => {
            e.preventDefault();
            // 모든 마커에서 active 제거, 현재 마커에 추가
            container.querySelectorAll('.marker-group').forEach(m => m.classList.remove('active'));
            g.classList.add('active');
            updatePledges(pos.region);

            // 지역명 타이틀 업데이트
            if (regionTitle) {
                regionTitle.textContent = pos.name;
            }

                // No longer opening modal automatically

            // 공약 영역으로 부드럽게 스크롤 (기존 로직 유지)          const pledgeArea = document.querySelector('.pledge-content-area');
            if (pledgeArea) {
                pledgeArea.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
        });

        // 호버 툴팁 표시
        g.addEventListener('mouseenter', () => {
            tooltip.textContent = pos.name;
            tooltip.style.display = 'block';
        });

        g.addEventListener('mousemove', (e) => {
            const containerRect = document.querySelector('.map-container').getBoundingClientRect();
            const x = e.clientX - containerRect.left + 15;
            const y = e.clientY - containerRect.top - 30;
            tooltip.style.left = `${x}px`;
            tooltip.style.top = `${y}px`;
        });

        g.addEventListener('mouseleave', () => {
            tooltip.style.display = 'none';
        });
    });

    // 초기 로드: 안내 메시지 표시 (선택된 지역 없음)
    pledgeDisplay.innerHTML = `
        <div class="pledge-placeholder">
            <div class="placeholder-icon">📍</div>
            <h3>지도에서 지역을 선택해주세요</h3>
            <p>각 시·군의 맞춤 공약을 확인할 수 있습니다.</p>
        </div>
    `;

    // 2. Scroll Animations (Intersection Observer)
    const observerOptions = {
        threshold: 0.1
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
            }
        });
    }, observerOptions);

    document.querySelectorAll('.animate-up').forEach(el => observer.observe(el));

    // 3. Navbar Scroll Effect
    const navbar = document.querySelector('.navbar');
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            navbar.style.padding = '12px 0';
            navbar.style.background = 'rgba(255, 255, 255, 0.95)';
        } else {
            navbar.style.padding = '20px 0';
            navbar.style.background = 'rgba(255, 255, 255, 0.8)';
        }
    });

    // 4. Form Submission Mock
    const campaignForm = document.getElementById('campaign-form');
    campaignForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const name = document.getElementById('name').value;
        alert(`${name}님, 소중한 지지 감사합니다! 우상호와 함께 강원의 미래를 열어가겠습니다.`);
        campaignForm.reset();
    });

    // 6. API 데이터 연동 (뉴스 & 갤러리)
    async function fetchMainData() {
        try {
            // 뉴스 데이터 (최근 3개)
            const newsRes = await fetch('/api/news');
            const newsData = await newsRes.json();
            const newsGrid = document.querySelector('.news-grid');
            if (newsGrid && newsData.length > 0) {
                newsGrid.innerHTML = newsData.slice(0, 3).map(item => `
                    <div class="news-card animate-up" onclick="openNewsModal(${JSON.stringify(item).replace(/"/g, '&quot;')})" style="cursor: pointer;">
                        <div class="news-img" style="background-image: url('${item.thumbnailUrl || '/placeholder.jpg'}'); background-size: cover; background-position: center; height: 220px;"></div>
                        <div class="news-info">
                            <span class="date">${item.date}</span>
                            <h3>${item.title}</h3>
                            <p>${item.content}</p>
                        </div>
                    </div>
                `).join('');
            }

            // 갤러리 데이터 (최근 6개)
            const galleryRes = await fetch('/api/gallery');
            const galleryData = await galleryRes.json();
            const galleryGrid = document.querySelector('.gallery-grid');
            if (galleryGrid && galleryData.length > 0) {
                galleryGrid.innerHTML = galleryData.slice(0, 6).map(item => `
                    <div class="gallery-item animate-up" onclick="openGalleryModal('${item.url}', '${item.description}', '${item.date || ''}')" style="cursor: pointer;">
                        <img src="${item.url}" alt="${item.description}">
                    </div>
                `).join('');
            }

            // 애니메이션 다시 적용
            document.querySelectorAll('.animate-up').forEach(el => observer.observe(el));
        } catch (err) {
            console.error('데이터 로드 실패:', err);
        }
    }

    fetchMainData();
    fetchPledges();

    // 7. 모달 닫기 로직
    const pledgeModal = document.getElementById('pledge-modal');
    const galleryModal = document.getElementById('gallery-modal');
    const newsModal = document.getElementById('news-modal'); // 추가

    document.querySelectorAll('.close-modal').forEach(btn => {
        btn.onclick = () => {
            pledgeModal.style.display = 'none';
            galleryModal.style.display = 'none';
            newsModal.style.display = 'none'; // 추가
            document.body.style.overflow = 'auto';
        }
    });

    window.onclick = (event) => {
        if (event.target == pledgeModal || event.target == galleryModal || event.target == newsModal) {
            pledgeModal.style.display = 'none';
            galleryModal.style.display = 'none';
            newsModal.style.display = 'none'; // 추가
            document.body.style.overflow = 'auto';
        }
    }

    // ESC 키로 닫기
    window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            pledgeModal.style.display = 'none';
            galleryModal.style.display = 'none';
            newsModal.style.display = 'none'; // 추가
            document.body.style.overflow = 'auto';
        }
    });
});

// 뉴스 모달 열기
function openNewsModal(item) {
    const modal = document.getElementById('news-modal');
    const modalImg = document.getElementById('news-modal-img');
    const modalDate = document.getElementById('news-modal-date');
    const modalTitle = document.getElementById('news-modal-title');
    const modalSummary = document.getElementById('news-modal-summary');
    const modalText = document.getElementById('news-modal-text');
    const modalLink = document.getElementById('news-modal-link');

    if (modalImg) {
        modalImg.src = item.thumbnailUrl || '/placeholder.jpg';
        modalImg.alt = item.title;
    }
    modalDate.textContent = item.date;
    modalTitle.textContent = item.title;
    if (modalSummary) modalSummary.textContent = item.content;
    modalText.textContent = item.detailContent || item.content;

    if (item.link) {
        modalLink.href = item.link;
        modalLink.style.display = 'inline-block';
    } else {
        modalLink.style.display = 'none';
    }

    modal.style.display = 'block';
    document.body.style.overflow = 'hidden';
}

// 공약 상세 모달 열기
function openPledgeDetailModal(title, text, icon) {
    const modal = document.getElementById('pledge-modal');
    const modalTitle = document.getElementById('modal-region-title');
    const modalContent = document.getElementById('modal-pledge-list');

    if (modal && modalTitle && modalContent) {
        modalTitle.textContent = title;
        modalContent.innerHTML = `
            <div class="pledge-detail-body" style="text-align: center; padding: 20px;">
                <div class="pledge-icon" style="font-size: 3rem; margin-bottom: 20px;">${icon}</div>
                <p style="font-size: 1.1rem; line-height: 1.8; color: #444; white-space: pre-wrap;">${text}</p>
                <div style="margin-top: 30px;">
                    <button class="btn btn-primary close-modal" onclick="document.getElementById('pledge-modal').style.display='none'; document.body.style.overflow='auto';">확인</button>
                </div>
            </div>
        `;
        modal.style.display = 'block';
        document.body.style.overflow = 'hidden';
    }
}
// 갤러리 모달 열기
function openGalleryModal(url, description, date) {
    const modal = document.getElementById('gallery-modal');
    const modalImg = document.getElementById('gallery-modal-img');
    const modalDesc = document.getElementById('gallery-modal-desc');
    const modalDate = document.getElementById('gallery-modal-date');

    modalImg.src = url;
    modalDesc.textContent = description || '우상호 후보의 생생한 현장 모습입니다.';
    modalDate.textContent = date || '';
    modal.style.display = 'block';
    document.body.style.overflow = 'hidden';
}
